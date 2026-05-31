<?php

declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

header('Content-Type: text/html; charset=utf-8');

function column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name'
    );
    $stmt->execute([
        ':table_name' => $table,
        ':column_name' => $column,
    ]);

    return (int)$stmt->fetchColumn() > 0;
}

function table_exists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name'
    );
    $stmt->execute([':table_name' => $table]);

    return (int)$stmt->fetchColumn() > 0;
}

$pdo = db();
$messages = [];
$adminCredentials = null;

try {
    if (!table_exists($pdo, 'support_requests')) {
        $pdo->exec(
            'CREATE TABLE support_requests (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                login VARCHAR(64) NULL UNIQUE,
                password_hash VARCHAR(255) NULL,
                name VARCHAR(150) NOT NULL,
                phone VARCHAR(25) NOT NULL,
                email VARCHAR(255) NOT NULL,
                message TEXT NULL,
                consent TINYINT(1) NOT NULL DEFAULT 1,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        $messages[] = 'Создана таблица support_requests.';
    } else {
        $messages[] = 'Таблица support_requests уже есть.';
    }

    $columns = [
        'login' => "ALTER TABLE support_requests ADD COLUMN login VARCHAR(64) NULL UNIQUE AFTER id",
        'password_hash' => "ALTER TABLE support_requests ADD COLUMN password_hash VARCHAR(255) NULL AFTER login",
        'updated_at' => "ALTER TABLE support_requests ADD COLUMN updated_at DATETIME NULL DEFAULT NULL AFTER created_at",
    ];

    foreach ($columns as $column => $sql) {
        if (!column_exists($pdo, 'support_requests', $column)) {
            $pdo->exec($sql);
            $messages[] = "Добавлена колонка support_requests.$column.";
        } else {
            $messages[] = "Колонка support_requests.$column уже есть.";
        }
    }

    if (!table_exists($pdo, 'admins')) {
        $pdo->exec(
            'CREATE TABLE admins (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                login VARCHAR(64) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        $messages[] = 'Создана таблица admins.';
    } else {
        $messages[] = 'Таблица admins уже есть.';
    }

    $adminCount = (int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
    if ($adminCount === 0) {
        $adminLogin = 'admin';
        $adminPassword = generate_user_password(8);
        $stmt = $pdo->prepare('INSERT INTO admins (login, password_hash, created_at) VALUES (:login, :password_hash, NOW())');
        $stmt->execute([
            ':login' => $adminLogin,
            ':password_hash' => password_hash($adminPassword, PASSWORD_DEFAULT),
        ]);
        $adminCredentials = ['login' => $adminLogin, 'password' => $adminPassword];
        $messages[] = 'Создан новый администратор.';
    } else {
        $messages[] = 'Администратор уже существует. Новый пароль не создавался.';
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo '<h1>Ошибка установки</h1>';
    echo '<pre>' . e($e->getMessage()) . '</pre>';
    exit;
}
?>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>Установка админки</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 880px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
        .ok { background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; }
        .warn { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 16px; margin-top: 16px; }
        code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Установка завершена</h1>
    <div class="ok">
        <?php foreach ($messages as $message): ?>
            <div>✓ <?= e($message) ?></div>
        <?php endforeach; ?>
    </div>

    <?php if ($adminCredentials): ?>
        <div class="warn">
            <h2>Данные администратора</h2>
            <p><strong>Логин:</strong> <code><?= e($adminCredentials['login']) ?></code></p>
            <p><strong>Пароль:</strong> <code><?= e($adminCredentials['password']) ?></code></p>
            <p>Сохраните пароль сейчас. Он показывается один раз.</p>
        </div>
    <?php endif; ?>

    <div class="warn">
        <strong>Важно:</strong> после установки удалите файл <code>backend/install_admin_user.php</code> с сервера.
    </div>
</body>
</html>
