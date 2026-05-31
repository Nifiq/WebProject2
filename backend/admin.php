<?php

declare(strict_types=1);

require_once __DIR__ . '/request_helpers.php';

const ADMIN_REALM = 'WebServer7 Admin Panel';

function require_admin(): void
{
    if (empty($_SERVER['PHP_AUTH_USER']) || empty($_SERVER['PHP_AUTH_PW'])) {
        header('WWW-Authenticate: Basic realm="' . ADMIN_REALM . '"');
        header('HTTP/1.0 401 Unauthorized');
        exit('Требуется логин и пароль администратора.');
    }

    try {
        $stmt = db()->prepare('SELECT password_hash FROM admins WHERE login = :login LIMIT 1');
        $stmt->execute([':login' => $_SERVER['PHP_AUTH_USER']]);
        $admin = $stmt->fetch();
    } catch (Throwable $e) {
        error_log('Admin auth DB error: ' . $e->getMessage());
        http_response_code(500);
        exit('Ошибка сервера при проверке администратора. Проверьте таблицу admins.');
    }

    if (!$admin || !password_verify((string)$_SERVER['PHP_AUTH_PW'], (string)$admin['password_hash'])) {
        header('WWW-Authenticate: Basic realm="' . ADMIN_REALM . '"');
        header('HTTP/1.0 401 Unauthorized');
        exit('Неверный логин или пароль администратора.');
    }
}

function admin_csrf_token(): string
{
    if (empty($_SESSION['admin_csrf_token'])) {
        $_SESSION['admin_csrf_token'] = bin2hex(random_bytes(32));
    }

    return (string)$_SESSION['admin_csrf_token'];
}

function require_admin_csrf(): void
{
    $postedToken = (string)($_POST['csrf_token'] ?? '');
    $sessionToken = (string)($_SESSION['admin_csrf_token'] ?? '');

    if ($postedToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $postedToken)) {
        http_response_code(403);
        exit('Ошибка безопасности. Обновите страницу и попробуйте ещё раз.');
    }
}

require_admin();
$notice = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_csrf();

    try {
        if (isset($_POST['delete_id'])) {
            $id = (int)$_POST['delete_id'];
            if ($id > 0) {
                $stmt = db()->prepare('DELETE FROM support_requests WHERE id = :id');
                $stmt->execute([':id' => $id]);
                $notice = 'Заявка удалена.';
            }
        }

        if (isset($_POST['edit_id'])) {
            $id = (int)$_POST['edit_id'];
            $name = trim((string)($_POST['name'] ?? ''));
            $phone = trim((string)($_POST['phone'] ?? ''));
            $email = trim((string)($_POST['email'] ?? ''));
            $message = trim((string)($_POST['message'] ?? ''));

            if ($id <= 0 || $name === '' || $phone === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error = 'Не удалось сохранить: проверьте имя, телефон и email.';
            } else {
                $stmt = db()->prepare(
                    'UPDATE support_requests
                     SET name = :name,
                         phone = :phone,
                         email = :email,
                         message = :message,
                         updated_at = NOW()
                     WHERE id = :id'
                );
                $stmt->execute([
                    ':name' => $name,
                    ':phone' => $phone,
                    ':email' => $email,
                    ':message' => $message,
                    ':id' => $id,
                ]);
                $notice = 'Заявка обновлена.';
            }
        }
    } catch (Throwable $e) {
        error_log('Admin action error: ' . $e->getMessage());
        $error = 'Ошибка сервера: ' . $e->getMessage();
    }
}

try {
    $requests = db()
        ->query('SELECT * FROM support_requests ORDER BY created_at DESC, id DESC')
        ->fetchAll();
} catch (Throwable $e) {
    error_log('Admin list DB error: ' . $e->getMessage());
    http_response_code(500);
    exit('Ошибка сервера при загрузке заявок. Проверьте таблицу support_requests и миграцию.');
}

