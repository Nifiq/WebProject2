<?php

declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, [
        'ok' => false,
        'message' => 'Метод не поддерживается.',
    ]);
}

require_valid_csrf();

$login = trim((string)($_POST['login'] ?? ''));
$password = (string)($_POST['password'] ?? '');

if ($login === '' || $password === '') {
    json_response(422, [
        'ok' => false,
        'message' => 'Введите логин и пароль.',
        'csrf_token' => csrf_token(),
    ]);
}

try {
    $pdo = db();
    $credentialColumns = support_credential_columns($pdo);

    if ($credentialColumns === null) {
        json_response(500, [
            'ok' => false,
            'message' => 'В таблице support_requests нет колонок user_login/user_password_hash.',
            'csrf_token' => csrf_token(),
        ]);
    }

    $loginColumn = $credentialColumns['login'];
    $hashColumn = $credentialColumns['hash'];

    $stmt = $pdo->prepare('SELECT * FROM support_requests WHERE `' . $loginColumn . '` = :login LIMIT 1');
    $stmt->execute([':login' => $login]);
    $request = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$request || empty($request[$hashColumn]) || !password_verify($password, (string)$request[$hashColumn])) {
        json_response(401, [
            'ok' => false,
            'message' => 'Неверный логин или пароль.',
            'csrf_token' => csrf_token(),
        ]);
    }

    $_SESSION['user_request_id'] = (int)$request['id'];

    json_response(200, [
        'ok' => true,
        'message' => 'Вы вошли. Теперь можно редактировать заявку.',
        'request' => safe_user_request_row($request),
        'csrf_token' => refresh_csrf_token(),
    ]);
} catch (Throwable $e) {
    error_log('User login error: ' . $e->getMessage());
    json_response(500, [
        'ok' => false,
        'message' => 'Ошибка сервера при входе.',
        'debug' => ['error' => $e->getMessage()],
        'csrf_token' => csrf_token(),
    ]);
}
