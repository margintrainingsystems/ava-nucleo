// ============================================================
// NÚCLEO — Login, recuperación de contraseña y alta inicial
// ============================================================
(function () {
  'use strict';

  // Si ya hay sesión activa, saltar directo al panel.
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = '/panel.html';
  });

  function showView(name) {
    document.querySelectorAll('.auth-view').forEach((v) => {
      v.classList.toggle('is-active', v.dataset.view === name);
    });
  }

  document.querySelectorAll('[data-show-view]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.showView));
  });

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('is-shown');
  }
  function hideError(el) {
    el.classList.remove('is-shown');
  }

  // ---------- Login ----------
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(loginError);
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showError(loginError, 'Email o contraseña incorrectos.');
      return;
    }
    window.location.href = '/panel.html';
  });

  // ---------- Olvidé mi contraseña ----------
  const forgotForm = document.getElementById('forgot-form');
  const forgotError = document.getElementById('forgot-error');
  const forgotSuccess = document.getElementById('forgot-success');
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(forgotError);
    forgotSuccess.classList.remove('is-shown');
    const email = document.getElementById('forgot-email').value.trim();

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html',
    });
    if (error) {
      showError(forgotError, 'No pudimos enviar el link. Probá de nuevo en un momento.');
      return;
    }
    forgotSuccess.classList.add('is-shown');
    forgotForm.reset();
  });

  // ---------- Alta inicial (uso único) ----------
  const setupForm = document.getElementById('setup-form');
  const setupError = document.getElementById('setup-error');
  const setupSuccess = document.getElementById('setup-success');
  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(setupError);
    setupSuccess.classList.remove('is-shown');
    const email = document.getElementById('setup-email').value.trim();
    const password = document.getElementById('setup-password').value;

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      showError(setupError, error.message || 'No pudimos crear la cuenta.');
      return;
    }
    setupSuccess.classList.add('is-shown');
    setupForm.reset();
    if (data.session) {
      setTimeout(() => (window.location.href = '/panel.html'), 900);
    }
  });
})();
