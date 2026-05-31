<?php
/**
 * Вход пользователя по логину/паролю, созданным после отправки формы.
 * Логика перенесена из WebServer5: login + password_verify + сессия пользователя.
 */

declare(strict_types=1);

session_start();
require_once __DIR__ . '/config.php';

$error = '';
$login = '';

if (!empty($_SESSION['support_user_id'])) {
    header('Location: profile.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = trim((string)($_POST['login'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    if ($login === '' || $password === '') {
        $error = 'Введите логин и пароль.';
    } else {
        try {
            $db = db();
            $stmt = $db->prepare(
                'SELECT id, user_password_hash
                 FROM support_requests
                 WHERE user_login = ?
                 LIMIT 1'
            );
            $stmt->execute([$login]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, (string)$user['user_password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['support_user_id'] = (int)$user['id'];
                header('Location: profile.php');
                exit;
            }

            $error = 'Неверный логин или пароль.';
        } catch (Throwable $e) {
            error_log('User login error: ' . $e->getMessage());
            $error = 'Ошибка сервера. Попробуйте позже.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Вход в личный кабинет</title>
    <link rel="stylesheet" href="../css/style.css?v=webserver5-integrated">
</head>
<body class="backend-page">
    <main class="backend-auth">
        <section class="backend-auth-card">
            <a class="backend-back-link" href="../index.html#contacts">← Вернуться к форме</a>
            <h1>Вход в личный кабинет</h1>
            <p>Введите логин и пароль, которые появились после успешной отправки заявки.</p>

            <?php if ($error !== ''): ?>
                <div class="backend-alert backend-alert--error"><?= h($error) ?></div>
            <?php endif; ?>

            <form method="post" class="backend-login-form" novalidate>
                <label>
                    <span>Логин</span>
                    <input type="text" name="login" value="<?= h($login) ?>" autocomplete="username" required>
                </label>
                <label>
                    <span>Пароль</span>
                    <input type="password" name="password" autocomplete="current-password" required>
                </label>
                <button type="submit">Войти</button>
            </form>

            <p class="backend-small-note">Пароль показывается только один раз после отправки формы. Если вы его потеряли, отправьте заявку заново.</p>
        </section>
    </main>
</body>
</html>
