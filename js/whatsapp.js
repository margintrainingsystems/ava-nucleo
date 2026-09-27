// ============================================================
// NÚCLEO — Números de WhatsApp por área
// El primero de la lista es el del botón flotante del sitio.
// ============================================================
(function () {
  'use strict';
  const esc = window.nucleoEsc;
  const digits = (s) => String(s || '').replace(/\D/g, '');
  // El botón flotante del sitio usa el primer número válido de la lista.
  let floatId = null;

  window.nucleoListEditor({
    table: 'whatsapp_contacts',
    listEl: document.getElementById('whatsapp-list'),
    addBtn: document.getElementById('add-area-btn'),
    itemName: 'área',
    newTitle: 'Área nueva',
    emptyText: 'Todavía no agregaste ningún número. Sin números, el sitio no muestra WhatsApp.',
    savedText: 'Número guardado. Ya se ve en el sitio.',
    deletedText: 'Área eliminada.',
    fields: [
      { name: 'area', label: 'Nombre del área', required: true, attrs: 'maxlength="80" placeholder="Ej: Suscripción y pagos"' },
      {
        name: 'phone',
        label: 'Número de WhatsApp',
        type: 'tel',
        attrs: 'inputmode="tel" placeholder="54 9 11 0000 0000"',
        hint: 'Con código de país. Podés escribirlo con espacios o guiones: se guardan solo los números. Sin número, el área no se muestra en el sitio.',
      },
      { name: 'message', label: 'Mensaje que aparece escrito al abrir el chat', attrs: 'maxlength="200" placeholder="¡Hola! Quería hacer una consulta."' },
    ],
    onLoad: (items) => {
      const first = items.find((c) => digits(c.phone).length >= 8);
      floatId = first ? first.id : null;
    },
    title: (c) => `${esc(c.area)}${c.id === floatId ? ' <span class="row-note">· botón flotante del sitio</span>' : ''}`,
    sub: (c) => (digits(c.phone).length >= 8 ? `+${esc(digits(c.phone))}` : '<span class="row-warning">Sin número válido: no se muestra en el sitio</span>'),
    meta: (c) => (c.message ? `"${esc(c.message)}"` : 'Sin mensaje predefinido'),
    fromForm: (v) => {
      const phone = digits(v.phone);
      if (phone && phone.length < 8) return { error: { field: 'phone', message: 'El número tiene que tener al menos 8 dígitos, con el código de país.' } };
      return { area: v.area.trim(), phone, message: v.message.trim() };
    },
    newItem: () => ({ area: '', phone: '', message: '' }),
    deleteText: (c) => `¿Eliminar el WhatsApp de "${c.area}"?`,
  });
})();
