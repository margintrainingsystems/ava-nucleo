// ============================================================
// NÚCLEO — Guardián de sesión
// Va después de supabase-client.js en toda página protegida.
// window.nucleoReady se resuelve con la sesión solo si la cuenta es
// administradora; si no hay sesión (o la cuenta no es admin), vuelve
// al login y se resuelve con null.
// ============================================================
(function () {
  'use strict';

  if (typeof supabaseClient === 'undefined') {
    window.nucleoReady = Promise.resolve(null);
    return;
  }

  // Una sola redirección, aunque la pidan dos caminos a la vez
  // (por ejemplo, el cierre de sesión de una cuenta sin permiso).
  let leaving = false;
  function toLogin(reason) {
    if (!leaving) {
      leaving = true;
      window.location.replace('/login.html' + (reason ? `?motivo=${reason}` : ''));
    }
    return null;
  }

  // Si falla la conexión no mandamos al login (la sesión puede estar bien):
  // se avisa en pantalla y se ofrece reintentar.
  function connectionError() {
    const show = () => {
      document.body.classList.remove('auth-pending');
      document.body.innerHTML =
        '<main class="auth-shell"><div class="auth-card" role="alert">' +
        '<h1>No pudimos verificar tu sesión</h1>' +
        '<p class="body-md">Puede ser la conexión a internet o que la base esté tardando en responder.</p>' +
        '<button type="button" class="btn btn-solid" style="width:100%; margin-top:24px;" data-retry>Reintentar</button>' +
        '</div></main>';
      document.querySelector('[data-retry]').addEventListener('click', () => window.location.reload());
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
    else show();
    return null;
  }

  window.nucleoReady = supabaseClient.auth
    .getSession()
    .then(async ({ data }) => {
      const session = data && data.session;
      if (!session) return toLogin();

      // Tener cuenta no alcanza: tiene que estar en la tabla "admins".
      const { data: admin, error } = await supabaseClient
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (error) return connectionError();
      if (!admin) {
        toLogin('sin-permiso');
        await supabaseClient.auth.signOut();
        return null;
      }
      return session;
    })
    .catch(connectionError);

  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') toLogin();
  });
})();
