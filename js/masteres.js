// ============================================================
// NÚCLEO — Másteres: ordenar, editar, agregar y eliminar
// Lo que se guarda acá se ve en el home, en la propuesta académica,
// en el desglose de precios y en el formulario de reseñas.
// ============================================================
(function () {
  'use strict';

  const esc = window.nucleoEsc;
  const COLORS = [
    { value: 'accent-1', label: 'Acento 1 (azulado)' },
    { value: 'accent-2', label: 'Acento 2 (violáceo)' },
    { value: 'accent-3', label: 'Acento 3 (naranja)' },
  ];
  const colorLabel = (token) => (COLORS.find((c) => c.value === token) || { label: 'Según su posición' }).label.replace(/ \(.*\)/, '');
  let currency = 'USD';

  supabaseClient
    .from('pricing_plan')
    .select('currency')
    .eq('id', 1)
    .maybeSingle()
    .then(({ data }) => {
      if (data && data.currency) currency = data.currency;
    });

  window.nucleoListEditor({
    table: 'masters',
    listEl: document.getElementById('masters-list'),
    addBtn: document.getElementById('add-master-btn'),
    itemName: 'Máster',
    newTitle: 'Máster nuevo',
    emptyText: 'Todavía no hay Másteres cargados.',
    savedText: 'Máster guardado. Ya se ve en el sitio.',
    deletedText: 'Máster eliminado del sitio.',
    fields: [
      { name: 'name', label: 'Nombre del Máster', required: true, attrs: 'maxlength="120"', hint: 'Sin la palabra "Máster": el sitio la agrega sola.' },
      { name: 'price', label: 'Precio individual por año (si se compra por separado)', type: 'number', required: true, attrs: 'min="0" step="1" style="max-width:180px;"' },
      { name: 'description', label: 'Descripción corta', type: 'textarea', required: true },
      {
        name: 'topics',
        label: 'Temas incluidos',
        type: 'textarea',
        attrs: 'style="min-height:140px;" placeholder="Excel :: Desde cero, la base para ordenar y calcular cualquier información."',
        hint: 'Un tema por renglón. Si querés sumar una descripción, separala del nombre con "::" (dos veces dos puntos).',
      },
      {
        name: 'color_token',
        label: 'Color de acento',
        type: 'select',
        options: COLORS,
        hint: 'Son 3 colores que rotan: así sumar Másteres nunca obliga a inventar colores nuevos. El verde queda reservado para la marca.',
      },
    ],
    title: (m, i) => `${String(i + 1).padStart(2, '0')} · ${esc(m.name)}`,
    sub: (m) => esc(m.description),
    meta: (m) => {
      const n = (m.topics || []).length;
      return `${n} ${n === 1 ? 'tema' : 'temas'} · ${esc(currency)} ${esc(m.price)}/año · ${esc(colorLabel(m.color_token))}`;
    },
    toForm: (m) =>
      Object.assign({}, m, {
        topics: (m.topics || []).map((t) => (typeof t === 'string' ? t : t.description ? `${t.name} :: ${t.description}` : t.name)).join('\n'),
      }),
    fromForm: (v) => {
      const price = Number(v.price);
      if (!Number.isFinite(price) || price < 0) return { error: { field: 'price', message: 'Poné un precio válido (0 o más).' } };
      const topics = v.topics
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, ...rest] = line.split('::');
          return { name: name.trim(), description: rest.join('::').trim() };
        });
      return { name: v.name.trim(), price, description: v.description.trim(), topics, color_token: v.color_token };
    },
    // El color nuevo sigue la rotación de los 3 acentos.
    newItem: (items) => ({ name: '', price: '', description: '', topics: [], color_token: COLORS[items.length % COLORS.length].value }),
    deleteText: (m) => `¿Eliminar el Máster "${m.name}"? Deja de verse en todo el sitio y no se puede deshacer.`,
  });
})();
