// ============================================================
// NÚCLEO — Ajustes: cambiar la contraseña
// ============================================================
(function () {
  'use strict';

  const form = document.getElementById('password-form');
  const errorEl = document.getElementById('pw-error');
  const successEl = document.getElementById('pw-success');
  const btn = document.getElementById('pw-save');

  function fail(message) {
    errorEl.textContent = message;
    errorEl.classList.add('is-shown');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('is-shown');
    successEl.classList.remove('is-shown');

    const pw1 = document.getElementById('pw-new').value;
    const pw2 = document.getElementById('pw-confirm').value;
    if (pw1.length < 8) return fail('La contraseña tiene que tener al menos 8 caracteres.');
    if (pw1 !== pw2) return fail('Las contraseñas no coinciden.');

    btn.disabled = true;
    btn.textContent = 'Guardando…';
    let error = null;
    try {
      ({ error } = await supabaseClient.auth.updateUser({ password: pw1 }));
    } catch (err) {
      error = err;
    }
    btn.disabled = false;
    btn.textContent = 'Actualizar contraseña';
    if (error) return fail('No pudimos actualizar la contraseña. Probá de nuevo en un momento.');
    successEl.classList.add('is-shown');
    form.reset();
  });
})();
