<?php

declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

unset($_SESSION['user_request_id']);

json_response(200, [
    'ok' => true,
    'message' => 'Вы вышли из режима редактирования.',
    'csrf_token' => refresh_csrf_token(),
]);
