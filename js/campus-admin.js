// ============================================================
// NÚCLEO — Cursos del Campus: cursos, módulos, clases y materiales
// Lo que se guarda acá lo ven los alumnos en el Campus (repo ava-campus).
// Cada texto es { es, en, pt }: el español es obligatorio; si falta otro
// idioma, el Campus muestra el español. La base solo deja editar a las
// cuentas de Núcleo.
// ============================================================
(function () {
  'use strict';

  const esc = window.nucleoEsc;
  const LANGS = [
    { code: 'es', label: 'español' },
    { code: 'en', label: 'inglés' },
    { code: 'pt', label: 'portugués' },
  ];

  /* ---------- Textos en tres idiomas ---------- */
  // Tres campos (nombre_es, nombre_en, nombre_pt) para un texto traducible.
  function i18nFields(name, label, opts) {
    const o = opts || {};
    return LANGS.map((l) => ({
      name: `${name}_${l.code}`,
      label: `${label} (${l.label})`,
      type: o.type || 'text',
      required: Boolean(o.required) && l.code === 'es',
      attrs: o.attrs || '',
      hint: l.code === 'es' ? o.hint : undefined,
    }));
  }

  function toI18nForm(value, name) {
    const out = {};
    LANGS.forEach((l) => (out[`${name}_${l.code}`] = (value && value[l.code]) || ''));
    return out;
  }

  // Solo guarda los idiomas con texto: un idioma vacío usa el español.
  function fromI18nForm(values, name) {
    const out = {};
    LANGS.forEach((l) => {
      const v = String(values[`${name}_${l.code}`] || '').trim();
      if (v) out[l.code] = v;
    });
    return out;
  }

  const es = (value) => (value && value.es) || '';
  const missingLangs = (value) =>
    LANGS.filter((l) => l.code !== 'es' && !(value && value[l.code])).map((l) => l.label);
  const translationMeta = (...values) => {
    const missing = new Set();
    values.forEach((v) => missingLangs(v).forEach((m) => missing.add(m)));
    return missing.size ? `Falta en ${[...missing].join(' y ')}` : 'En los tres idiomas';
  };

  /* ---------- Formatos ---------- */
  // "Excel desde cero" → "excel-desde-cero"
  function slugify(text) {
    return String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '');
  }
  const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  // Acepta el link de YouTube en cualquiera de sus formas, o solo el código de 11 caracteres.
  function youtubeId(input) {
    const v = String(input || '').trim();
    if (!v) return '';
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // "8:30" → 510 · "1:05:00" → 3900 · "12" (minutos) → 720
  function parseDuration(input) {
    const v = String(input || '').trim();
    if (!v) return null;
    if (/^\d+$/.test(v)) return Number(v) * 60;
    const parts = v.split(':');
    if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return undefined;
    const nums = parts.map(Number);
    if (nums.slice(1).some((n) => n > 59)) return undefined;
    return nums.reduce((acc, n) => acc * 60 + n, 0);
  }
  function formatDuration(seconds) {
    if (seconds == null) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  const PUBLISHED = [
    { value: 'false', label: 'No: borrador (solo lo ven las cuentas de Núcleo)' },
    { value: 'true', label: 'Sí: lo ven los alumnos con acceso' },
  ];

  /* ---------- Selectores ---------- */
  const coursePicker = document.getElementById('course-picker');
  const modulePicker = document.getElementById('module-picker');
  const lessonPicker = document.getElementById('lesson-picker');

  function fillPicker(select, items, placeholder, label) {
    const current = select.value;
    select.innerHTML =
      `<option value="">${esc(placeholder)}</option>` +
      items.map((item, i) => `<option value="${esc(item.id)}">${esc(label(item, i))}</option>`).join('');
    if (items.some((item) => String(item.id) === current)) select.value = current;
    return select.value !== current;
  }

  // Cambiar de curso, módulo o clase cierra los formularios abiertos más abajo.
  function confirmLeave(listIds) {
    const open = listIds.some((id) => document.querySelector(`#${id} .edit-form`));
    return !open || window.confirm('Hay un formulario abierto más abajo. Si seguís, se pierde lo que no guardaste. ¿Seguir?');
  }

  function guardPicker(select, listIds, onChange) {
    let previous = select.value;
    select.addEventListener('focus', () => (previous = select.value));
    select.addEventListener('change', () => {
      if (!confirmLeave(listIds)) {
        select.value = previous;
        return;
      }
      previous = select.value;
      onChange();
    });
  }

  /* ---------- Arranque: primero los Másteres (para elegir a cuál pertenece cada curso) ---------- */
  window.nucleoReady.then(async (session) => {
    if (!session) return;
    const { data: masters, error } = await supabaseClient.from('masters').select('id, name, order_index').order('order_index');
    if (error || !masters) {
      document.getElementById('courses-list').innerHTML =
        '<div class="empty-state">No pudimos cargar los Másteres. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    const masterName = (id) => {
      const m = masters.find((x) => x.id === id);
      return m ? `Máster ${m.name}` : 'Curso de regalo (solo suscripción anual)';
    };

    /* ----- Cursos ----- */
    window.nucleoListEditor({
      table: 'campus_courses',
      orderField: 'position',
      listEl: document.getElementById('courses-list'),
      addBtn: document.getElementById('add-course-btn'),
      itemName: 'Curso',
      newTitle: 'Curso nuevo',
      emptyText: 'Todavía no hay cursos. Agregá el primero.',
      savedText: 'Curso guardado.',
      deletedText: 'Curso eliminado del Campus.',
      fields: [
        ...i18nFields('title', 'Nombre del curso', { required: true, attrs: 'maxlength="160"' }),
        ...i18nFields('summary', 'Descripción corta', { type: 'textarea', attrs: 'maxlength="1000"' }),
        {
          name: 'master_id',
          label: 'Máster',
          type: 'select',
          options: [
            ...masters.map((m) => ({ value: m.id, label: `Máster ${m.name}` })),
            { value: '', label: 'Curso de regalo (solo suscripción anual)' },
          ],
          hint: 'Quien compra ese Máster suelto ve el curso. La suscripción anual ve todos.',
        },
        {
          name: 'slug',
          label: 'Dirección en el Campus',
          attrs: 'maxlength="80" placeholder="excel-desde-cero"',
          hint: 'Minúsculas, números y guiones. Si la dejás vacía, se arma con el nombre. Cambiarla rompe los links que ya se compartieron.',
        },
        { name: 'published', label: 'Publicado', type: 'select', options: PUBLISHED },
      ],
      title: (c, i) => `${String(i + 1).padStart(2, '0')} · ${esc(es(c.title))}`,
      sub: (c) => esc(masterName(c.master_id)),
      meta: (c) =>
        `${c.published ? 'Publicado' : 'Borrador'} · /cursos/${esc(c.slug)} · ${esc(translationMeta(c.title, c.summary))}`,
      toForm: (c) =>
        Object.assign(
          {},
          toI18nForm(c.title, 'title'),
          toI18nForm(c.summary, 'summary'),
          { master_id: c.master_id || '', slug: c.slug || '', published: String(Boolean(c.published)) },
        ),
      fromForm: (v) => {
        const title = fromI18nForm(v, 'title');
        const slug = v.slug.trim() ? v.slug.trim().toLowerCase() : slugify(title.es || '');
        if (!slug || !SLUG_RE.test(slug)) {
          return { error: { field: 'slug', message: 'Usá solo minúsculas sin acentos, números y guiones (por ejemplo, excel-desde-cero).' } };
        }
        return {
          title,
          summary: fromI18nForm(v, 'summary'),
          master_id: v.master_id || null,
          slug,
          published: v.published === 'true',
        };
      },
      newItem: () => ({ title: {}, summary: {}, master_id: masters[0] ? masters[0].id : '', slug: '', published: false }),
      deleteText: (c) =>
        `¿Eliminar el curso "${es(c.title)}"? Se borran también sus módulos, clases, materiales y el progreso de los alumnos. No se puede deshacer.`,
      onLoad: (courses) => {
        const changed = fillPicker(coursePicker, courses, 'Elegí un curso', (c) => es(c.title));
        if (changed) modules.reload();
      },
    });

    /* ----- Módulos del curso elegido ----- */
    const modules = window.nucleoListEditor({
      table: 'campus_modules',
      orderField: 'position',
      listEl: document.getElementById('modules-list'),
      addBtn: document.getElementById('add-module-btn'),
      itemName: 'Módulo',
      newTitle: 'Módulo nuevo',
      emptyText: 'Este curso todavía no tiene módulos.',
      pickText: 'Elegí un curso para ver sus módulos.',
      savedText: 'Módulo guardado.',
      deletedText: 'Módulo eliminado.',
      filter: () => (coursePicker.value ? { column: 'course_id', value: coursePicker.value } : null),
      fields: i18nFields('title', 'Nombre del módulo', { required: true, attrs: 'maxlength="160"' }),
      title: (m, i) => `Módulo ${i + 1} · ${esc(es(m.title))}`,
      meta: (m) => esc(translationMeta(m.title)),
      toForm: (m) => toI18nForm(m.title, 'title'),
      fromForm: (v) => ({ title: fromI18nForm(v, 'title') }),
      newItem: () => ({ title: {} }),
      deleteText: (m) => `¿Eliminar el módulo "${es(m.title)}" con todas sus clases? No se puede deshacer.`,
      onLoad: (items) => {
        const changed = fillPicker(modulePicker, items, 'Elegí un módulo', (m, i) => `Módulo ${i + 1} · ${es(m.title)}`);
        if (changed) lessons.reload();
      },
    });

    /* ----- Clases del módulo elegido ----- */
    const lessons = window.nucleoListEditor({
      table: 'campus_lessons',
      orderField: 'position',
      listEl: document.getElementById('lessons-list'),
      addBtn: document.getElementById('add-lesson-btn'),
      itemName: 'Clase',
      newTitle: 'Clase nueva',
      emptyText: 'Este módulo todavía no tiene clases.',
      pickText: 'Elegí un módulo para ver sus clases.',
      savedText: 'Clase guardada.',
      deletedText: 'Clase eliminada.',
      filter: () => (modulePicker.value ? { column: 'module_id', value: modulePicker.value } : null),
      fields: [
        ...i18nFields('title', 'Nombre de la clase', { required: true, attrs: 'maxlength="160"' }),
        {
          name: 'youtube',
          label: 'Video de YouTube',
          attrs: 'placeholder="https://youtu.be/…"',
          hint: 'El link del video oculto, o solo su código. Vacío = clase sin video.',
        },
        { name: 'duration', label: 'Duración', attrs: 'placeholder="8:30" style="max-width:180px;"', hint: 'Minutos:segundos (por ejemplo, 8:30) o solo los minutos.' },
        ...i18nFields('body', 'Texto de la clase', { type: 'textarea', attrs: 'maxlength="20000" style="min-height:160px;"' }),
        { name: 'published', label: 'Publicada', type: 'select', options: PUBLISHED.slice().reverse() },
      ],
      title: (l, i) => `${i + 1}. ${esc(es(l.title))}`,
      sub: (l) => (l.youtube_id ? `Video: ${esc(l.youtube_id)}` : 'Sin video'),
      meta: (l) =>
        [l.published ? 'Publicada' : 'Borrador', l.duration_seconds ? formatDuration(l.duration_seconds) : '', translationMeta(l.title, l.body)]
          .filter(Boolean)
          .map(esc)
          .join(' · '),
      toForm: (l) =>
        Object.assign({}, toI18nForm(l.title, 'title'), toI18nForm(l.body, 'body'), {
          youtube: l.youtube_id || '',
          duration: formatDuration(l.duration_seconds),
          published: String(l.published !== false),
        }),
      fromForm: (v) => {
        const id = youtubeId(v.youtube);
        if (id === null) return { error: { field: 'youtube', message: 'No reconocemos ese link de YouTube. Pegá el link del video o su código de 11 caracteres.' } };
        const duration = parseDuration(v.duration);
        if (duration === undefined || (duration != null && duration > 86400)) {
          return { error: { field: 'duration', message: 'Escribí la duración como minutos:segundos (8:30) o solo los minutos.' } };
        }
        return {
          title: fromI18nForm(v, 'title'),
          body: fromI18nForm(v, 'body'),
          youtube_id: id || null,
          duration_seconds: duration,
          published: v.published === 'true',
        };
      },
      newItem: () => ({ title: {}, body: {}, youtube_id: '', duration_seconds: null, published: true }),
      deleteText: (l) => `¿Eliminar la clase "${es(l.title)}" con sus materiales? No se puede deshacer.`,
      onLoad: (items) => {
        const changed = fillPicker(lessonPicker, items, 'Elegí una clase', (l, i) => `${i + 1}. ${es(l.title)}`);
        if (changed) resources.reload();
      },
    });

    /* ----- Materiales de la clase elegida ----- */
    const resources = window.nucleoListEditor({
      table: 'campus_lesson_resources',
      orderField: 'position',
      listEl: document.getElementById('resources-list'),
      addBtn: document.getElementById('add-resource-btn'),
      itemName: 'Material',
      newTitle: 'Material nuevo',
      emptyText: 'Esta clase todavía no tiene materiales.',
      pickText: 'Elegí una clase para ver sus materiales.',
      savedText: 'Material guardado.',
      deletedText: 'Material eliminado.',
      filter: () => (lessonPicker.value ? { column: 'lesson_id', value: lessonPicker.value } : null),
      fields: [
        ...i18nFields('label', 'Nombre del material', { required: true, attrs: 'maxlength="160" placeholder="Plantilla de presupuesto"' }),
        { name: 'url', label: 'Link', type: 'url', required: true, attrs: 'maxlength="2000" placeholder="https://drive.google.com/…"' },
      ],
      title: (r) => esc(es(r.label)),
      sub: (r) => `<a class="row-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a>`,
      meta: (r) => esc(translationMeta(r.label)),
      toForm: (r) => Object.assign({}, toI18nForm(r.label, 'label'), { url: r.url || '' }),
      fromForm: (v) => {
        const url = v.url.trim();
        if (!/^https:\/\/\S+$/.test(url)) return { error: { field: 'url', message: 'El link tiene que empezar con https://' } };
        return { label: fromI18nForm(v, 'label'), url };
      },
      newItem: () => ({ label: {}, url: '' }),
      deleteText: (r) => `¿Eliminar el material "${es(r.label)}"?`,
    });

    guardPicker(coursePicker, ['modules-list', 'lessons-list', 'resources-list'], () => modules.reload());
    guardPicker(modulePicker, ['lessons-list', 'resources-list'], () => lessons.reload());
    guardPicker(lessonPicker, ['resources-list'], () => resources.reload());

    loadMasterTranslations(masters);
  });

  /* ---------- Nombres de los Másteres en inglés y portugués ---------- */
  async function loadMasterTranslations(masters) {
    const list = document.getElementById('masters-i18n');
    const { data, error } = await supabaseClient.from('campus_masters').select('master_id, title, summary');
    if (error) {
      list.innerHTML = '<div class="empty-state">No pudimos cargar las traducciones. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    const byId = new Map((data || []).map((t) => [t.master_id, t]));
    if (!masters.length) {
      list.innerHTML = '<div class="empty-state">Todavía no hay Másteres cargados.</div>';
      return;
    }
    list.innerHTML = masters
      .map((m) => {
        const t = byId.get(m.id) || { title: {}, summary: {} };
        const id = `mi-${esc(m.id)}`;
        const input = (name, label, value, textarea) =>
          `<div class="field"><label for="${id}-${name}">${esc(label)}</label>${
            textarea
              ? `<textarea id="${id}-${name}" name="${name}" maxlength="600">${esc(value || '')}</textarea>`
              : `<input id="${id}-${name}" name="${name}" maxlength="120" value="${esc(value || '')}">`
          }</div>`;
        return `
          <form class="data-row data-row-stack stack-sm" data-master="${esc(m.id)}" novalidate>
            <div class="data-row-title">Máster ${esc(m.name)}</div>
            <div class="field-row">
              ${input('title_en', 'Nombre en inglés', t.title.en)}
              ${input('title_pt', 'Nombre en portugués', t.title.pt)}
            </div>
            ${input('summary_es', 'Descripción para el Campus (español)', t.summary.es, true)}
            <div class="field-row">
              ${input('summary_en', 'Descripción (inglés)', t.summary.en, true)}
              ${input('summary_pt', 'Descripción (portugués)', t.summary.pt, true)}
            </div>
            <div class="edit-actions"><button type="submit" class="btn btn-solid btn-sm">Guardar</button></div>
          </form>`;
      })
      .join('');

    list.querySelectorAll('form[data-master]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const values = {};
        ['title_en', 'title_pt', 'summary_es', 'summary_en', 'summary_pt'].forEach((n) => (values[n] = form.elements[n].value));
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        const { error: saveError } = await supabaseClient.from('campus_masters').upsert({
          master_id: form.dataset.master,
          title: fromI18nForm(values, 'title'),
          summary: fromI18nForm(values, 'summary'),
        });
        btn.disabled = false;
        btn.textContent = 'Guardar';
        window.nucleoToast(saveError ? 'No se pudo guardar. Lo que escribiste sigue acá: probá de nuevo.' : 'Traducciones guardadas.');
      });
    });
  }
})();
