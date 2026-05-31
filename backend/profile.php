<?php
/**
 * Личный кабинет пользователя: пользователь входит по данным, созданным после заявки,
 * видит свою заявку и может обновить контактные данные/комментарий.
 */

declare(strict_types=1);

session_start();
require_once __DIR__ . '/config.php';

if (empty($_SESSION['support_user_id'])) {
    header('Location: login.php');
    exit;
}

$userId = (int)$_SESSION['support_user_id'];
$errors = [];
$success = '';

function load_support_request(PDO $db, int $id): ?array
{
    $stmt = $db->prepare('SELECT * FROM support_requests WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

try {
    $db = db();
    $request = load_support_request($db, $userId);

    if (!$request) {
        session_unset();
        session_destroy();
        header('Location: login.php');
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = trim((string)($_POST['name'] ?? ''));
        $phone = trim((string)($_POST['phone'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $message = trim((string)($_POST['message'] ?? ''));

        if ($name === '') {
            $errors['name'] = 'Не заполнено поле «Ваше имя».';
        } elseif (!preg_match('/^[a-zA-Zа-яА-ЯёЁ\s\-]{2,150}$/u', $name)) {
            $errors['name'] = 'Введите корректное имя: только буквы, пробелы и дефис.';
        }

        if ($phone === '') {
            $errors['phone'] = 'Не заполнено поле «Телефон».';
        } elseif (!preg_match('/^\+?[0-9\s\-()]{7,25}$/', $phone)) {
            $errors['phone'] = 'Введите корректный телефон.';
        }

        if ($email === '') {
            $errors['email'] = 'Не заполнено поле «E-mail».';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Введите корректный E-mail.';
        }

        $messageLength = function_exists('mb_strlen') ? mb_strlen($message, 'UTF-8') : strlen($message);
        if ($messageLength > 2000) {
            $errors['message'] = 'Комментарий слишком длинный. Максимум 2000 символов.';
        }

        if ($errors === []) {
            $stmt = $db->prepare(
                'UPDATE support_requests
                 SET name = ?, phone = ?, email = ?, message = ?, updated_at = NOW()
                 WHERE id = ?'
            );
            $stmt->execute([$name, $phone, $email, $message, $userId]);
            $success = 'Данные успешно обновлены.';
            $request = load_support_request($db, $userId);
        } else {
            $request['name'] = $name;
            $request['phone'] = $phone;
            $request['email'] = $email;
            $request['message'] = $message;
        }
    }
} catch (Throwable $e) {
    error_log('User profile error: ' . $e->getMessage());
    http_response_code(500);
    echo 'Ошибка сервера.';
    exit;
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Личный кабинет заявки</title>
    <link rel="stylesheet" href="../css/style.css?v=webserver5-integrated">
</head>
<body class="backend-page">
    <main class="backend-auth backend-auth--wide">
        <section class="backend-auth-card">
            <div class="backend-panel-top">
                <a class="backend-back-link" href="../index.html#contacts">← На сайт</a>
                <form action="logout.php" method="post">
                    <button class="backend-logout" type="submit">Выйти</button>
                </form>
            </div>

            <h1>Личный кабинет заявки №<?= (int)$request['id'] ?></h1>
            <p>Здесь можно проверить и обновить данные, которые вы отправили через форму.</p>

            <?php if ($success !== ''): ?>
                <div class="backend-alert backend-alert--success"><?= h($success) ?></div>
            <?php endif; ?>

            <form method="post" class="backend-login-form backend-profile-form" novalidate>
                <label>
                    <span>Ваше имя</span>
                    <input type="text" name="name" value="<?= h($request['name'] ?? '') ?>" required>
                    <?php if (isset($errors['name'])): ?><em><?= h($errors['name']) ?></em><?php endif; ?>
                </label>

                <label>
                    <span>Телефон</span>
                    <input type="tel" name="phone" value="<?= h($request['phone'] ?? '') ?>" required>
                    <?php if (isset($errors['phone'])): ?><em><?= h($errors['phone']) ?></em><?php endif; ?>
                </label>

                <label>
                    <span>E-mail</span>
                    <input type="email" name="email" value="<?= h($request['email'] ?? '') ?>" required>
                    <?php if (isset($errors['email'])): ?><em><?= h($errors['email']) ?></em><?php endif; ?>
                </label>

                <label>
                    <span>Комментарий</span>
                    <textarea name="message" rows="5"><?= h($request['message'] ?? '') ?></textarea>
                    <?php if (isset($errors['message'])): ?><em><?= h($errors['message']) ?></em><?php endif; ?>
                </label>

                <button type="submit">Сохранить изменения</button>
            </form>

            <div class="backend-meta">
                <div><strong>Логин:</strong> <?= h($request['user_login'] ?? '') ?></div>
                <div><strong>Создано:</strong> <?= h($request['created_at'] ?? '') ?></div>
                <?php if (!empty($request['updated_at'])): ?>
                    <div><strong>Обновлено:</strong> <?= h($request['updated_at']) ?></div>
                <?php endif; ?>
            </div>
        </section>
    </main>
</body>
</html>
