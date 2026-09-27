// ============================================================
// NÚCLEO — Comportamiento compartido del panel
// ============================================================
(function () {
  'use strict';

  /* ---------- Utilidades compartidas ---------- */
  // Todo lo que llega de la base se escapa antes de insertarlo en la página.
  window.nucleoEsc = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ---------- Aviso breve ----------
     La región "status" existe desde el principio: los lectores de pantalla
     solo anuncian cambios en regiones que ya estaban en la página. */
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let toastTimer = null;
  window.nucleoToast = function (message) {
    toast.textContent = message;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 3600);
  };

  /* ---------- Cambios sin guardar ----------
     Cada página marca si tiene algo sin guardar; si se intenta salir,
     el navegador pregunta antes. */
  const dirtySources = new Set();
  window.nucleoSetDirty = function (source, isDirty) {
    if (isDirty) dirtySources.add(source);
    else dirtySources.delete(source);
  };
  window.addEventListener('beforeunload', (e) => {
    if (!dirtySources.size) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ---------- Menú lateral en pantallas chicas ---------- */
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    const setOpen = (open) => {
      sidebar.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Link activo del menú ----------
     Funciona con y sin ".html" en la dirección. */
  const pageName = (path) => (path.split('/').pop() || 'panel').replace(/\.html$/, '') || 'panel';
  const current = pageName(window.location.pathname);
  document.querySelectorAll('.sidebar-nav a').forEach((a) => {
    if (pageName(a.getAttribute('href')) === current) a.setAttribute('aria-current', 'page');
  });

  /* ---------- Links al sitio público ---------- */
  if (typeof NUCLEO_SITE_URL !== 'undefined') {
    document.querySelectorAll('[data-site-link]').forEach((a) => {
      a.href = NUCLEO_SITE_URL + (a.dataset.siteLink || '/');
    });
  }

  /* ---------- Cerrar sesión ---------- */
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (typeof supabaseClient !== 'undefined') await supabaseClient.auth.signOut();
      window.location.replace('/login.html');
    });
  });

  /* ---------- Contadores del menú: mensajes sin leer y reseñas por revisar ---------- */
  window.nucleoRefreshBadges = async function () {
    const counts = [
      ['mensajes', supabaseClient.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'nuevo')],
      ['resenas', supabaseClient.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pendiente')],
    ];
    await Promise.all(
      counts.map(async ([name, query]) => {
        const badge = document.querySelector(`[data-badge="${name}"]`);
        if (!badge) return;
        try {
          const { count, error } = await query;
          const n = error ? 0 : count || 0;
          const label = name === 'mensajes' ? 'sin leer' : 'por revisar';
          badge.innerHTML = `${n > 99 ? '99+' : n}<span class="visually-hidden"> ${label}</span>`;
          badge.hidden = n === 0;
        } catch (e) {
          badge.hidden = true;
        }
      })
    );
  };

  /* ---------- Cuenta en la barra superior ---------- */
  if (window.nucleoReady) {
    window.nucleoReady.then((session) => {
      if (!session) return;
      const email = session.user.email || '';
      document.querySelectorAll('[data-account-email]').forEach((el) => (el.textContent = email));
      document.querySelectorAll('[data-account-initial]').forEach((el) => (el.textContent = email.charAt(0).toUpperCase()));
      document.body.classList.remove('auth-pending');
      window.nucleoRefreshBadges();
    });
  }
})();
