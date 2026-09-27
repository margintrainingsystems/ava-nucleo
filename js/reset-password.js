// ============================================================
// NÚCLEO — Elegir contraseña nueva (link del email de recuperación)
// ============================================================
(function () {
  'use strict';
  const form = document.getElementById('reset-form');
  const errorEl = document.getElementById('reset-error');
  const successEl = document.getElementById('reset-success');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('is-shown');
    successEl.classList.remove('is-shown');
    if (typeof supabaseClient === 'undefined') return;

    const password = document.getElementById('reset-password').value;
    const confirmation = document.getElementById('reset-password-confirm').value;
    if (password !== confirmation) {
      errorEl.textContent = 'Las contraseñas no coinciden.';
      errorEl.classList.add('is-shown');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando…';
    let error = null;
    try {
      ({ error } = await supabaseClient.auth.updateUser({ password }));
    } catch (err) {
      error = err;
    }
    btn.disabled = false;
    btn.textContent = 'Guardar nueva contraseña';

    if (error) {
      errorEl.textContent = 'No pudimos actualizar la contraseña. El link puede haber vencido: pedí uno nuevo desde "¿Olvidaste tu contraseña?".';
      errorEl.classList.add('is-shown');
      return;
    }
    successEl.classList.add('is-shown');
    form.reset();
    setTimeout(() => window.location.replace('/panel.html'), 1400);
  });
})();
