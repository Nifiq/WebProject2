<?php

declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

try {
    $pdo = db();
    $columns = support_table_columns($pdo);
    $credentialColumns = support_credential_columns($pdo);

    json_response(200, [
        'ok' => true,
        'message' => $credentialColumns
            ? 'Проверка пройдена. Таблица support_requests содержит колонки для пользовательского логина и пароля.'
            : 'Таблица есть, но не найдены колонки user_login/user_password_hash.',
        'columns' => array_keys($columns),
        'credential_columns' => $credentialColumns,
    ]);
} catch (Throwable $e) {
    json_response(500, [
        'ok' => false,
        'message' => 'Ошибка проверки backend/check_submit.php.',
        'debug' => ['error' => $e->getMessage()],
    ]);
}
