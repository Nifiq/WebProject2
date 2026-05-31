<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!function_exists('json_response')) {
    function json_response(int $statusCode, array $payload): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

if (!function_exists('e')) {
    function e(?string $value): string
    {
        return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['csrf_token'];
}

function refresh_csrf_token(): string
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['csrf_token'];
}

function require_valid_csrf(): void
{
    $postedToken  = (string)($_POST['csrf_token'] ?? '');
    $sessionToken = (string)($_SESSION['csrf_token'] ?? '');
    if ($postedToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $postedToken)) {
        json_response(403, [
            'ok'         => false,
            'message'    => 'Ошибка безопасности. Обновите страницу и попробуйте ещё раз.',
            'csrf_token' => csrf_token(),
        ]);
    }
}

function generate_user_password(int $bytes = 6): string
{
    return substr(bin2hex(random_bytes($bytes)), 0, 12);
}

function support_credential_columns(PDO $pdo): ?array
{
    $stmt = $pdo->query('SHOW COLUMNS FROM support_requests');
    $columns = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (isset($row['Field'])) $columns[$row['Field']] = true;
    }
    if (isset($columns['user_login'], $columns['user_password_hash'])) {
        return ['login' => 'user_login', 'hash' => 'user_password_hash'];
    }
    return null;
}

function safe_user_request_row(array $row): array
{
    return [
        'id'                => (int)$row['id'],
        'login'             => (string)($row['user_login'] ?? $row['login'] ?? ''),
        'name'              => (string)($row['name'] ?? ''),
        'phone'             => (string)($row['phone'] ?? ''),
        'email'             => (string)($row['email'] ?? ''),
        'gender'            => (string)($row['gender'] ?? ''),
        'preferred_lang_id' => isset($row['preferred_lang_id']) ? (int)$row['preferred_lang_id'] : null,
        'lang_name'         => (string)($row['lang_name'] ?? ''),
        'message'           => (string)($row['message'] ?? ''),
        'created_at'        => (string)($row['created_at'] ?? ''),
        'updated_at'        => (string)($row['updated_at'] ?? ''),
    ];
}
