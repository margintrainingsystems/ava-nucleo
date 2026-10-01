// ============================================================
// NÚCLEO — Editor de listas ordenables (Másteres, FAQ, WhatsApp, Email)
// Un solo componente para las cuatro secciones: cargar, ordenar,
// editar, agregar y borrar, con los mismos avisos y validaciones.
// ============================================================
(function () {
  'use strict';

  const esc = window.nucleoEsc;
  const ICONS = {
    up: '<path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M8 4v8M4 8l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    edit: '<path d="M11 2l3 3-8 8H3v-3l8-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    delete: '<path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const icon = (name) => `<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none">${ICONS[name]}</svg>`;

  /**
   * cfg = {
   *   table, listEl, addBtn, itemName ('Máster', 'pregunta'...),
   *   fields: [{ name, label, type: 'text'|'email'|'number'|'textarea'|'select', options, hint, required, attrs }],
   *   title(item, i), sub(item), meta(item)   → HTML ya escapado
   *   toForm(item) → { campo: valor }        (opcional)
   *   onLoad(items) → se llama cada vez que cambia la lista (opcional)
   *   fromForm(values, item) → registro para la base, o { error: { field, message } }
   *   newItem(items) → valores iniciales de un ítem nuevo
   *   deleteText(item) → pregunta de confirmación · newTitle → título del ítem nuevo
   *   emptyText, savedText, deletedText, canDelete (true por defecto)
   *   orderField → columna del orden ('order_index' por defecto)
   *   filter() → { column, value } para mostrar solo una parte de la tabla (por ejemplo, las
   *              clases de un módulo), o null mientras no haya nada elegido (opcional)
   *   pickText → texto mientras filter() devuelve null (opcional)
   * }
   * Devuelve { reload } para volver a cargar la lista (por ejemplo, al cambiar el filtro).
   */
  window.nucleoListEditor = function (cfg) {
    let items = [];
    const openEditors = new Map(); // id → { initial, form }
    const orderField = cfg.orderField || 'order_index';

    async function load() {
      const scope = cfg.filter ? cfg.filter() : null;
      if (cfg.filter && !scope) {
        items = [];
        openEditors.clear();
        updateDirty();
        if (cfg.addBtn) cfg.addBtn.hidden = true;
        cfg.listEl.innerHTML = `<div class="empty-state">${esc(cfg.pickText || '')}</div>`;
        return;
      }
      if (cfg.addBtn) cfg.addBtn.hidden = false;
      let query = supabaseClient.from(cfg.table).select('*');
      if (scope) query = query.eq(scope.column, scope.value);
      const { data, error } = await query.order(orderField, { ascending: true });
      if (error || !data) {
        cfg.listEl.innerHTML = '<div class="empty-state">No pudimos cargar la lista. Recargá la página para intentar de nuevo.</div>';
        return;
      }
      items = data;
      if (cfg.onLoad) cfg.onLoad(items);
      render();
    }

    // Nombre del ítem en texto plano, para que cada botón diga de qué fila es.
    function plainTitle(item, i) {
      const tmp = document.createElement('div');
      tmp.innerHTML = cfg.title(item, i);
      return tmp.textContent.replace(/\s+/g, ' ').trim();
    }

    function rowActions(item, i) {
      const name = esc(`${cfg.itemName}: ${plainTitle(item, i)}`);
      return `
        <button type="button" class="icon-btn" data-action="up" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${name}">${icon('up')}</button>
        <button type="button" class="icon-btn" data-action="down" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Bajar ${name}">${icon('down')}</button>
        <button type="button" class="icon-btn" data-action="edit" aria-expanded="false" aria-label="Editar ${name}">${icon('edit')}</button>
        ${cfg.canDelete === false ? '' : `<button type="button" class="icon-btn" data-action="delete" aria-label="Eliminar ${name}">${icon('delete')}</button>`}`;
    }

    function render() {
      openEditors.clear();
      updateDirty();
      if (!items.length) {
        cfg.listEl.innerHTML = `<div class="empty-state">${esc(cfg.emptyText)}</div>`;
        return;
      }
      cfg.listEl.innerHTML = items
        .map(
          (item, i) => `
        <div class="data-row data-row-stack" data-id="${esc(item.id)}">
          <div class="data-row-top">
            <div class="data-row-main">
              <div class="data-row-title">${cfg.title(item, i)}</div>
              ${cfg.sub ? `<div class="data-row-sub">${cfg.sub(item, i)}</div>` : ''}
              ${cfg.meta ? `<div class="data-row-meta">${cfg.meta(item, i)}</div>` : ''}
            </div>
            <div class="data-row-actions">${rowActions(item, i)}</div>
          </div>
          <div class="edit-slot"></div>
        </div>`
        )
        .join('');
    }

    /* ---------- Formulario de edición ---------- */
    function formHTML(id) {
      return `
        <form class="stack-sm edit-form" novalidate>
          ${cfg.fields
            .map((f) => {
              const fid = `${cfg.table}-${id}-${f.name}`;
              const hintId = f.hint ? `${fid}-hint` : '';
              const aria = hintId ? ` aria-describedby="${hintId}"` : '';
              const attrs = `id="${fid}" name="${f.name}"${f.required ? ' required' : ''}${aria} ${f.attrs || ''}`;
              let control;
              if (f.type === 'textarea') control = `<textarea ${attrs}></textarea>`;
              else if (f.type === 'select')
                control = `<select ${attrs}>${f.options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`;
              else control = `<input type="${f.type || 'text'}" ${attrs}>`;
              return `
              <div class="field">
                <label for="${fid}">${esc(f.label)}${f.required ? '' : ' <span class="field-optional">(opcional)</span>'}</label>
                ${control}
                ${f.hint ? `<span class="field-hint" id="${hintId}">${f.hint}</span>` : ''}
                <span class="field-error" id="${fid}-error" hidden></span>
              </div>`;
            })
            .join('')}
          <div class="edit-actions">
            <button type="submit" class="btn btn-solid btn-sm">Guardar</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="cancel">Cancelar</button>
          </div>
        </form>`;
    }

    function readForm(form) {
      const values = {};
      cfg.fields.forEach((f) => (values[f.name] = form.elements[f.name].value));
      return values;
    }

    function showFieldError(form, field, message) {
      form.querySelectorAll('.field-error').forEach((el) => (el.hidden = true));
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      if (!field) return;
      const input = form.elements[field];
      const err = document.getElementById(`${input.id}-error`);
      err.textContent = message;
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }

    function updateDirty() {
      let dirty = false;
      openEditors.forEach(({ initial, form }) => {
        if (JSON.stringify(readForm(form)) !== initial) dirty = true;
      });
      window.nucleoSetDirty(cfg.table, dirty);
    }

    // Cambios sin guardar en otro ítem abierto: se pregunta antes de rehacer la lista.
    function othersDirtyOk(exceptId) {
      let dirty = false;
      openEditors.forEach(({ initial, form }, id) => {
        if (id !== exceptId && JSON.stringify(readForm(form)) !== initial) dirty = true;
      });
      return !dirty || window.confirm('Hay cambios sin guardar en otro ítem. Si seguís, se pierden. ¿Seguir?');
    }

    function closeEditor(row) {
      const id = row.dataset.id;
      openEditors.delete(id);
      row.querySelector('.edit-slot').innerHTML = '';
      const editBtn = row.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.setAttribute('aria-expanded', 'false');
        editBtn.focus();
      }
      if ('draft' in row.dataset) row.remove();
      if (!items.length && !cfg.listEl.querySelector('.data-row')) render();
      updateDirty();
    }

    function openEditor(row, item) {
      const slot = row.querySelector('.edit-slot');
      const id = row.dataset.id;
      slot.innerHTML = formHTML(id);
      const form = slot.querySelector('form');
      const values = cfg.toForm ? cfg.toForm(item) : item;
      cfg.fields.forEach((f) => {
        const v = values[f.name];
        form.elements[f.name].value = v == null ? '' : v;
      });
      openEditors.set(id, { initial: JSON.stringify(readForm(form)), form });
      const editBtn = row.querySelector('[data-action="edit"]');
      if (editBtn) editBtn.setAttribute('aria-expanded', 'true');
      form.elements[cfg.fields[0].name].focus();

      form.addEventListener('input', updateDirty);
      form.querySelector('[data-action="cancel"]').addEventListener('click', () => closeEditor(row));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const values = readForm(form);
        // Obligatorios primero, después las reglas propias de cada sección.
        const missing = cfg.fields.find((f) => f.required && !String(values[f.name]).trim());
        if (missing) return showFieldError(form, missing.name, 'Este campo no puede quedar vacío.');
        const record = cfg.fromForm(values, item);
        if (record.error) return showFieldError(form, record.error.field, record.error.message);
        showFieldError(form, null);
        if (!othersDirtyOk(id)) return;

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        let error = null;
        try {
          if ('draft' in row.dataset) {
            const order = items.length ? Math.max(...items.map((x) => x[orderField])) + 1 : 1;
            const scope = cfg.filter ? cfg.filter() : null;
            const base = { [orderField]: order };
            if (scope) base[scope.column] = scope.value;
            ({ error } = await supabaseClient.from(cfg.table).insert(Object.assign(base, record)));
          } else {
            ({ error } = await window.nucleoRows(await supabaseClient.from(cfg.table).update(record).eq('id', item.id).select('id')));
          }
        } catch (err) {
          error = err;
        }
        btn.disabled = false;
        btn.textContent = 'Guardar';
        if (error) {
          window.nucleoToast('No se pudo guardar. Lo que escribiste sigue acá: probá de nuevo.');
          return;
        }
        openEditors.delete(id);
        window.nucleoToast(cfg.savedText);
        await load();
      });
    }

    /* ---------- Reordenar ----------
       Se guarda la posición de todos los que cambian, así el orden queda
       prolijo aunque en la base hubiera posiciones repetidas. */
    let moving = false;
    async function move(index, dir) {
      const target = index + dir;
      if (moving || target < 0 || target >= items.length) return;
      if (!othersDirtyOk(null)) return;
      moving = true;
      try {
        await doMove(index, dir, target);
      } finally {
        moving = false;
      }
    }

    async function doMove(index, dir, target) {
      const reordered = items.slice();
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      const changes = reordered
        .map((item, i) => ({ item, order: i + 1 }))
        .filter(({ item, order }) => item[orderField] !== order);
      try {
        const results = await Promise.all(
          changes.map(({ item, order }) => supabaseClient.from(cfg.table).update({ [orderField]: order }).eq('id', item.id).select('id').then(window.nucleoRows))
        );
        if (results.some((r) => r.error)) throw new Error('reorder');
      } catch (e) {
        window.nucleoToast('No se pudo cambiar el orden. Probá de nuevo.');
        await load();
        return;
      }
      changes.forEach(({ item, order }) => (item[orderField] = order));
      items = reordered;
      if (cfg.onLoad) cfg.onLoad(items);
      render();
      const moved = cfg.listEl.querySelectorAll('.data-row')[target];
      const focusBtn = moved && moved.querySelector(`[data-action="${dir < 0 ? 'up' : 'down'}"]:not([disabled])`);
      (focusBtn || (moved && moved.querySelector('[data-action="edit"]')))?.focus();
      window.nucleoToast('Orden actualizado.');
    }

    /* ---------- Eventos ---------- */
    cfg.listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn || btn.closest('form')) return;
      const row = btn.closest('.data-row');
      const index = items.findIndex((x) => String(x.id) === row.dataset.id);
      const item = items[index];
      const action = btn.dataset.action;

      if (action === 'up') return move(index, -1);
      if (action === 'down') return move(index, 1);
      if (action === 'edit') {
        if (openEditors.has(row.dataset.id)) closeEditor(row);
        else openEditor(row, item);
        return;
      }
      if (action === 'delete') {
        if (!othersDirtyOk(row.dataset.id)) return;
        if (!window.confirm(cfg.deleteText(item))) return;
        let error = null;
        try {
          ({ error } = await window.nucleoRows(await supabaseClient.from(cfg.table).delete().eq('id', item.id).select('id')));
        } catch (err) {
          error = err;
        }
        if (error) {
          window.nucleoToast('No se pudo eliminar. Probá de nuevo.');
          return;
        }
        window.nucleoToast(cfg.deletedText);
        await load();
      }
    });

    if (cfg.addBtn) {
      cfg.addBtn.addEventListener('click', () => {
        const existing = cfg.listEl.querySelector('.data-row[data-draft]');
        if (existing) {
          existing.querySelector('input, textarea, select').focus();
          return;
        }
        const empty = cfg.listEl.querySelector('.empty-state');
        if (empty) empty.remove();
        const draft = cfg.newItem(items);
        const row = document.createElement('div');
        row.className = 'data-row data-row-stack';
        row.dataset.id = 'nuevo';
        row.dataset.draft = '';
        row.innerHTML = `<div class="data-row-top"><div class="data-row-main"><div class="data-row-title">${esc(cfg.newTitle)}</div></div></div><div class="edit-slot"></div>`;
        cfg.listEl.appendChild(row);
        openEditor(row, draft);
      });
    }

    window.nucleoReady.then((session) => {
      if (session) load();
    });

    return { reload: load };
  };
})();
