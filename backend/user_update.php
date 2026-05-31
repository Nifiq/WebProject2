<?php
declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['ok' => false, 'message' => 'Метод не поддерживается.']);
}

$requestId = (int)($_SESSION['user_request_id'] ?? 0);
if ($requestId <= 0) {
    json_response(401, ['ok' => false, 'message' => 'Сначала войдите по логину и паролю.', 'csrf_token' => csrf_token()]);
}

require_valid_csrf();

// ── Чтение полей ─────────────────────────────────────────────────────────────
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
    json_response(422, ['ok' => false, 'message' => 'Заполните обязательные поля.', 'errors' => $errors, 'csrf_token' => csrf_token()]);
}

try {
    $pdo = db();

    // Проверяем язык
    $stmtLang = $pdo->prepare('SELECT id FROM programming_languages WHERE id = :id LIMIT 1');
    $stmtLang->execute([':id' => $langId]);
    if (!$stmtLang->fetch()) {
        json_response(422, ['ok' => false, 'message' => 'Недопустимый язык программирования.', 'csrf_token' => csrf_token()]);
    }

    $pdo->prepare(
        'UPDATE support_requests
         SET name = :name, phone = :phone, email = :email,
             gender = :gender, preferred_lang_id = :lang,
             message = :message, updated_at = NOW()
         WHERE id = :id'
    )->execute([
        ':name'    => $name,
        ':phone'   => $phone,
        ':email'   => $email,
        ':gender'  => $gender,
        ':lang'    => $langId,
        ':message' => $message,
        ':id'      => $requestId,
    ]);

    // Возвращаем обновлённую запись с именем языка
    $stmt = $pdo->prepare(
        'SELECT sr.*, pl.name AS lang_name
         FROM support_requests sr
         LEFT JOIN programming_languages pl ON pl.id = sr.preferred_lang_id
         WHERE sr.id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $requestId]);
    $request = $stmt->fetch();

    json_response(200, [
        'ok'         => true,
        'message'    => 'Заявка успешно обновлена.',
        'request'    => $request ? safe_user_request_row($request) : null,
        'csrf_token' => refresh_csrf_token(),
    ]);
} catch (Throwable $e) {
    error_log('user_update error: ' . $e->getMessage());
    json_response(500, ['ok' => false, 'message' => 'Ошибка сервера при обновлении заявки.', 'debug' => ['error' => $e->getMessage()], 'csrf_token' => csrf_token()]);
}
