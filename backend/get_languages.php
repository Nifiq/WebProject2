<?php
declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

try {
    $stmt = db()->query('SELECT id, name FROM programming_languages ORDER BY id ASC');
    $langs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(200, [
        'ok'        => true,
        'languages' => $langs,
    ]);
} catch (Throwable $e) {
    json_response(500, [
        'ok'      => false,
        'message' => 'Ошибка загрузки языков: ' . $e->getMessage(),
    ]);
}
