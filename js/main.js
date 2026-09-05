// ============================================================
// NÚCLEO — Comportamiento compartido del panel
// ============================================================
(function () {
  'use strict';

  /* Toast reutilizable */
  let toastTimer = null;
  window.nucleoToast = function (message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 3600);
  };

  /* Sidebar mobile */
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('is-open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('is-open');
      }
    });
  }

  /* Marcar link activo según la página actual */
  const current = window.location.pathname.split('/').pop() || 'panel.html';
  document.querySelectorAll('.sidebar-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('is-active');
  });

  /* Logout */
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = '/login.html';
    });
  });

  /* Mostrar el email de la cuenta logueada donde corresponda */
  if (window.nucleoReady) {
    window.nucleoReady.then((session) => {
      if (!session) return;
      const email = session.user.email || '';
      document.querySelectorAll('[data-account-email]').forEach((el) => {
        el.textContent = email;
      });
      document.querySelectorAll('[data-account-initial]').forEach((el) => {
        el.textContent = email.charAt(0).toUpperCase();
      });
      document.body.classList.remove('auth-pending');
    });
  }
})();
