<?php

declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

json_response(200, [
    'ok' => true,
    'csrf_token' => csrf_token(),
]);
