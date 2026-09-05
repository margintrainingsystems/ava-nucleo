// ============================================================
// NÚCLEO — Guardián de sesión
// Incluir DESPUÉS de supabase-client.js en toda página protegida.
// Redirige a login.html si no hay sesión activa.
// ============================================================
(function () {
  'use strict';

  window.nucleoReady = supabaseClient.auth.getSession().then(({ data }) => {
    if (!data.session) {
      window.location.href = '/login.html';
      return null;
    }
    document.documentElement.classList.add('is-authed');
    return data.session;
  });

  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = '/login.html';
    }
  });
})();
