// ============================================================
// NÚCLEO — Preguntas frecuentes (página de Suscripción)
// ============================================================
(function () {
  'use strict';
  const esc = window.nucleoEsc;
  const plain = (html) => String(html || '').replace(/<[^>]+>/g, '');

  window.nucleoListEditor({
    table: 'faq_items',
    listEl: document.getElementById('faq-list'),
    addBtn: document.getElementById('add-faq-btn'),
    itemName: 'pregunta',
    newTitle: 'Pregunta nueva',
    emptyText: 'Todavía no hay preguntas cargadas.',
    savedText: 'Pregunta guardada. Ya se ve en el sitio.',
    deletedText: 'Pregunta eliminada.',
    fields: [
      { name: 'question', label: 'Pregunta', required: true, attrs: 'maxlength="200"' },
      {
        name: 'answer',
        label: 'Respuesta',
        type: 'textarea',
        required: true,
        attrs: 'style="min-height:110px;"',
        hint: 'Escribí <strong>{garantia}</strong> para mostrar los días de garantía de Precios, y <strong>{cantidad}</strong> para la cantidad de Másteres. *texto* se ve en cursiva.',
      },
    ],
    title: (f) => esc(f.question),
    sub: (f) => esc(plain(f.answer)),
    fromForm: (v) => ({ question: v.question.trim(), answer: v.answer.trim() }),
    newItem: () => ({ question: '', answer: '' }),
    deleteText: (f) => `¿Eliminar la pregunta "${f.question}"? No se puede deshacer.`,
  });
})();
