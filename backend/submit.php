<?php
/**
 * submit.php — обработка формы заявки
 * Поля: name, phone, email, gender, preferred_lang_id, message
 * Создаёт пользователя (user_login / user_password_hash) в той же строке
 */

ob_start();
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

function send_json($status, array $payload): void
{
    while (ob_get_level() > 0) ob_end_clean();
    http_response_code((int)$status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) {
        send_json(500, ['ok' => false, 'message' => 'Фатальная ошибка PHP.', 'debug' => $e]);
    }
});

// ── config ──────────────────────────────────────────────────────────────────
$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    send_json(500, ['ok' => false, 'message' => 'Не найден config.php.']);
}
require_once $configPath;

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

// ── GET: диагностика ─────────────────────────────────────────────────────────
if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(200, [
        'ok'      => true,
        'message' => 'submit.php работает. Отправка идёт методом POST.',
        'session' => session_id(),
    ]);
}

// ── CSRF ─────────────────────────────────────────────────────────────────────
$postedToken  = (string)($_POST['csrf_token'] ?? '');
$sessionToken = (string)($_SESSION['csrf_token'] ?? '');
if (!$postedToken || !$sessionToken || !hash_equals($sessionToken, $postedToken)) {
    send_json(403, [
        'ok'      => false,
        'message' => 'Ошибка безопасности. Обновите страницу и попробуйте ещё раз.',
    ]);
}

// ── Чтение и валидация полей ─────────────────────────────────────────────────
$name    = trim((string)($_POST['name']    ?? ''));
$phone   = trim((string)($_POST['phone']   ?? ''));
$email   = trim((string)($_POST['email']   ?? ''));
$gender  = trim((string)($_POST['gender']  ?? ''));
$langId  = (int)($_POST['preferred_lang_id'] ?? 0);
$message = trim((string)($_POST['message'] ?? ''));

$errors = [];

if ($name === '') {
    $errors['name'] = 'Не заполнено поле «Ваше имя».';
} elseif (!preg_match('/^[\p{L}\s\-]{2,150}$/u', $name)) {
    $errors['name'] = 'Введите корректное имя: только буквы, пробелы и дефис.';
}

if ($phone === '') {
    $errors['phone'] = 'Не заполнено поле «Телефон».';
} elseif (!preg_match('/^\+?[0-9\s\-()]{7,25}$/', $phone)) {
    $errors['phone'] = 'Введите корректный телефон.';
}

if ($email === '') {
    $errors['email'] = 'Не заполнено поле «E-mail».';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Введите корректный E-mail.';
}

if (!in_array($gender, ['male', 'female'], true)) {
    $errors['gender'] = 'Выберите пол.';
}

if ($langId <= 0) {
    $errors['preferred_lang_id'] = 'Выберите любимый язык программирования.';
}

$msgLen = function_exists('mb_strlen') ? mb_strlen($message, 'UTF-8') : strlen($message);
if ($msgLen > 2000) {
    $errors['message'] = 'Комментарий слишком длинный. Максимум 2000 символов.';
}

if ($errors) {
    send_json(422, [
        'ok'      => false,
        'message' => 'Заполните обязательные поля формы.',
        'errors'  => $errors,
    ]);
}

// ── Запись в БД ───────────────────────────────────────────────────────────────
try {
    $pdo = db();

    // Проверяем, что язык существует
    $stmtLang = $pdo->prepare('SELECT id, name FROM programming_languages WHERE id = :id LIMIT 1');
    $stmtLang->execute([':id' => $langId]);
    $langRow = $stmtLang->fetch();
    if (!$langRow) {
        send_json(422, ['ok' => false, 'message' => 'Выбранный язык не найден.', 'errors' => ['preferred_lang_id' => 'Недопустимое значение.']]);
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'INSERT INTO support_requests
            (name, phone, email, gender, preferred_lang_id, message, created_at)
         VALUES
            (:name, :phone, :email, :gender, :lang, :message, NOW())'
    );
    $stmt->execute([
        ':name'   => $name,
        ':phone'  => $phone,
        ':email'  => $email,
        ':gender' => $gender,
        ':lang'   => $langId,
        ':message' => $message,
    ]);

    $requestId     = (int)$pdo->lastInsertId();
    $login         = 'user' . $requestId;
    $plainPassword = generatePassword(12);
    $passwordHash  = password_hash($plainPassword, PASSWORD_DEFAULT);

    $pdo->prepare(
        'UPDATE support_requests
         SET user_login = :login, user_password_hash = :hash
         WHERE id = :id'
    )->execute([
        ':login' => $login,
        ':hash'  => $passwordHash,
        ':id'    => $requestId,
    ]);

    $pdo->commit();

    // Обновляем CSRF
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    send_json(200, [
        'ok'         => true,
        'message'    => 'Спасибо! Заявка отправлена. Сохраните логин и пароль.',
        'request_id' => $requestId,
        'login'      => $login,
        'password'   => $plainPassword,
        'csrf_token' => $_SESSION['csrf_token'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    error_log('submit.php error: ' . $e->getMessage());
    send_json(500, [
        'ok'      => false,
        'message' => 'Ошибка сервера при сохранении заявки.',
        'debug'   => ['error' => $e->getMessage()],
    ]);
}

function generatePassword(int $len = 12): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    $max   = strlen($chars) - 1;
    $out   = '';
    for ($i = 0; $i < $len; $i++) $out .= $chars[random_int(0, $max)];
    return $out;
}
