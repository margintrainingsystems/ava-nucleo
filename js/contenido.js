// ============================================================
// NÚCLEO — Contenido del sitio
// El editor se arma solo a partir de copy-fields.js: cada campo es una
// fila de la tabla site_copy y un data-copy* del sitio público.
// ============================================================
(function () {
  'use strict';

  const GROUPS = window.NUCLEO_COPY_GROUPS || [];
  const FIELDS = window.NUCLEO_COPY_FIELDS || [];
  const esc = window.nucleoEsc;

  // Página del sitio donde se ve cada grupo (para el link "Ver en el sitio").
  const GROUP_PAGE = {
    Inicio: '/', 'Sobre AVA': '/sobre-ava', 'Propuesta académica': '/propuesta-academica',
    Suscripción: '/suscripcion', Reseñas: '/resenas', Contacto: '/contacto',
    Privacidad: '/privacidad', 'Términos y condiciones': '/terminos', 'Menú y pie de página': '/',
  };
  // Campos que tienen que ser un link completo (o quedar vacíos).
  const URL_KEYS = new Set(['campus_url']);
  const MIN_ROWS = { text: 3, block: 8, list: 5 };

  const tabsEl = document.getElementById('copy-tabs');
  const groupsEl = document.getElementById('copy-groups');
  const metaEl = document.getElementById('copy-group-meta');
  const searchEl = document.getElementById('copy-search');
  const form = document.getElementById('copy-form');
  const saveBar = document.getElementById('save-bar');
  const saveBarText = document.getElementById('save-bar-text');
  const saveBtn = document.getElementById('save-btn');
  const discardBtn = document.getElementById('discard-btn');

  const original = {}; // valor guardado en la base, por clave
  const updatedAt = {}; // última edición, por clave
  let activeGroup = GROUPS[0];

  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const inputFor = (key) => document.getElementById(`cf-${key}`);

  /* ---------- Armado del editor ---------- */
  function fieldHTML(f) {
    const id = `cf-${f.key}`;
    const hints = [];
    if (f.where) hints.push(`Aparece en: ${esc(f.where)}.`);
    if (f.type === 'list') hints.push('Un ítem por renglón.');
    if (URL_KEYS.has(f.key)) hints.push('Link completo, empezando con https://');
    if (f.required) hints.push('Obligatorio.');
    const hintId = hints.length ? `${id}-hint` : '';
    const common = `id="${id}" data-key="${esc(f.key)}"${f.required ? ' required' : ''}${hintId ? ` aria-describedby="${hintId}"` : ''}`;
    const control =
      f.type === 'line'
        ? `<input type="${URL_KEYS.has(f.key) ? 'url' : 'text'}" ${common}${URL_KEYS.has(f.key) ? ' inputmode="url" placeholder="https://"' : ''}>`
        : `<textarea ${common} rows="${MIN_ROWS[f.type] || 3}"></textarea>`;
    return `
      <div class="field copy-field" data-field-key="${esc(f.key)}">
        <label for="${id}">${esc(f.label)}</label>
        ${control}
        ${hintId ? `<span class="field-hint" id="${hintId}">${hints.join(' ')}</span>` : ''}
        <span class="field-error" id="${id}-error" hidden></span>
      </div>`;
  }

  function build() {
    tabsEl.innerHTML = GROUPS.map(
      (g) => `<button type="button" data-group="${esc(g)}" aria-pressed="${g === activeGroup}" aria-controls="grupo-${slug(g)}">${esc(g)}<span class="tab-count" data-dirty-count hidden></span></button>`
    ).join('');

    groupsEl.innerHTML = GROUPS.map((g) => {
      const fields = FIELDS.filter((f) => f.group === g);
      const sections = [];
      fields.forEach((f) => {
        let sec = sections.find((s) => s.name === f.section);
        if (!sec) sections.push((sec = { name: f.section, fields: [] }));
        sec.fields.push(f);
      });
      return `
        <div class="copy-group" id="grupo-${slug(g)}" data-group="${esc(g)}" ${g === activeGroup ? '' : 'hidden'}>
          <h2 class="copy-group-title">${esc(g)}</h2>
          ${sections
            .map(
              (sec) => `
            <section class="panel copy-section-panel" aria-labelledby="sec-${slug(g)}-${slug(sec.name)}">
              <div class="panel-head"><h3 id="sec-${slug(g)}-${slug(sec.name)}">${esc(sec.name)}</h3></div>
              <div class="stack-md">${sec.fields.map(fieldHTML).join('')}</div>
            </section>`
            )
            .join('')}
        </div>`;
    }).join('');
  }

  /* ---------- Alto automático de los textareas ---------- */
  function autosize(el) {
    if (el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 2 + 'px';
  }

  /* ---------- Cambios sin guardar ---------- */
  function dirtyKeys() {
    return FIELDS.map((f) => f.key).filter((k) => inputFor(k) && inputFor(k).value !== (original[k] || ''));
  }

  function refreshDirty() {
    const dirty = new Set(dirtyKeys());
    document.querySelectorAll('.copy-field').forEach((el) => el.classList.toggle('is-dirty', dirty.has(el.dataset.fieldKey)));
    tabsEl.querySelectorAll('button').forEach((btn) => {
      const n = FIELDS.filter((f) => f.group === btn.dataset.group && dirty.has(f.key)).length;
      const badge = btn.querySelector('[data-dirty-count]');
      badge.hidden = !n;
      badge.textContent = n ? `(${n})` : '';
    });
    saveBar.hidden = !dirty.size;
    saveBarText.textContent = dirty.size === 1 ? '1 cambio sin guardar' : `${dirty.size} cambios sin guardar`;
    window.nucleoSetDirty('contenido', dirty.size > 0);
  }

  /* ---------- Pestañas y búsqueda ---------- */
  function showGroupMeta() {
    if (searchEl.value.trim()) {
      metaEl.textContent = '';
      return;
    }
    const keys = FIELDS.filter((f) => f.group === activeGroup).map((f) => f.key);
    const last = keys.map((k) => updatedAt[k]).filter(Boolean).sort().pop();
    const page = GROUP_PAGE[activeGroup];
    metaEl.innerHTML =
      (last ? `Última edición: ${esc(new Date(last).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }))}` : '') +
      (page && typeof NUCLEO_SITE_URL !== 'undefined'
        ? `${last ? ' · ' : ''}<a href="${esc(NUCLEO_SITE_URL + page)}" target="_blank" rel="noopener">Ver esta página en el sitio <span aria-hidden="true">↗</span><span class="visually-hidden">(se abre en otra pestaña)</span></a>`
        : '');
  }

  function selectGroup(group) {
    activeGroup = group;
    searchEl.value = '';
    applyFilter();
    tabsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.group === group)));
  }

  function applyFilter() {
    const q = searchEl.value.trim().toLowerCase();
    let matches = 0;
    document.querySelectorAll('.copy-group').forEach((groupEl) => {
      let groupMatches = 0;
      groupEl.querySelectorAll('.copy-section-panel').forEach((sec) => {
        let secMatches = 0;
        sec.querySelectorAll('.copy-field').forEach((fieldEl) => {
          const input = fieldEl.querySelector('input, textarea');
          const text = `${fieldEl.querySelector('label').textContent} ${sec.querySelector('h3').textContent} ${input.value}`.toLowerCase();
          const show = !q || text.includes(q);
          fieldEl.hidden = !show;
          if (show) secMatches++;
        });
        sec.hidden = !secMatches;
        groupMatches += secMatches;
      });
      groupEl.hidden = q ? !groupMatches : groupEl.dataset.group !== activeGroup;
      // Sin búsqueda, el título de la página queda solo para lectores de pantalla.
      groupEl.querySelector('.copy-group-title').classList.toggle('visually-hidden', !q);
      matches += groupMatches;
    });
    tabsEl.hidden = Boolean(q);
    let empty = groupsEl.querySelector('[data-search-empty]');
    if (q && !matches) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.dataset.searchEmpty = '';
        groupsEl.appendChild(empty);
      }
      empty.textContent = `No encontramos textos con "${searchEl.value.trim()}".`;
    } else if (empty) {
      empty.remove();
    }
    document.querySelectorAll('.copy-group:not([hidden]) textarea').forEach(autosize);
    showGroupMeta();
  }

  /* ---------- Validación ---------- */
  function setError(key, message) {
    const input = inputFor(key);
    const err = document.getElementById(`cf-${key}-error`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) {
      err.textContent = message;
      err.hidden = false;
      input.setAttribute('aria-describedby', [`cf-${key}-error`, input.getAttribute('aria-describedby') || ''].join(' ').trim());
    } else {
      err.hidden = true;
      input.setAttribute('aria-describedby', (input.getAttribute('aria-describedby') || '').replace(`cf-${key}-error`, '').trim());
      if (!input.getAttribute('aria-describedby')) input.removeAttribute('aria-describedby');
    }
  }

  function validate(keys) {
    let firstInvalid = null;
    keys.forEach((key) => {
      const f = FIELDS.find((x) => x.key === key);
      const value = inputFor(key).value.trim();
      let msg = '';
      if (f.required && !value) msg = 'Este texto no puede quedar vacío.';
      else if (URL_KEYS.has(key) && value && !/^https:\/\/\S+$/i.test(value)) msg = 'Tiene que ser un link completo que empiece con https://';
      setError(key, msg);
      if (msg && !firstInvalid) firstInvalid = key;
    });
    markTabErrors();
    return firstInvalid;
  }

  // Las pestañas con algún campo marcado avisan, aunque estés mirando otra página.
  function markTabErrors() {
    tabsEl.querySelectorAll('button[data-group]').forEach((btn) => {
      const hasError = FIELDS.some(
        (f) => f.group === btn.dataset.group && inputFor(f.key) && inputFor(f.key).getAttribute('aria-invalid') === 'true'
      );
      let mark = btn.querySelector('.tab-error');
      if (hasError && !mark) {
        mark = document.createElement('span');
        mark.className = 'tab-error';
        mark.innerHTML = '<span aria-hidden="true">!</span><span class="visually-hidden"> (tiene campos para revisar)</span>';
        btn.appendChild(mark);
      } else if (!hasError && mark) {
        mark.remove();
      }
    });
  }

  /* ---------- Carga ---------- */
  async function load() {
    const { data, error } = await supabaseClient.from('site_copy').select('key, value, updated_at');
    if (error || !data) {
      groupsEl.innerHTML = '<div class="empty-state">No pudimos cargar los textos. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    data.forEach((row) => {
      original[row.key] = row.value == null ? '' : row.value;
      updatedAt[row.key] = row.updated_at;
    });
    build();
    FIELDS.forEach((f) => {
      const input = inputFor(f.key);
      input.value = original[f.key] || '';
    });
    applyFilter();
    refreshDirty();
  }

  /* ---------- Eventos ---------- */
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-group]');
    if (btn) selectGroup(btn.dataset.group);
  });
  searchEl.addEventListener('input', applyFilter);
  groupsEl.addEventListener('input', (e) => {
    if (!e.target.dataset.key) return;
    autosize(e.target);
    if (e.target.getAttribute('aria-invalid') === 'true') validate([e.target.dataset.key]);
    refreshDirty();
  });

  discardBtn.addEventListener('click', () => {
    FIELDS.forEach((f) => {
      const input = inputFor(f.key);
      if (!input) return;
      input.value = original[f.key] || '';
      setError(f.key, '');
      autosize(input);
    });
    markTabErrors();
    refreshDirty();
    window.nucleoToast('Cambios descartados.');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const keys = dirtyKeys();
    if (!keys.length) return;

    const invalid = validate(keys);
    if (invalid) {
      const f = FIELDS.find((x) => x.key === invalid);
      if (!searchEl.value.trim() && f.group !== activeGroup) selectGroup(f.group);
      const fieldEl = inputFor(invalid).closest('.copy-field');
      fieldEl.hidden = false;
      fieldEl.closest('.copy-section-panel').hidden = false;
      inputFor(invalid).focus();
      window.nucleoToast('Revisá los campos marcados antes de guardar.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';
    const now = new Date().toISOString();
    const rows = keys.map((key) => ({ key, value: inputFor(key).value, updated_at: now }));
    let error = null;
    try {
      ({ error } = await supabaseClient.from('site_copy').upsert(rows, { onConflict: 'key' }));
    } catch (err) {
      error = err;
    }
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar cambios';

    if (error) {
      window.nucleoToast('No se pudo guardar. Tus cambios siguen acá: probá de nuevo en un momento.');
      return;
    }
    rows.forEach((r) => {
      original[r.key] = r.value;
      updatedAt[r.key] = now;
    });
    refreshDirty();
    showGroupMeta();
    window.nucleoToast(keys.length === 1 ? 'Texto guardado. Ya está en el sitio.' : `${keys.length} textos guardados. Ya están en el sitio.`);
  });

  window.nucleoReady.then((session) => {
    if (session) load();
  });
})();
