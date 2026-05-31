// =====================================================
// MAIN.JS v2 — WebServer7Project
// Табы формы, выбор пола, языки, отправка, логин, модалка редактирования
// =====================================================

(function () {
  'use strict';

  // ── Утилиты ────────────────────────────────────────────────────────────────
  const onReady = (cb) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  };

  const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const makeUrl = (path) => new URL(path, window.location.href).toString();

  async function readJson(response) {
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) return response.json();
    const text = await response.text();
    throw new Error(`Сервер вернул не JSON. HTTP ${response.status}. Ответ: ${text.slice(0, 400)}`);
  }

  // ── Мобильное меню ─────────────────────────────────────────────────────────
  function initMenu() {
    const burger = document.querySelector('.burger');
    const nav    = document.querySelector('.nav');
    if (!nav) return;

    const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
    const setOpen = (open) => {
      nav.classList.toggle('nav--open', open);
      document.body.classList.toggle('no-scroll', open);
      if (burger) burger.setAttribute('aria-expanded', String(open));
    };
    const closeDropdowns = () => {
      nav.querySelectorAll('.nav__item--dropdown.open').forEach((el) => el.classList.remove('open'));
    };

    if (burger) {
      burger.addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(!nav.classList.contains('nav--open'));
      });
    }

    nav.addEventListener('click', (e) => {
      const dropLink = e.target.closest('.nav__item--dropdown > .nav__link');
      const simLink  = e.target.closest('.nav__item:not(.nav__item--dropdown) > .nav__link');
      if (dropLink) {
        e.preventDefault();
        e.stopPropagation();
        const item = dropLink.closest('.nav__item--dropdown');
        const shouldOpen = !item.classList.contains('open');
        closeDropdowns();
        item.classList.toggle('open', shouldOpen);
      } else if (simLink && !isDesktop()) {
        setOpen(false);
        closeDropdowns();
      }
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !(burger && burger.contains(e.target))) {
        closeDropdowns();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeDropdowns(); setOpen(false); }
    });
    window.addEventListener('resize', () => {
      if (isDesktop()) { closeDropdowns(); setOpen(false); }
    });
  }

  // ── Карусель отзывов ────────────────────────────────────────────────────────
  function initReviews() {
    const section = document.querySelector('.reviews');
    if (!section) return;
    const wrapper = section.querySelector('.review-cards-wrapper');
    const cards   = Array.from(section.querySelectorAll('.review-card'));
    if (!wrapper || !cards.length) return;

    let current = cards.findIndex((c) => getComputedStyle(c).display !== 'none');
    if (current < 0) current = 0;

    const show = (idx) => {
      cards.forEach((c, i) => { c.style.display = i === idx ? 'block' : 'none'; });
      current = idx;
    };
    show(current);

    wrapper.addEventListener('click', (e) => {
      if (e.target.closest('.review-next')) show((current + 1) % cards.length);
      if (e.target.closest('.review-prev')) show((current - 1 + cards.length) % cards.length);
    });
  }

  // ── CSRF ────────────────────────────────────────────────────────────────────
  let csrfToken = '';

  async function loadCsrf() {
    try {
      const r = await fetch(makeUrl('backend/csrf.php'), {
        credentials: 'same-origin', headers: { Accept: 'application/json' }
      });
      const d = await r.json();
      if (d.csrf_token) setCsrf(d.csrf_token);
    } catch (err) {
      console.warn('CSRF load failed:', err);
    }
  }

  function setCsrf(token) {
    csrfToken = token;
    document.querySelectorAll('input[name="csrf_token"]').forEach((el) => { el.value = token; });
  }

  // ── Языки программирования (глобальный кэш) ─────────────────────────────────
  let languagesCache = null;

  async function loadLanguages() {
    if (languagesCache) return languagesCache;
    const r = await fetch(makeUrl('backend/get_languages.php'), {
      credentials: 'same-origin', headers: { Accept: 'application/json' }
    });
    const d = await r.json();
    languagesCache = d.ok ? (d.languages || []) : [];
    return languagesCache;
  }

  // ── Отрисовка чипов языков ──────────────────────────────────────────────────
  function renderLangChips(container, hiddenInput, selectedId = null) {
    container.innerHTML = '<div class="lang-chips-loading">Загрузка...</div>';

    loadLanguages().then((langs) => {
      container.innerHTML = '';

      if (!langs.length) {
        container.innerHTML = '<span style="color:rgba(255,255,255,0.4);font-size:13px;">Нет доступных языков</span>';
        return;
      }

      langs.forEach((lang) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lang-chip';
        btn.textContent = lang.name;
        btn.dataset.id = lang.id;

        if (String(lang.id) === String(selectedId)) {
          btn.classList.add('is-selected');
          hiddenInput.value = lang.id;
        }

        btn.addEventListener('click', () => {
          container.querySelectorAll('.lang-chip').forEach((c) => {
            c.classList.remove('is-selected');
            c.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-selected');
          btn.setAttribute('aria-pressed', 'true');
          hiddenInput.value = lang.id;
          container.classList.remove('has-error');
          const errEl = container.parentElement.querySelector('.field-error-text');
          if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
        });

        container.appendChild(btn);
      });
    }).catch((err) => {
      container.innerHTML = `<span style="color:#fca5a5;font-size:13px;">Ошибка загрузки: ${esc(err.message)}</span>`;
    });
  }

  // ── Отрисовка гендер-кнопок ──────────────────────────────────────────────────
  function initGenderSelector(container, hiddenInput) {
    if (!container) return;

    container.querySelectorAll('.gender-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.gender-btn').forEach((b) => {
          b.classList.remove('is-selected');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-selected');
        btn.setAttribute('aria-pressed', 'true');
        hiddenInput.value = btn.dataset.value;
        container.classList.remove('has-error');
        const errEl = container.parentElement.querySelector('.field-error-text');
        if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
      });
    });
  }

  function setGenderValue(container, value) {
    if (!container) return;
    container.querySelectorAll('.gender-btn').forEach((b) => {
      const active = b.dataset.value === value;
      b.classList.toggle('is-selected', active);
      b.setAttribute('aria-pressed', String(active));
    });
    const hi = container.querySelector('input[type="hidden"]');
    if (hi) hi.value = value || '';
  }

  // ── Отображение ошибок поля ──────────────────────────────────────────────────
  function clearFieldErrors(container) {
    container.querySelectorAll('.webform-field-error').forEach((el) => el.classList.remove('webform-field-error'));
    container.querySelectorAll('.webform-error-text').forEach((el) => el.remove());
    container.querySelectorAll('.field-error-text').forEach((el) => { el.textContent = ''; el.hidden = true; });
    container.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));
  }

  function showFieldErrors(formEl, errors) {
    Object.entries(errors).forEach(([name, text]) => {
      // Особые случаи: gender / preferred_lang_id
      if (name === 'gender') {
        const sel = formEl.querySelector('.gender-selector');
        if (sel) {
          sel.classList.add('has-error');
          const errEl = formEl.querySelector('#gender-error, #edit-gender-error');
          if (errEl) { errEl.textContent = text; errEl.hidden = false; }
        }
        return;
      }
      if (name === 'preferred_lang_id') {
        const chips = formEl.querySelector('.lang-chips');
        if (chips) {
          chips.classList.add('has-error');
          const errEl = formEl.querySelector('#lang-error, #edit-lang-error');
          if (errEl) { errEl.textContent = text; errEl.hidden = false; }
        }
        return;
      }

      const field = formEl.querySelector(`[name="${CSS.escape(name)}"]`);
      if (!field) return;
      field.classList.add('webform-field-error');
      const hint = document.createElement('div');
      hint.className = 'webform-error-text';
      hint.textContent = text;
      field.insertAdjacentElement('afterend', hint);
    });

    // Скролл к первой ошибке
    const firstErr = formEl.querySelector('.webform-field-error, .has-error');
    if (firstErr) {
      firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { firstErr.focus({ preventScroll: true }); } catch (_) {}
    }
  }

  function showMessage(msgBox, type, html) {
    msgBox.hidden = false;
    msgBox.className = 'webform-message webform-message--' + (type === 'success' ? 'success' : 'error');
    msgBox.innerHTML = html;
  }

  // ── Рендер блока с логином/паролем после успешной отправки ──────────────────
  function renderAuthBlock(data) {
    const rid      = data.request_id ? `#${esc(String(data.request_id))}` : '';
    const login    = esc(data.login    || '');
    const password = esc(data.password || '');
    return `
      <strong>${esc(data.message || 'Заявка принята!')}</strong>
      ${rid ? `<div style="margin-top:6px;">ID заявки: <strong>${rid}</strong></div>` : ''}
      <div class="webform-auth-data">
        <div><strong>Данные для входа (сохраните — пароль показывается один раз):</strong></div>
        <div class="webform-auth-row">
          <span>Логин:</span>
          <span class="webform-auth-value">${login}</span>
          <button type="button" class="webform-copy-button" data-copy="${login}">Скопировать</button>
        </div>
        <div class="webform-auth-row">
          <span>Пароль:</span>
          <span class="webform-auth-value">${password}</span>
          <button type="button" class="webform-copy-button" data-copy="${password}">Скопировать</button>
        </div>
      </div>`;
  }

  // ── reCAPTCHA ───────────────────────────────────────────────────────────────
  function resetRecaptcha() {
    if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
      try { window.grecaptcha.reset(); } catch (_) {}
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ВКЛАДКИ ФОРМЫ
  // ══════════════════════════════════════════════════════════════════════════════
  function initTabs() {
    const tabs  = document.querySelectorAll('.form-tab');
    const panels = document.querySelectorAll('.tab-panel');
    if (!tabs.length) return;

    function activateTab(tabId) {
      tabs.forEach((t) => {
        const active = t.dataset.tab === tabId;
        t.classList.toggle('form-tab--active', active);
        t.setAttribute('aria-selected', String(active));
      });
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== tabId;
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    });

    // По умолчанию — первая вкладка
    activateTab('register');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ФОРМА ЗАЯВКИ (основная)
  // ══════════════════════════════════════════════════════════════════════════════
  function initSubmitForm() {
    const form      = document.getElementById('support-form');
    if (!form) return;

    const msgBox    = form.closest('.tab-panel')?.querySelector('.webform-message')
                    || document.querySelector('#tab-register .webform-message');
    const submitBtn = form.querySelector('.webform-button, [type="submit"]');
    const defaultBtnText = submitBtn?.textContent || 'СВЯЖИТЕСЬ С НАМИ';

    // Гендер
    const genderSel = form.querySelector('#gender-selector');
    const genderHI  = form.querySelector('input[name="gender"]');
    initGenderSelector(genderSel, genderHI);

    // Языки
    const langChips = form.querySelector('#lang-chips');
    const langHI    = form.querySelector('input[name="preferred_lang_id"]');
    if (langChips && langHI) {
      renderLangChips(langChips, langHI);
    }

    // Клик на кнопки копирования в msgBox
    if (msgBox) {
      msgBox.addEventListener('click', async (e) => {
        const btn = e.target.closest('.webform-copy-button[data-copy]');
        if (!btn) return;
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          const old = btn.textContent;
          btn.textContent = 'Скопировано ✓';
          setTimeout(() => { btn.textContent = old; }, 1500);
        } catch (_) {}
      });
    }

    // Клиентская валидация
    function validateForm() {
      const errors = {};
      const name    = form.querySelector('[name="name"]')?.value.trim() || '';
      const phone   = form.querySelector('[name="phone"]')?.value.trim() || '';
      const email   = form.querySelector('[name="email"]')?.value.trim() || '';
      const gender  = form.querySelector('input[name="gender"]')?.value || '';
      const langId  = form.querySelector('input[name="preferred_lang_id"]')?.value || '';
      const message = form.querySelector('[name="message"]')?.value.trim() || '';

      if (!name) errors.name = 'Не заполнено поле «Ваше имя».';
      else if (!/^[\p{L}\s\-]{2,150}$/u.test(name)) errors.name = 'Только буквы, пробелы и дефис.';

      if (!phone) errors.phone = 'Не заполнено поле «Телефон».';
      else if (!/^\+?[0-9\s\-()]{7,25}$/.test(phone)) errors.phone = 'Введите корректный телефон.';

      if (!email) errors.email = 'Не заполнено поле «E-mail».';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Введите корректный E-mail.';

      if (!gender) errors.gender = 'Выберите пол.';
      if (!langId) errors.preferred_lang_id = 'Выберите язык программирования.';
      if (message.length > 2000) errors.message = 'Комментарий слишком длинный.';

      return errors;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!msgBox) return;
      clearFieldErrors(form);

      const errors = validateForm();
      if (Object.keys(errors).length) {
        showFieldErrors(form, errors);
        showMessage(msgBox, 'error', 'Проверьте поля формы.');
        return;
      }

      const formData = new FormData(form);
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'ОТПРАВЛЯЕМ...'; }

      try {
        const r = await fetch(makeUrl('backend/submit.php'), {
          method: 'POST', body: formData, credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        const d = await readJson(r);
        if (d.csrf_token) setCsrf(d.csrf_token);

        if (!r.ok || !d.ok) {
          if (d.errors) showFieldErrors(form, d.errors);
          showMessage(msgBox, 'error', esc(d.message || 'Не удалось отправить форму.'));
          resetRecaptcha();
          return;
        }

        showMessage(msgBox, 'success', renderAuthBlock(d));
        form.reset();
        setGenderValue(genderSel, '');
        if (langChips && langHI) { renderLangChips(langChips, langHI); }
        resetRecaptcha();
      } catch (err) {
        showMessage(msgBox, 'error', esc(err.message || 'Ошибка соединения.'));
        resetRecaptcha();
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = defaultBtnText; }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ВХОД ПОЛЬЗОВАТЕЛЯ + МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ
  // ══════════════════════════════════════════════════════════════════════════════
  function initUserLogin() {
    const loginForm  = document.getElementById('user-login-form');
    const statusBox  = document.getElementById('login-status');
    const logoutBtn  = document.getElementById('logout-btn');
    if (!loginForm) return;

    const loginBtn = loginForm.querySelector('[type="submit"]');
    const defaultLoginText = loginBtn?.textContent || 'Войти';

    function setStatus(type, text) {
      if (!statusBox) return;
      statusBox.hidden = !text;
      statusBox.className = 'login-panel__status' + (type ? ` is-${type}` : '');
      statusBox.textContent = text || '';
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('', '');

      const login    = loginForm.elements.login?.value.trim() || '';
      const password = loginForm.elements.password?.value || '';

      if (!login || !password) {
        setStatus('error', 'Введите логин и пароль.');
        return;
      }

      const fd = new FormData();
      fd.set('login', login);
      fd.set('password', password);
      fd.set('csrf_token', csrfToken);

      if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Вход...'; }

      try {
        const r = await fetch(makeUrl('backend/user_login.php'), {
          method: 'POST', body: fd, credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        const d = await readJson(r);
        if (d.csrf_token) setCsrf(d.csrf_token);

        if (!r.ok || !d.ok) {
          setStatus('error', d.message || 'Неверный логин или пароль.');
          return;
        }

        setStatus('success', 'Вы вошли! Открываем форму редактирования...');
        if (logoutBtn) logoutBtn.hidden = false;

        // Открываем модалку
        openEditModal(d.request);
      } catch (err) {
        setStatus('error', err.message || 'Ошибка входа.');
      } finally {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = defaultLoginText; }
      }
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          const r = await fetch(makeUrl('backend/user_logout.php'), {
            credentials: 'same-origin', headers: { Accept: 'application/json' }
          });
          const d = await readJson(r);
          if (d.csrf_token) setCsrf(d.csrf_token);
        } catch (_) {}
        logoutBtn.hidden = true;
        setStatus('success', 'Вы вышли из режима редактирования.');
        loginForm.reset();
        closeEditModal();
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ
  // ══════════════════════════════════════════════════════════════════════════════
  const modal         = document.getElementById('edit-modal');
  const modalBackdrop = document.getElementById('edit-modal-backdrop');
  const modalClose    = document.getElementById('edit-modal-close');
  const modalCancel   = document.getElementById('edit-modal-cancel');
  const modalForm     = document.getElementById('edit-modal-form');
  const modalMsg      = document.getElementById('edit-modal-message');

  function openEditModal(requestData) {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Гарантируем, что чипы и гендер инициализированы
    const gSel  = modal.querySelector('#edit-gender-selector');
    const gHI   = modal.querySelector('input[name="gender"]');
    const lChips = modal.querySelector('#edit-lang-chips');
    const lHI   = modal.querySelector('input[name="preferred_lang_id"]');

    // Перерисуем (на случай если первый раз)
    if (gSel && gHI) {
      initGenderSelector(gSel, gHI);
    }

    if (lChips && lHI) {
      const selLang = requestData?.preferred_lang_id || null;
      renderLangChips(lChips, lHI, selLang);
    }

    // Заполняем поля
    if (requestData) fillModalForm(requestData);

    // Синхронизируем csrf
    const ci = modalForm?.querySelector('input[name="csrf_token"]');
    if (ci) ci.value = csrfToken;

    // Фокус
    setTimeout(() => {
      const firstInput = modal.querySelector('input:not([type="hidden"])');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  function closeEditModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function fillModalForm(req) {
    if (!modalForm) return;
    const set = (name, val) => {
      const el = modalForm.querySelector(`[name="${name}"]`);
      if (el) el.value = val || '';
    };
    set('name',    req.name);
    set('phone',   req.phone);
    set('email',   req.email);
    set('message', req.message);

    const gSel = modalForm.querySelector('#edit-gender-selector');
    setGenderValue(gSel, req.gender || '');

    // Язык — обновим после загрузки чипов
    const lHI = modalForm.querySelector('input[name="preferred_lang_id"]');
    if (lHI) lHI.value = req.preferred_lang_id || '';
    // Подсветим чип если чипы уже есть
    const lChips = modalForm.querySelector('#edit-lang-chips');
    if (lChips) {
      const chips = lChips.querySelectorAll('.lang-chip');
      chips.forEach((c) => {
        const active = String(c.dataset.id) === String(req.preferred_lang_id);
        c.classList.toggle('is-selected', active);
        c.setAttribute('aria-pressed', String(active));
      });
    }

    if (modalMsg) { modalMsg.hidden = true; modalMsg.textContent = ''; }
  }

  function initEditModal() {
    if (!modal) return;

    [modalBackdrop, modalClose, modalCancel].forEach((el) => {
      if (el) el.addEventListener('click', closeEditModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeEditModal();
    });

    // Гендер
    const gSel = modal.querySelector('#edit-gender-selector');
    const gHI  = modal.querySelector('input[name="gender"]');
    initGenderSelector(gSel, gHI);

    // Чипы языков в модалке
    const lChips = modal.querySelector('#edit-lang-chips');
    const lHI    = modal.querySelector('input[name="preferred_lang_id"]');
    if (lChips && lHI) renderLangChips(lChips, lHI);

    if (!modalForm) return;

    const saveBtn = modalForm.querySelector('.edit-modal__save');
    const defaultSaveText = saveBtn?.textContent || 'Сохранить изменения';

    // Клиентская валидация модалки
    function validateModal() {
      const errors = {};
      const name   = modalForm.querySelector('[name="name"]')?.value.trim() || '';
      const phone  = modalForm.querySelector('[name="phone"]')?.value.trim() || '';
      const email  = modalForm.querySelector('[name="email"]')?.value.trim() || '';
      const gender = modalForm.querySelector('input[name="gender"]')?.value || '';
      const langId = modalForm.querySelector('input[name="preferred_lang_id"]')?.value || '';
      const msg    = modalForm.querySelector('[name="message"]')?.value.trim() || '';

      if (!name) errors.name = 'Не заполнено поле «Ваше имя».';
      else if (!/^[\p{L}\s\-]{2,150}$/u.test(name)) errors.name = 'Только буквы, пробелы и дефис.';
      if (!phone) errors.phone = 'Не заполнено поле «Телефон».';
      else if (!/^\+?[0-9\s\-()]{7,25}$/.test(phone)) errors.phone = 'Введите корректный телефон.';
      if (!email) errors.email = 'Не заполнено поле «E-mail».';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Введите корректный E-mail.';
      if (!gender) errors.gender = 'Выберите пол.';
      if (!langId) errors.preferred_lang_id = 'Выберите язык программирования.';
      if (msg.length > 2000) errors.message = 'Комментарий слишком длинный.';
      return errors;
    }

    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors(modalForm);

      const errors = validateModal();
      if (Object.keys(errors).length) {
        showFieldErrors(modalForm, errors);
        if (modalMsg) showMessage(modalMsg, 'error', 'Проверьте поля формы.');
        return;
      }

      const fd = new FormData(modalForm);
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'СОХРАНЯЕМ...'; }

      try {
        const r = await fetch(makeUrl('backend/user_update.php'), {
          method: 'POST', body: fd, credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        const d = await readJson(r);
        if (d.csrf_token) setCsrf(d.csrf_token);

        if (!r.ok || !d.ok) {
          if (d.errors) showFieldErrors(modalForm, d.errors);
          if (modalMsg) showMessage(modalMsg, 'error', esc(d.message || 'Ошибка сохранения.'));
          return;
        }

        if (modalMsg) {
          modalMsg.hidden = false;
          modalMsg.className = 'edit-modal__message is-success';
          modalMsg.textContent = d.message || 'Данные успешно обновлены!';
        }

        if (d.request) fillModalForm(d.request);

        // Закрываем через 1.5с
        setTimeout(() => closeEditModal(), 1500);
      } catch (err) {
        if (modalMsg) showMessage(modalMsg, 'error', esc(err.message || 'Ошибка соединения.'));
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = defaultSaveText; }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // СТАРТ
  // ══════════════════════════════════════════════════════════════════════════════
  onReady(() => {
    initMenu();
    initReviews();
    initTabs();
    initSubmitForm();
    initUserLogin();
    initEditModal();
    loadCsrf();
  });

})();
