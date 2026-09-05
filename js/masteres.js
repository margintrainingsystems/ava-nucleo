// ============================================================
// NÚCLEO — Másteres: listar, reordenar, editar
// ============================================================
(function () {
  'use strict';

  const listEl = document.getElementById('masters-list');
  const template = document.getElementById('master-edit-template');
  const COLOR_LABEL = { blue: 'Azul', violet: 'Violeta', orange: 'Naranja', pink: 'Rosa', green: 'Verde' };

  let masters = [];

  async function loadMasters() {
    const { data, error } = await supabaseClient
      .from('masters')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar los Másteres.</div>';
      return;
    }
    masters = data;
    render();
  }

  function render() {
    if (!masters.length) {
      listEl.innerHTML = '<div class="empty-state">Todavía no hay Másteres cargados.</div>';
      return;
    }
    listEl.innerHTML = '';
    masters.forEach((m, i) => {
      const row = document.createElement('div');
      row.className = 'data-row';
      row.style.flexDirection = 'column';
      row.dataset.id = m.id;

      row.innerHTML = `
        <div style="display:flex; width:100%; gap:16px; align-items:flex-start;">
          <div class="data-row-main">
            <div class="data-row-title">${String(i + 1).padStart(2, '0')} · ${m.name} <span style="color:var(--text-faint); font-weight:600;">— ${COLOR_LABEL[m.color_token] || m.color_token} · USD ${m.price}/año</span></div>
            <div class="data-row-sub">${m.description}</div>
            <div class="data-row-meta">${(m.topics || []).length} temas incluidos</div>
          </div>
          <div class="data-row-actions">
            <button class="icon-btn" data-action="up" ${i === 0 ? 'disabled' : ''} title="Subir"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="down" ${i === masters.length - 1 ? 'disabled' : ''} title="Bajar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 4v8M4 8l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="edit" title="Editar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
          </div>
        </div>
        <div class="edit-slot"></div>
      `;
      listEl.appendChild(row);
    });
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = btn.closest('.data-row');
    const id = row.dataset.id;
    const index = masters.findIndex((m) => m.id === id);
    const action = btn.dataset.action;

    if (action === 'up' || action === 'down') {
      const swapWith = action === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= masters.length) return;
      const a = masters[index];
      const b = masters[swapWith];
      const tmp = a.order_index;
      a.order_index = b.order_index;
      b.order_index = tmp;

      await Promise.all([
        supabaseClient.from('masters').update({ order_index: a.order_index }).eq('id', a.id),
        supabaseClient.from('masters').update({ order_index: b.order_index }).eq('id', b.id),
      ]);
      masters.sort((x, y) => x.order_index - y.order_index);
      render();
      window.nucleoToast('Orden actualizado.');
      return;
    }

    if (action === 'edit') {
      const slot = row.querySelector('.edit-slot');
      if (slot.children.length) {
        slot.innerHTML = '';
        return;
      }
      const node = template.content.cloneNode(true);
      const m = masters[index];
      node.querySelector('[data-field="name"]').value = m.name;
      node.querySelector('[data-field="price"]').value = m.price;
      node.querySelector('[data-field="description"]').value = m.description;
      node.querySelector('[data-field="topics"]').value = (m.topics || [])
        .map((t) => (typeof t === 'string' ? t : `${t.name} :: ${t.description || ''}`))
        .join('\n');
      node.querySelector('[data-field="color_token"]').value = m.color_token;
      node.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        slot.innerHTML = '';
      });
      node.querySelector('[data-action="save"]').addEventListener('click', async (ev) => {
        const saveBtn = ev.target;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando…';
        const name = slot.querySelector('[data-field="name"]').value.trim();
        const price = Number(slot.querySelector('[data-field="price"]').value) || 0;
        const description = slot.querySelector('[data-field="description"]').value.trim();
        const topics = slot
          .querySelector('[data-field="topics"]')
          .value.split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, ...rest] = line.split('::');
            return { name: name.trim(), description: rest.join('::').trim() };
          });
        const color_token = slot.querySelector('[data-field="color_token"]').value;

        const { error } = await supabaseClient
          .from('masters')
          .update({ name, price, description, topics, color_token, updated_at: new Date().toISOString() })
          .eq('id', m.id);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar cambios';

        if (error) {
          window.nucleoToast('No se pudo guardar. Probá de nuevo.');
          return;
        }
        window.nucleoToast('Máster actualizado.');
        slot.innerHTML = '';
        loadMasters();
      });
      slot.appendChild(node);
    }
  });

  window.nucleoReady.then((session) => {
    if (session) loadMasters();
  });
})();