$csrf = admin_csrf_token();
?>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Заявки с сайта</title>
    <style>
        body {
            margin: 0;
            padding: 24px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            color: #222;
        }
        .admin-wrap {
            max-width: 1280px;
            margin: 0 auto;
        }
        .admin-head {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            margin-bottom: 18px;
        }
        h1 {
            margin: 0;
            font-size: 28px;
        }
        .admin-link {
            color: #f28c00;
            text-decoration: none;
            font-weight: 700;
        }
        .notice, .error {
            padding: 12px 14px;
            border-radius: 8px;
            margin-bottom: 14px;
            background: #e8f7ed;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        .error {
            background: #fff1f2;
            color: #be123c;
            border-color: #fecdd3;
        }
        .table-box {
            overflow-x: auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1120px;
        }
        th, td {
            padding: 12px 10px;
            border-bottom: 1px solid #ececec;
            vertical-align: top;
            text-align: left;
            font-size: 14px;
        }
        th {
            background: #2b2b2b;
            color: #fff;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        textarea, input[type="text"], input[type="email"] {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 8px;
            font: inherit;
        }
        textarea {
            min-height: 72px;
            resize: vertical;
        }
        .actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        button {
            cursor: pointer;
            border: 0;
            border-radius: 8px;
            padding: 9px 12px;
            font-weight: 700;
        }
        .save-btn {
            background: #f28c00;
            color: #fff;
        }
        .delete-btn {
            background: #e11d48;
            color: #fff;
        }
        .muted {
            color: #777;
            font-size: 13px;
        }
        .empty {
            background: #fff;
            padding: 24px;
            border-radius: 12px;
        }
    </style>
</head>
<body>
<div class="admin-wrap">
    <div class="admin-head">
        <h1>Заявки с сайта</h1>
        <a class="admin-link" href="../index.html#contacts">← Вернуться к форме</a>
    </div>

    <?php if ($notice !== ''): ?>
        <div class="notice"><?= e($notice) ?></div>
    <?php endif; ?>

    <?php if ($error !== ''): ?>
        <div class="error"><?= e($error) ?></div>
    <?php endif; ?>

    <?php if (!$requests): ?>
        <div class="empty">Пока заявок нет.</div>
    <?php else: ?>
        <div class="table-box">
            <table>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Дата</th>
                    <th>Логин пользователя</th>
                    <th>Имя</th>
                    <th>Телефон</th>
                    <th>Email</th>
                    <th>Комментарий</th>
                    <th>IP</th>
                    <th>Действия</th>
                </tr>
                </thead>
                <tbody>
                <?php foreach ($requests as $request): ?>
                    <tr>
                        <td>#<?= (int)$request['id'] ?></td>
                        <td>
                            <?= e((string)($request['created_at'] ?? '')) ?>
                            <?php if (!empty($request['updated_at'])): ?>
                                <div class="muted">изменено: <?= e((string)$request['updated_at']) ?></div>
                            <?php endif; ?>
                        </td>
                        <td><?= e((string)($request['user_login'] ?? $request['login'] ?? '')) ?></td>
                        <td>
                            <form method="post" id="edit-<?= (int)$request['id'] ?>">
                                <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
                                <input type="hidden" name="edit_id" value="<?= (int)$request['id'] ?>">
                                <input type="text" name="name" value="<?= e((string)($request['name'] ?? '')) ?>">
                            </form>
                        </td>
                        <td>
                            <input form="edit-<?= (int)$request['id'] ?>" type="text" name="phone" value="<?= e((string)($request['phone'] ?? '')) ?>">
                        </td>
                        <td>
                            <input form="edit-<?= (int)$request['id'] ?>" type="email" name="email" value="<?= e((string)($request['email'] ?? '')) ?>">
                        </td>
                        <td>
                            <textarea form="edit-<?= (int)$request['id'] ?>" name="message"><?= e((string)($request['message'] ?? '')) ?></textarea>
                        </td>
                        <td><?= e((string)($request['ip_address'] ?? '')) ?></td>
                        <td>
                            <div class="actions">
                                <button form="edit-<?= (int)$request['id'] ?>" class="save-btn" type="submit">Сохранить</button>
                                <form method="post" onsubmit="return confirm('Удалить заявку #<?= (int)$request['id'] ?>?');">
                                    <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
                                    <input type="hidden" name="delete_id" value="<?= (int)$request['id'] ?>">
                                    <button class="delete-btn" type="submit">Удалить</button>
                                </form>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
</body>
</html>
