<?php
/**
 * Настройки подключения к базе данных и безопасности.
 *
 * ВАЖНО:
 * 1. Перед запуском создай базу и таблицы из database.sql.
 * 2. Поменяй DB_USER и DB_PASS на свои данные MySQL.
 * 3. Если хочешь проверять Google reCAPTCHA на сервере, впиши секретный ключ в RECAPTCHA_SECRET.
 */

const DB_HOST = 'localhost';
const DB_NAME = 'webproj8';
const DB_USER = 'root';
const DB_PASS = 'Nifi753159Q*';

// Публичный ключ reCAPTCHA стоит в index.html. Секретный ключ хранится только здесь, на сервере.
// Если оставить пустым, сервер не будет проверять reCAPTCHA, но форма всё равно будет работать.
const RECAPTCHA_SECRET = '';

// Данные для входа в backend/admin.php.
// Пароль по умолчанию: admin123
// После первого запуска обязательно поменяй пароль в database.sql или через MySQL.
const ADMIN_REALM = 'WebProject admin panel';

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4',
    ]);

    return $pdo;
}

function h(?string $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
