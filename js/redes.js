// ============================================================
// NÚCLEO — Redes sociales
// Se muestran en el pie de todas las páginas y en Contacto, en este
// orden, y también se informan a Google como perfiles oficiales.
// ============================================================
(function () {
  'use strict';
  const esc = window.nucleoEsc;
  const URL_OK = /^https:\/\/\S+$/i;

  window.nucleoListEditor({
    table: 'social_links',
    listEl: document.getElementById('social-list'),
    addBtn: document.getElementById('add-social-btn'),
    itemName: 'red',
    newTitle: 'Red nueva',
    emptyText: 'Todavía no cargaste ninguna red. Mientras no haya, el sitio no muestra el bloque de redes.',
    savedText: 'Red guardada. Ya se ve en el sitio.',
    deletedText: 'Red eliminada del sitio.',
    fields: [
      {
        name: 'name',
        label: 'Nombre de la red',
        required: true,
        attrs: 'maxlength="40" list="redes-sugeridas" placeholder="Ej: Instagram"',
        hint: 'Es el texto del link en el sitio. Podés elegir una de la lista o escribir otra.',
      },
      {
        name: 'url',
        label: 'Link al perfil',
        type: 'url',
        required: true,
        attrs: 'maxlength="500" inputmode="url" placeholder="https://www.instagram.com/tu-cuenta"',
        hint: 'El link completo, empezando con https://',
      },
    ],
    title: (s) => esc(s.name),
    sub: (s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="row-link">${esc(s.url)}<span class="visually-hidden"> (se abre en otra pestaña)</span></a>`,
    fromForm: (v) => {
      const url = v.url.trim();
      if (!URL_OK.test(url)) return { error: { field: 'url', message: 'Tiene que ser un link completo que empiece con https://' } };
      return { name: v.name.trim(), url };
    },
    newItem: () => ({ name: '', url: '' }),
    deleteText: (s) => `¿Eliminar ${s.name} del sitio?`,
  });
})();
