// ============================================================
// NÚCLEO — Emails de contacto por área
// El primero de la lista es el email principal del sitio (Privacidad,
// datos para Google y cualquier link de email general).
// ============================================================
(function () {
  'use strict';
  const esc = window.nucleoEsc;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // El sitio usa como principal el primer email válido de la lista.
  let primaryId = null;

  window.nucleoListEditor({
    table: 'email_contacts',
    listEl: document.getElementById('email-list'),
    addBtn: document.getElementById('add-area-btn'),
    itemName: 'área',
    newTitle: 'Área nueva',
    emptyText: 'Todavía no agregaste ninguna dirección. Mientras tanto, el sitio muestra la del texto original.',
    savedText: 'Email guardado. Ya se ve en el sitio.',
    deletedText: 'Área eliminada.',
    fields: [
      { name: 'area', label: 'Nombre del área', required: true, attrs: 'maxlength="80" placeholder="Ej: Suscripción y pagos"' },
      { name: 'email', label: 'Email', type: 'email', required: true, attrs: 'maxlength="320" placeholder="hola@aprendeconava.com"' },
    ],
    onLoad: (items) => {
      const first = items.find((c) => EMAIL.test(c.email || ''));
      primaryId = first ? first.id : null;
    },
    title: (c) => `${esc(c.area)}${c.id === primaryId ? ' <span class="row-note">· email principal</span>' : ''}`,
    sub: (c) => esc(c.email),
    fromForm: (v) => {
      const email = v.email.trim();
      if (!EMAIL.test(email)) return { error: { field: 'email', message: 'Revisá el email: parece incompleto.' } };
      return { area: v.area.trim(), email };
    },
    newItem: () => ({ area: '', email: '' }),
    deleteText: (c) => `¿Eliminar el email de "${c.area}"?`,
  });
})();
