<?php
declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

$requestId = (int)($_SESSION['user_request_id'] ?? 0);

if ($requestId <= 0) {
    json_response(401, ['ok' => false, 'message' => 'Пользователь не авторизован.', 'csrf_token' => csrf_token()]);
}

try {
    $stmt = db()->prepare(
        'SELECT sr.*, pl.name AS lang_name
         FROM support_requests sr
         LEFT JOIN programming_languages pl ON pl.id = sr.preferred_lang_id
         WHERE sr.id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $requestId]);
    $request = $stmt->fetch();

    if (!$request) {
        unset($_SESSION['user_request_id']);
        json_response(404, ['ok' => false, 'message' => 'Заявка не найдена.', 'csrf_token' => csrf_token()]);
    }

    json_response(200, [
        'ok'      => true,
        'request' => safe_user_request_row($request),
        'csrf_token' => csrf_token(),
    ]);
} catch (Throwable $e) {
    json_response(500, ['ok' => false, 'message' => 'Ошибка сервера.', 'debug' => ['error' => $e->getMessage()], 'csrf_token' => csrf_token()]);
}
