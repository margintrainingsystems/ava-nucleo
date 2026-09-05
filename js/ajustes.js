// ============================================================
// NÚCLEO — Ajustes: cambiar contraseña
// ============================================================
(function () {
  'use strict';

  const form = document.getElementById('password-form');
  const errorEl = document.getElementById('pw-error');
  const successEl = document.getElementById('pw-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('is-shown');
    successEl.classList.remove('is-shown');

    const pw1 = document.getElementById('pw-new').value;
    const pw2 = document.getElementById('pw-confirm').value;

    if (pw1 !== pw2) {
      errorEl.textContent = 'Las contraseñas no coinciden.';
      errorEl.classList.add('is-shown');
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: pw1 });
    if (error) {
      errorEl.textContent = 'No pudimos actualizar la contraseña. Probá de nuevo.';
      errorEl.classList.add('is-shown');
      return;
    }
    successEl.classList.add('is-shown');
    form.reset();
    window.nucleoToast('Contraseña actualizada.');
  });
})();
