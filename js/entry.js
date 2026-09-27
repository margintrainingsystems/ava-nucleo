// ============================================================
// NÚCLEO — Entrada: con sesión va al panel, sin sesión al login
// (el panel igual verifica que la cuenta sea administradora).
// ============================================================
(function () {
  'use strict';
  if (typeof supabaseClient === 'undefined') return;
  supabaseClient.auth
    .getSession()
    .then(({ data }) => window.location.replace(data && data.session ? '/panel.html' : '/login.html'))
    .catch(() => window.location.replace('/login.html'));
})();
