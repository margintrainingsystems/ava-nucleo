// ============================================================
// NÚCLEO — Iniciar sesión y recuperar la contraseña
// (No hay alta de cuentas desde acá: el acceso es solo para la
// cuenta administradora que ya existe.)
// ============================================================
(function () {
  'use strict';
  if (typeof supabaseClient === 'undefined') return;

  const loginError = document.getElementById('login-error');
  const forgotError = document.getElementById('forgot-error');
  const forgotSuccess = document.getElementById('forgot-success');

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('is-shown');
  }
  function hideError(el) {
    el.classList.remove('is-shown');
  }
  function busy(btn, isBusy, label) {
    btn.disabled = isBusy;
    btn.textContent = label;
  }

  // Motivo por el que se volvió al login (lo manda el guardián del panel).
  const reason = new URLSearchParams(window.location.search).get('motivo');
  if (reason === 'sin-permiso') {
    showError(loginError, 'Esa cuenta no tiene permiso para entrar a Núcleo.');
  }

  // Con sesión activa se salta directo al panel (que verifica el permiso).
  if (reason !== 'sin-permiso') {
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data && data.session) window.location.replace('/panel.html');
    });
  }

  function showView(name) {
    document.querySelectorAll('.auth-view').forEach((v) => {
      v.classList.toggle('is-active', v.dataset.view === name);
    });
    const first = document.querySelector(`.auth-view[data-view="${name}"] input`);
    if (first) first.focus();
  }
  document.querySelectorAll('[data-show-view]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.showView));
  });

  // ---------- Iniciar sesión ----------
  const loginForm = document.getElementById('login-form');
  const loginBtn = loginForm.querySelector('button[type="submit"]');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(loginError);
    busy(loginBtn, true, 'Entrando…');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    let error = null;
    try {
      ({ error } = await supabaseClient.auth.signInWithPassword({ email, password }));
    } catch (err) {
      error = { status: 0 };
    }
    busy(loginBtn, false, 'Iniciar sesión');
    if (error) {
      // 400 = datos incorrectos; cualquier otra cosa suele ser conexión o servicio.
      showError(
        loginError,
        error.status === 400 ? 'Email o contraseña incorrectos.' : 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'
      );
      return;
    }
    window.location.replace('/panel.html');
  });

  // ---------- Olvidé mi contraseña ----------
  const forgotForm = document.getElementById('forgot-form');
  const forgotBtn = forgotForm.querySelector('button[type="submit"]');
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(forgotError);
    forgotSuccess.classList.remove('is-shown');
    busy(forgotBtn, true, 'Enviando…');
    const email = document.getElementById('forgot-email').value.trim();

    let error = null;
    try {
      ({ error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
      }));
    } catch (err) {
      error = err;
    }
    busy(forgotBtn, false, 'Enviar link de recuperación');
    if (error) {
      showError(forgotError, 'No pudimos enviar el link. Probá de nuevo en un momento.');
      return;
    }
    forgotSuccess.classList.add('is-shown');
    forgotForm.reset();
  });
})();
