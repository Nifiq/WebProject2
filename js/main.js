// =====================================================
// MAIN UI: mobile menu + reviews + backend integration
// Подходит для страницы /katalog_zadaniya_8/
// =====================================================

(function () {
  'use strict';

  const onReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const makeProjectUrl = (path) => new URL(path, window.location.href).toString();

  function initMenu() {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');
    const body = document.body;

    if (!nav) return;

    const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

    const setMenuState = (isOpen) => {
      nav.classList.toggle('nav--open', isOpen);
      body.classList.toggle('no-scroll', isOpen);

      if (burger) {
        burger.setAttribute('aria-expanded', String(isOpen));
        burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
      }
    };

    const closeAllDropdowns = () => {
      nav.querySelectorAll('.nav__item--dropdown.open').forEach((item) => {
        item.classList.remove('open');
      });
    };

    if (burger) {
      burger.setAttribute('type', 'button');
      burger.setAttribute('aria-controls', 'main-navigation');
      burger.setAttribute('aria-expanded', 'false');
      if (!nav.id) nav.id = 'main-navigation';

      burger.addEventListener('click', (event) => {
        event.preventDefault();
        setMenuState(!nav.classList.contains('nav--open'));
      });
    }

    nav.addEventListener('click', (event) => {
      const dropdownLink = event.target.closest('.nav__item--dropdown > .nav__link');
      const simpleLink = event.target.closest('.nav__item:not(.nav__item--dropdown) > .nav__link');

      if (dropdownLink) {
        event.preventDefault();
        event.stopPropagation();

        const item = dropdownLink.closest('.nav__item--dropdown');
        const shouldOpen = !item.classList.contains('open');
        closeAllDropdowns();
        item.classList.toggle('open', shouldOpen);
        return;
      }

      if (simpleLink && !isDesktop()) {
        setMenuState(false);
        closeAllDropdowns();
      }
    });

    document.addEventListener('click', (event) => {
      const clickInsideNav = nav.contains(event.target);
      const clickOnBurger = burger ? burger.contains(event.target) : false;
      if (!clickInsideNav && !clickOnBurger) {
        closeAllDropdowns();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeAllDropdowns();
      setMenuState(false);
    });

    window.addEventListener('resize', () => {
      if (isDesktop()) {
        closeAllDropdowns();
        setMenuState(false);
      }
    });
  }

  function initReviews() {
    const reviewsSection = document.querySelector('.reviews');
    if (!reviewsSection) return;

    const wrapper = reviewsSection.querySelector('.review-cards-wrapper');
    const cards = Array.from(reviewsSection.querySelectorAll('.review-card'));
    if (!wrapper || cards.length === 0) return;

    let current = cards.findIndex((card) => getComputedStyle(card).display !== 'none');
    if (current === -1) current = 0;

    const showCard = (index) => {
      cards.forEach((card, cardIndex) => {
        card.style.display = cardIndex === index ? 'block' : 'none';
      });
      current = index;
    };

    showCard(current);

    wrapper.addEventListener('click', (event) => {
      const nextButton = event.target.closest('.review-next');
      const previousButton = event.target.closest('.review-prev');

      if (!nextButton && !previousButton) return;
      event.preventDefault();

      if (nextButton) showCard((current + 1) % cards.length);
      if (previousButton) showCard((current - 1 + cards.length) % cards.length);
    });
  }

  function injectBackendStyles() {
    if (document.getElementById('backend-integration-styles')) return;

    const style = document.createElement('style');
    style.id = 'backend-integration-styles';
    style.textContent = `
      .webform-inner { position: relative; }
      .webform-switcher {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        width: 100%;
        margin: 0 0 18px;
      }
      .webform-switcher-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 12px 14px;
        border: 1px solid rgba(255, 255, 255, .22);
        border-radius: 12px;
        background: rgba(255, 255, 255, .08);
        color: #fff;
        font: inherit;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.15;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
        transition: background .2s ease, border-color .2s ease, transform .2s ease;
      }
      .webform-switcher-button:hover {
        background: rgba(255, 87, 34, .25);
        border-color: rgba(255, 87, 34, .8);
        color: #fff;
      }
      .webform-switcher-button.is-active {
        background: #ff5722;
        border-color: #ff5722;
        color: #fff;
      }
      .webform-user-login {
        width: 100%;
        max-width: none;
        box-sizing: border-box;
        margin: 0;
        padding: 22px;
        border-radius: 14px;
        background: rgba(255, 255, 255, .08);
        border: 1px solid rgba(255, 255, 255, .18);
        color: #fff;
      }
      .webform-user-login h3 {
        margin: 0 0 10px;
        font-size: 22px;
        line-height: 1.25;
      }
      .webform-user-login p {
        margin: 0 0 16px;
        color: #d1d5db;
        font-size: 15px;
        line-height: 1.45;
        opacity: 1;
      }
      .webform-user-login-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        align-items: center;
      }
      .webform-user-login input {
        width: 100%;
        box-sizing: border-box;
        background: transparent;
        border: 1px solid #374151;
        border-radius: 10px;
        padding: 18px 20px;
        color: #fff;
        font: inherit;
        font-size: 17px;
      }
      .webform-user-login input::placeholder { color: #d8d3d3; }
      .webform-login-button,
      .webform-open-edit-modal-button,
      .webform-logout-button,
      .webform-copy-button {
        border: 0;
        border-radius: 10px;
        padding: 16px 18px;
        background: #ff5722;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      .webform-open-edit-modal-button,
      .webform-logout-button {
        width: 100%;
        margin-top: 12px;
      }
      .webform-open-edit-modal-button { background: #ff5722; }
      .webform-logout-button { background: #2b2b2b; }
      .webform-login-status {
        margin-top: 12px;
        font-size: 14px;
      }
      .webform-login-status.is-error { color: #ffd2d2; }
      .webform-login-status.is-success { color: #d7ffd7; }
      .webform-message--success,
      .webform-message--error {
        display: block;
        box-sizing: border-box;
        width: 100%;
        margin: 0 0 16px;
        padding: 16px;
        border-radius: 12px;
        text-align: left;
        line-height: 1.45;
      }
      .webform-message--success { background: #ecfdf5; color: #064e3b; border: 1px solid #bbf7d0; }
      .webform-message--error { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
      .webform-auth-data {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .webform-auth-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        padding: 10px;
        border-radius: 10px;
        background: rgba(255, 255, 255, .75);
      }
      .webform-auth-value {
        font-family: Consolas, Monaco, monospace;
        font-weight: 700;
        word-break: break-all;
      }
      .webform-copy-button {
        padding: 8px 10px;
        font-size: 12px;
        border-radius: 999px;
      }
      .webform-field-error { outline: 2px solid #e11d48 !important; }
      .webform-error-text {
        margin: -6px 0 10px;
        color: #fff3f3;
        font-size: 13px;
        line-height: 1.35;
      }
      .webform-message .webform-error-text { color: inherit; }
      .webform-editing-note {
        margin: 12px 0;
        padding: 12px 14px;
        border-radius: 10px;
        background: rgba(242, 140, 0, .16);
        color: #fff;
        font-size: 14px;
      }
      @media (min-width: 1024px) {
        .webform-switcher {
          grid-column: 2;
          grid-row: 1;
        }
        .webform-form.webform-panel,
        .webform-user-login.webform-panel {
          grid-column: 2;
          grid-row: 2 / span 3;
        }
        .webform-user-login-row { grid-template-columns: 1fr 1fr; }
        .webform-login-button { grid-column: 1 / -1; }
      }
      @media (max-width: 520px) {
        .webform-switcher { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function initBackendForm() {
    const form = document.querySelector('#support-form.webform-form, .webform-form');
    if (!form) return;

    injectBackendStyles();

    const webformInner = form.closest('.webform-inner') || form.parentElement;
    const messageBox = form.querySelector('.webform-message') || document.createElement('div');
    const submitButton = form.querySelector('.webform-button, [type="submit"]');
    const csrfInput = form.querySelector('input[name="csrf_token"]');
    const defaultButtonText = submitButton ? submitButton.textContent : 'СВЯЖИТЕСЬ С НАМИ';

    let editMode = false;
    let currentRequestId = null;
    let activateWebformPanel = null;
    let editModal = null;
    let editModalForm = null;
    let editModalMessage = null;
    let editModalTitle = null;
    let editModalLastFocused = null;
    let lastEditRequest = null;

    // Автосохранение введённых данных формы в браузере.
    // Нужно, чтобы после перезагрузки страницы поля снова подставлялись.
    const draftStorageKey = 'katalog_zadaniya_8_support_form_draft_v1';
    const draftFieldNames = ['name', 'phone', 'email', 'request_date', 'gender', 'programming_language_id', 'message', 'consent'];
    let draftSaveTimer = null;
    let suppressDraftSave = false;

    function readDraftFromForm() {
      const draft = {};
      draftFieldNames.forEach((name) => {
        const fields = getFields(name);
        if (fields.length === 0) return;
        draft[name] = getFieldValue(name);
      });
      return draft;
    }

    function saveFormDraftNow() {
      if (suppressDraftSave) return;
      try {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(readDraftFromForm()));
      } catch (error) {
        console.warn('Не удалось сохранить данные формы:', error);
      }
    }

    function scheduleFormDraftSave() {
      if (suppressDraftSave) return;
      window.clearTimeout(draftSaveTimer);
      draftSaveTimer = window.setTimeout(saveFormDraftNow, 150);
    }

    function restoreFormDraft() {
      let draft = null;

      try {
        const raw = window.localStorage.getItem(draftStorageKey);
        if (!raw) return;
        draft = JSON.parse(raw);
      } catch (error) {
        console.warn('Не удалось восстановить данные формы:', error);
        return;
      }

      if (!draft || typeof draft !== 'object') return;

      draftFieldNames.forEach((name) => {
        if (!(name in draft)) return;
        setFieldValue(name, draft[name]);
      });
    }

    function clearFormDraft() {
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch (error) {
        console.warn('Не удалось очистить сохранённые данные формы:', error);
      }
    }

    if (!messageBox.classList.contains('webform-message')) {
      messageBox.className = 'webform-message';
      messageBox.setAttribute('aria-live', 'polite');
      messageBox.hidden = true;
      form.prepend(messageBox);
    }

    function setCsrf(token) {
      if (!token) return;
      if (csrfInput) csrfInput.value = token;
      const editCsrfInput = editModalForm ? editModalForm.querySelector('input[name="csrf_token"]') : null;
      if (editCsrfInput) editCsrfInput.value = token;
    }

    async function loadCsrf() {
      try {
        const response = await fetch(makeProjectUrl('backend/csrf.php'), {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        if (data && data.csrf_token) setCsrf(data.csrf_token);
      } catch (error) {
        console.warn('Не удалось получить CSRF-токен:', error);
      }
    }

    function showMessage(type, html) {
      messageBox.hidden = false;
      messageBox.classList.remove('webform-message--success', 'webform-message--error');
      messageBox.classList.add(type === 'success' ? 'webform-message--success' : 'webform-message--error');
      messageBox.innerHTML = html;
    }

    function clearFieldErrorsIn(targetForm) {
      targetForm.querySelectorAll('.webform-field-error').forEach((field) => {
        field.classList.remove('webform-field-error');
      });
      targetForm.querySelectorAll('.webform-error-text').forEach((errorText) => {
        errorText.remove();
      });
    }

    function clearFieldErrors() {
      clearFieldErrorsIn(form);
    }

    function getFieldsFrom(targetForm, name) {
      return Array.from(targetForm.querySelectorAll(`[name="${CSS.escape(name)}"]`));
    }

    function getFields(name) {
      return getFieldsFrom(form, name);
    }

    function getFieldFrom(targetForm, name) {
      return getFieldsFrom(targetForm, name)[0] || null;
    }

    function getField(name) {
      return getFieldFrom(form, name);
    }

    function getFieldValueFrom(targetForm, name) {
      const fields = getFieldsFrom(targetForm, name);
      if (fields.length === 0) return '';

      const firstField = fields[0];
      if (firstField.type === 'checkbox') return firstField.checked;
      if (firstField.type === 'radio') {
        const checked = fields.find((field) => field.checked);
        return checked ? checked.value : '';
      }

      return firstField.value;
    }

    function getFieldValue(name) {
      return getFieldValueFrom(form, name);
    }

    function setFieldValueIn(targetForm, name, value) {
      const fields = getFieldsFrom(targetForm, name);
      if (fields.length === 0) return;

      const firstField = fields[0];
      if (firstField.type === 'checkbox') {
        firstField.checked = Boolean(Number(value || 0));
        return;
      }

      if (firstField.type === 'radio') {
        fields.forEach((field) => {
          field.checked = field.value === String(value || '');
        });
        return;
      }

      firstField.value = value || '';
    }

    function setFieldValue(name, value) {
      setFieldValueIn(form, name, value);
    }

    function getTrimmedValueFrom(targetForm, name) {
      const value = getFieldValueFrom(targetForm, name);
      return typeof value === 'string' ? value.trim() : String(value || '').trim();
    }

    function getTrimmedValue(name) {
      return getTrimmedValueFrom(form, name);
    }

    function showFieldErrorsIn(targetForm, errors = {}) {
      Object.entries(errors).forEach(([fieldName, errorText]) => {
        const field = getFieldFrom(targetForm, fieldName);
        if (!field) return;

        field.classList.add('webform-field-error');
        const group = field.closest('.webform-field-group');
        if (group) group.classList.add('webform-field-error');
        const hint = document.createElement('div');
        hint.className = 'webform-error-text';
        hint.textContent = errorText;

        const label = field.closest('.webform-checkbox, .webform-field');
        if (group) {
          group.insertAdjacentElement('afterend', hint);
        } else if (label) {
          label.insertAdjacentElement('afterend', hint);
        } else {
          field.insertAdjacentElement('afterend', hint);
        }
      });
    }

    function showFieldErrors(errors = {}) {
      showFieldErrorsIn(form, errors);
    }

    function validateFormBeforeSubmit(targetForm = form) {
      const errors = {};
      const name = getTrimmedValueFrom(targetForm, 'name');
      const phone = getTrimmedValueFrom(targetForm, 'phone');
      const email = getTrimmedValueFrom(targetForm, 'email');
      const requestDate = getTrimmedValueFrom(targetForm, 'request_date');
      const gender = getTrimmedValueFrom(targetForm, 'gender');
      const programmingLanguageId = getTrimmedValueFrom(targetForm, 'programming_language_id');
      const message = getTrimmedValueFrom(targetForm, 'message');
      const consent = getFieldFrom(targetForm, 'consent');

      if (!name) {
        errors.name = 'Не заполнено поле «Ваше имя».';
      } else if (!/^[\p{L}\s-]{2,150}$/u.test(name)) {
        errors.name = 'Введите корректное имя: только буквы, пробелы и дефис.';
      }

      if (!phone) {
        errors.phone = 'Не заполнено поле «Телефон».';
      } else if (!/^\+?[0-9\s\-()]{7,25}$/.test(phone)) {
        errors.phone = 'Введите корректный телефон.';
      }

      if (!email) {
        errors.email = 'Не заполнено поле «E-mail».';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Введите корректный E-mail.';
      }

      if (!requestDate) {
        errors.request_date = 'Выберите дату рождения.';
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(requestDate) || Number.isNaN(Date.parse(`${requestDate}T00:00:00`))) {
        errors.request_date = 'Введите корректную дату рождения.';
      } else if (new Date(`${requestDate}T00:00:00`) > new Date()) {
        errors.request_date = 'Дата рождения не может быть в будущем.';
      }

      if (!['male', 'female'].includes(gender)) {
        errors.gender = 'Выберите пол.';
      }

      if (!programmingLanguageId || !/^\d+$/.test(programmingLanguageId)) {
        errors.programming_language_id = 'Выберите любимый язык программирования.';
      }

      if (message.length > 2000) {
        errors.message = 'Комментарий слишком длинный. Максимум 2000 символов.';
      }

      if (!consent || !consent.checked) {
        errors.consent = 'Поставьте галочку согласия на обработку персональных данных.';
      }

      return errors;
    }

    function focusFirstInvalidFieldIn(targetForm, errors = {}) {
      const firstFieldName = Object.keys(errors)[0];
      if (!firstFieldName) return;

      const firstField = getFieldFrom(targetForm, firstFieldName);
      if (!firstField) return;

      firstField.focus({ preventScroll: true });
      firstField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function focusFirstInvalidField(errors = {}) {
      focusFirstInvalidFieldIn(form, errors);
    }

    function initFormDraftStorage() {
      restoreFormDraft();

      draftFieldNames.forEach((name) => {
        getFields(name).forEach((field) => {
          field.addEventListener('input', scheduleFormDraftSave);
          field.addEventListener('change', scheduleFormDraftSave);
        });
      });
    }

    async function readJsonResponse(response) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) return response.json();

      const text = await response.text();
      throw new Error(`Сервер вернул не JSON. HTTP ${response.status}. Ответ: ${text.slice(0, 500)}`);
    }

    function renderAuthSuccess(data) {
      const requestId = data.request_id ? `#${escapeHtml(data.request_id)}` : '';
      const login = escapeHtml(data.login || '');
      const password = escapeHtml(data.password || '');

      return `
        <strong>${escapeHtml(data.message || 'Спасибо! Заявка отправлена.')}</strong>
        ${requestId ? `<div style="margin-top:8px;">ID заявки: <strong>${requestId}</strong></div>` : ''}
        <div class="webform-auth-data">
          <div><strong>Данные для входа:</strong></div>
          <div class="webform-auth-row">
            <span>Логин:</span>
            <span class="webform-auth-value" data-copy-value="${login}">${login}</span>
            <button type="button" class="webform-copy-button" data-copy-target="login">Скопировать</button>
          </div>
          <div class="webform-auth-row">
            <span>Пароль:</span>
            <span class="webform-auth-value" data-copy-value="${password}">${password}</span>
            <button type="button" class="webform-copy-button" data-copy-target="password">Скопировать</button>
          </div>
          <div><strong>Сохраните эти данные. Пароль показывается только один раз.</strong></div>
        </div>
      `;
    }

    function resetRecaptcha() {
      if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
        try { window.grecaptcha.reset(); } catch (e) { /* ignore */ }
      }
    }

    function getProgrammingLanguageOptionsHtml() {
      const select = form.querySelector('select[name="programming_language_id"]');
      if (!select) return '<option value="">Выберите язык программирования</option>';

      return Array.from(select.options).map((option) => (
        `<option value="${escapeHtml(option.value)}">${escapeHtml(option.textContent)}</option>`
      )).join('');
    }

    function createEditModal() {
      if (editModal) return editModal;

      editModalTitle = `webform-edit-modal-title-${Math.random().toString(36).slice(2)}`;
      const modal = document.createElement('div');
      modal.className = 'webform-edit-modal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="webform-edit-modal__backdrop" data-edit-modal-close></div>
        <div class="webform-edit-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="${editModalTitle}" tabindex="-1">
          <button type="button" class="webform-edit-modal__close" data-edit-modal-close aria-label="Закрыть окно редактирования">×</button>
          <h3 id="${editModalTitle}">Редактирование заявки</h3>
          <p class="webform-edit-modal__text">Измените данные заявки и нажмите «Сохранить изменения».</p>
          <div class="webform-message webform-edit-modal-message" aria-live="polite" hidden></div>
          <form class="webform-form webform-edit-modal-form" novalidate>
            <input type="hidden" name="csrf_token" value="${escapeHtml(csrfInput ? csrfInput.value : '')}">
            <input type="text" name="name" placeholder="Ваше имя" autocomplete="name" required>
            <input type="tel" name="phone" placeholder="Телефон" autocomplete="tel" required>
            <input type="email" name="email" placeholder="E-mail" autocomplete="email" required>

            <label class="webform-field webform-field--date">
              <span>Дата рождения</span>
              <input type="date" name="request_date" required>
            </label>

            <fieldset class="webform-field webform-field-group webform-radio-field">
              <legend>Пол</legend>
              <div class="webform-radio-group">
                <label class="webform-radio-option">
                  <input type="radio" name="gender" value="male" required>
                  <span>Муж</span>
                </label>
                <label class="webform-radio-option">
                  <input type="radio" name="gender" value="female" required>
                  <span>Жен</span>
                </label>
              </div>
            </fieldset>

            <label class="webform-field webform-field--select">
              <span>Любимый язык программирования</span>
              <select name="programming_language_id" required>
                ${getProgrammingLanguageOptionsHtml()}
              </select>
            </label>

            <textarea name="message" placeholder="Ваш комментарий"></textarea>
            <label class="webform-checkbox">
              <input type="checkbox" name="consent" value="1" required>
              <span>Отправляя заявку, я даю согласие на <a href="https://example.com/privacy-policy" class="privacy-link">обработку персональных данных*</a>.</span>
            </label>

            <div class="webform-edit-modal__actions">
              <button type="submit" class="webform-button">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>
              <button type="button" class="webform-edit-modal__secondary" data-edit-modal-close>Закрыть</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);
      editModal = modal;
      editModalForm = modal.querySelector('.webform-edit-modal-form');
      editModalMessage = modal.querySelector('.webform-edit-modal-message');

      modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-edit-modal-close]')) {
          closeEditModal();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && editModal && !editModal.hidden) {
          closeEditModal();
        }
      });

      editModalForm.addEventListener('submit', handleEditModalSubmit);
      return modal;
    }

    function showEditModalMessage(type, html) {
      if (!editModalMessage) return;
      editModalMessage.hidden = false;
      editModalMessage.classList.remove('webform-message--success', 'webform-message--error');
      editModalMessage.classList.add(type === 'success' ? 'webform-message--success' : 'webform-message--error');
      editModalMessage.innerHTML = html;
    }

    function hideEditModalMessage() {
      if (!editModalMessage) return;
      editModalMessage.hidden = true;
      editModalMessage.innerHTML = '';
      editModalMessage.classList.remove('webform-message--success', 'webform-message--error');
    }

    function fillEditModalFromRequest(request) {
      if (!request || !editModalForm) return;

      ['name', 'phone', 'email', 'request_date', 'programming_language_id', 'message'].forEach((name) => {
        setFieldValueIn(editModalForm, name, request[name] || '');
      });
      setFieldValueIn(editModalForm, 'gender', request.gender || '');
      setFieldValueIn(editModalForm, 'consent', request.consent || 1);

      currentRequestId = request.id || null;
      const text = editModal.querySelector('.webform-edit-modal__text');
      if (text) {
        text.textContent = currentRequestId
          ? `Вы редактируете заявку #${currentRequestId}. После изменения нажмите «Сохранить изменения».`
          : 'Измените данные заявки и нажмите «Сохранить изменения».';
      }
    }

    function openEditModal(request) {
      if (request) lastEditRequest = request;
      createEditModal();
      fillEditModalFromRequest(request || lastEditRequest);
      hideEditModalMessage();
      clearFieldErrorsIn(editModalForm);

      editModalLastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      editModal.hidden = false;
      document.body.classList.add('webform-edit-modal-open');
      window.setTimeout(() => {
        const firstField = editModalForm.querySelector('input[name="name"]');
        (firstField || editModal.querySelector('.webform-edit-modal__dialog')).focus({ preventScroll: true });
      }, 0);
    }

    function closeEditModal() {
      if (!editModal || editModal.hidden) return;
      editModal.hidden = true;
      document.body.classList.remove('webform-edit-modal-open');
      if (editModalLastFocused && typeof editModalLastFocused.focus === 'function') {
        editModalLastFocused.focus({ preventScroll: true });
      }
    }

    async function handleEditModalSubmit(event) {
      event.preventDefault();
      clearFieldErrorsIn(editModalForm);
      hideEditModalMessage();

      const clientErrors = validateFormBeforeSubmit(editModalForm);
      if (Object.keys(clientErrors).length > 0) {
        showFieldErrorsIn(editModalForm, clientErrors);
        showEditModalMessage('error', 'Проверьте поля формы.');
        focusFirstInvalidFieldIn(editModalForm, clientErrors);
        return;
      }

      const modalSubmitButton = editModalForm.querySelector('button[type="submit"]');
      const oldText = modalSubmitButton ? modalSubmitButton.textContent : '';
      if (modalSubmitButton) {
        modalSubmitButton.disabled = true;
        modalSubmitButton.textContent = 'СОХРАНЯЕМ...';
      }

      try {
        const formData = new FormData(editModalForm);
        if (csrfInput) formData.set('csrf_token', csrfInput.value);

        const response = await fetch(makeProjectUrl('backend/user_update.php'), {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' }
        });

        const data = await readJsonResponse(response);
        if (data.csrf_token) setCsrf(data.csrf_token);

        if (!response.ok || !data.ok) {
          if (data.errors) {
            showFieldErrorsIn(editModalForm, data.errors);
            focusFirstInvalidFieldIn(editModalForm, data.errors);
          }
          showEditModalMessage('error', escapeHtml(data.message || 'Не удалось сохранить изменения.'));
          return;
        }

        if (data.request) {
          lastEditRequest = data.request;
          fillEditModalFromRequest(data.request);
        }
        showEditModalMessage('success', escapeHtml(data.message || 'Заявка успешно обновлена.'));
      } catch (error) {
        showEditModalMessage('error', escapeHtml(error.message || 'Ошибка соединения с сервером.'));
      } finally {
        if (modalSubmitButton) {
          modalSubmitButton.disabled = false;
          modalSubmitButton.textContent = oldText || 'СОХРАНИТЬ ИЗМЕНЕНИЯ';
        }
      }
    }

    function fillFormFromRequest(request) {
      openEditModal(request);
    }

    function resetEditMode() {
      editMode = false;
      currentRequestId = null;
      if (submitButton) submitButton.textContent = defaultButtonText;
      const note = form.querySelector('.webform-editing-note');
      if (note) note.remove();
      closeEditModal();
    }

    function setupWebformSwitcher() {
      if (!webformInner || webformInner.querySelector('.webform-switcher')) return;

      const loginBlock = webformInner.querySelector('.webform-user-login');
      if (!loginBlock) return;

      form.classList.add('webform-panel', 'webform-panel--registration');
      loginBlock.classList.add('webform-panel', 'webform-panel--login');

      const switcher = document.createElement('div');
      switcher.className = 'webform-switcher';
      switcher.setAttribute('aria-label', 'Выбор действия с заявкой');
      switcher.innerHTML = `
        <button type="button" class="webform-switcher-button is-active" data-webform-view="registration" aria-pressed="true">Регистрация</button>
        <button type="button" class="webform-switcher-button" data-webform-view="login" aria-pressed="false">Вход</button>
        <a class="webform-switcher-button" href="${makeProjectUrl('backend/admin.php')}">Админ</a>
      `;

      form.insertAdjacentElement('beforebegin', switcher);

      const activatePanel = (view) => {
        const showRegistration = view === 'registration';
        const showLogin = view === 'login';

        form.hidden = !showRegistration;
        loginBlock.hidden = !showLogin;

        switcher.querySelectorAll('[data-webform-view]').forEach((button) => {
          const isActive = button.dataset.webformView === view;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });
      };

      activateWebformPanel = activatePanel;

      switcher.addEventListener('click', (event) => {
        const button = event.target.closest('[data-webform-view]');
        if (!button) return;

        event.preventDefault();
        activatePanel(button.dataset.webformView);
      });

      activatePanel('registration');
    }

    function addUserLoginBlock() {
      if (!webformInner || webformInner.querySelector('.webform-user-login')) return;

      const block = document.createElement('div');
      block.className = 'webform-user-login';
      block.innerHTML = `
        <h3>Вход для редактирования сохранённой заявки</h3>
        <p>Введите логин и пароль, которые появились после отправки формы.</p>
        <form class="webform-user-login-form" novalidate>
          <div class="webform-user-login-row">
            <input type="text" name="login" placeholder="Логин" autocomplete="username" required>
            <input type="password" name="password" placeholder="Пароль" autocomplete="current-password" required>
            <button type="submit" class="webform-login-button">Войти</button>
          </div>
          <div class="webform-login-status" aria-live="polite"></div>
        </form>
        <button type="button" class="webform-open-edit-modal-button" hidden>Открыть окно редактирования</button>
        <button type="button" class="webform-logout-button" hidden>Выйти из режима редактирования</button>
      `;

      form.insertAdjacentElement('afterend', block);

      const loginForm = block.querySelector('.webform-user-login-form');
      const status = block.querySelector('.webform-login-status');
      const openEditModalButton = block.querySelector('.webform-open-edit-modal-button');
      const logoutButton = block.querySelector('.webform-logout-button');
      let lastLoggedRequest = null;

      const setStatus = (type, text) => {
        status.textContent = text || '';
        status.classList.toggle('is-error', type === 'error');
        status.classList.toggle('is-success', type === 'success');
      };

      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus('', '');

        const login = loginForm.elements.login.value.trim();
        const password = loginForm.elements.password.value;

        if (!login || !password) {
          setStatus('error', 'Введите логин и пароль.');
          return;
        }

        const formData = new FormData();
        formData.set('login', login);
        formData.set('password', password);
        if (csrfInput) formData.set('csrf_token', csrfInput.value);

        const button = loginForm.querySelector('button[type="submit"]');
        const oldText = button.textContent;
        button.disabled = true;
        button.textContent = 'Вход...';

        try {
          const response = await fetch(makeProjectUrl('backend/user_login.php'), {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
          });
          const data = await readJsonResponse(response);
          if (data.csrf_token) setCsrf(data.csrf_token);

          if (!response.ok || !data.ok) {
            setStatus('error', data.message || 'Неверный логин или пароль.');
            return;
          }

          lastLoggedRequest = data.request || null;
          lastEditRequest = lastLoggedRequest;
          fillFormFromRequest(lastLoggedRequest);
          setStatus('success', data.message || 'Вы вошли. Окно редактирования открыто поверх страницы.');
          if (openEditModalButton) openEditModalButton.hidden = false;
          logoutButton.hidden = false;
        } catch (error) {
          setStatus('error', error.message || 'Ошибка входа.');
        } finally {
          button.disabled = false;
          button.textContent = oldText;
        }
      });

      if (openEditModalButton) {
        openEditModalButton.addEventListener('click', () => {
          if (lastEditRequest || lastLoggedRequest) {
            openEditModal(lastEditRequest || lastLoggedRequest);
          } else {
            setStatus('error', 'Сначала войдите по логину и паролю.');
          }
        });
      }

      logoutButton.addEventListener('click', async () => {
        try {
          const response = await fetch(makeProjectUrl('backend/user_logout.php'), {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
          });
          const data = await readJsonResponse(response);
          if (data.csrf_token) setCsrf(data.csrf_token);
        } catch (error) {
          console.warn('Logout error:', error);
        }

        lastLoggedRequest = null;
        lastEditRequest = null;
        resetEditMode();
        clearFormDraft();
        if (openEditModalButton) openEditModalButton.hidden = true;
        logoutButton.hidden = true;
        setStatus('success', 'Вы вышли из режима редактирования.');
      });
    }

    messageBox.addEventListener('click', async (event) => {
      const copyButton = event.target.closest('.webform-copy-button');
      if (!copyButton) return;

      const row = copyButton.closest('.webform-auth-row');
      const value = row ? row.querySelector('.webform-auth-value')?.textContent : '';
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        const oldText = copyButton.textContent;
        copyButton.textContent = 'Скопировано';
        setTimeout(() => { copyButton.textContent = oldText; }, 1200);
      } catch (error) {
        console.warn('Copy failed:', error);
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldErrors();

      const clientErrors = validateFormBeforeSubmit();
      if (Object.keys(clientErrors).length > 0) {
        showFieldErrors(clientErrors);
        showMessage('error', 'Проверьте поля формы.');
        focusFirstInvalidField(clientErrors);
        return;
      }

      const formData = new FormData(form);
      const endpoint = editMode ? 'backend/user_update.php' : (form.getAttribute('action') || 'backend/submit.php');

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = editMode ? 'СОХРАНЯЕМ...' : 'ОТПРАВЛЯЕМ...';
      }

      try {
        const response = await fetch(makeProjectUrl(endpoint), {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' }
        });

        const data = await readJsonResponse(response);
        if (data.csrf_token) setCsrf(data.csrf_token);

        if (!response.ok || !data.ok) {
          if (data.errors) {
            showFieldErrors(data.errors);
            focusFirstInvalidField(data.errors);
          }
          showMessage('error', escapeHtml(data.message || 'Не удалось отправить форму.'));
          resetRecaptcha();
          return;
        }

        if (editMode) {
          showMessage('success', escapeHtml(data.message || 'Заявка успешно обновлена.'));
          if (data.request) fillFormFromRequest(data.request);
        } else {
          showMessage('success', renderAuthSuccess(data));
          suppressDraftSave = true;
          form.reset();
          clearFormDraft();
          resetEditMode();
          window.setTimeout(() => { suppressDraftSave = false; }, 0);
        }

        resetRecaptcha();
      } catch (error) {
        showMessage('error', escapeHtml(error.message || 'Ошибка соединения с сервером.'));
        resetRecaptcha();
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = editMode ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : defaultButtonText;
        }
      }
    });

    addUserLoginBlock();
    setupWebformSwitcher();
    loadCsrf();
    initFormDraftStorage();
  }

  onReady(() => {
    initMenu();
    initReviews();
    initBackendForm();
  });
})();
