// ============================================================
// NÚCLEO — Números de WhatsApp por área: listar, reordenar, editar, borrar
// ============================================================
(function () {
  'use strict';

  const listEl = document.getElementById('whatsapp-list');
  const template = document.getElementById('whatsapp-edit-template');
  let contacts = [];

  async function load() {
    const { data, error } = await supabaseClient
      .from('whatsapp_contacts')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar los contactos.</div>';
      return;
    }
    contacts = data;
    render();
  }

  function render() {
    if (!contacts.length) {
      listEl.innerHTML = '<div class="empty-state">Todavía no agregaste ningún número.</div>';
      return;
    }
    listEl.innerHTML = '';
    contacts.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'data-row';
      row.style.flexDirection = 'column';
      row.dataset.id = c.id;
      row.innerHTML = `
        <div style="display:flex; width:100%; gap:16px; align-items:flex-start;">
          <div class="data-row-main">
            <div class="data-row-title">${i === 0 ? '★ ' : ''}${c.area}</div>
            <div class="data-row-sub">${c.phone ? '+' + c.phone.replace(/^\+/, '') : '(sin número cargado)'}</div>
            <div class="data-row-meta">${c.message || '(sin mensaje predefinido)'}</div>
          </div>
          <div class="data-row-actions">
            <button class="icon-btn" data-action="up" ${i === 0 ? 'disabled' : ''} title="Subir"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="down" ${i === contacts.length - 1 ? 'disabled' : ''} title="Bajar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 4v8M4 8l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="edit" title="Editar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="delete" title="Eliminar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </div>
        </div>
        <div class="edit-slot"></div>
      `;
      listEl.appendChild(row);
    });
  }

  function openEditor(row, contact, isNew) {
    const slot = row.querySelector('.edit-slot');
    if (slot.children.length) {
      slot.innerHTML = '';
      return;
    }
    const node = template.content.cloneNode(true);
    node.querySelector('[data-field="area"]').value = contact.area || '';
    node.querySelector('[data-field="phone"]').value = contact.phone || '';
    node.querySelector('[data-field="message"]').value = contact.message || '';
    node.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      slot.innerHTML = '';
      if (isNew) row.remove();
    });
    node.querySelector('[data-action="save"]').addEventListener('click', async (ev) => {
      const btn = ev.target;
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      const area = slot.querySelector('[data-field="area"]').value.trim();
      const phone = slot.querySelector('[data-field="phone"]').value.trim().replace(/[^0-9]/g, '');
      const message = slot.querySelector('[data-field="message"]').value.trim();

      if (isNew) {
        const maxOrder = contacts.length ? Math.max(...contacts.map((c) => c.order_index)) : 0;
        const { error } = await supabaseClient
          .from('whatsapp_contacts')
          .insert({ area, phone, message, order_index: maxOrder + 1 });
        if (error) { window.nucleoToast('No se pudo guardar.'); btn.disabled = false; btn.textContent = 'Guardar'; return; }
      } else {
        const { error } = await supabaseClient
          .from('whatsapp_contacts')
          .update({ area, phone, message, updated_at: new Date().toISOString() })
          .eq('id', contact.id);
        if (error) { window.nucleoToast('No se pudo guardar.'); btn.disabled = false; btn.textContent = 'Guardar'; return; }
      }
      window.nucleoToast('Contacto guardado.');
      slot.innerHTML = '';
      load();
    });
    slot.appendChild(node);
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = btn.closest('.data-row');
    const id = row.dataset.id;
    const index = contacts.findIndex((c) => c.id === id);
    const contact = contacts[index];
    const action = btn.dataset.action;

    if (action === 'up' || action === 'down') {
      const swapWith = action === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= contacts.length) return;
      const a = contacts[index];
      const b = contacts[swapWith];
      const tmp = a.order_index;
      a.order_index = b.order_index;
      b.order_index = tmp;
      await Promise.all([
        supabaseClient.from('whatsapp_contacts').update({ order_index: a.order_index }).eq('id', a.id),
        supabaseClient.from('whatsapp_contacts').update({ order_index: b.order_index }).eq('id', b.id),
      ]);
      contacts.sort((x, y) => x.order_index - y.order_index);
      render();
      return;
    }

    if (action === 'edit') {
      openEditor(row, contact, false);
      return;
    }

    if (action === 'delete') {
      if (!confirm('¿Eliminar este contacto de WhatsApp?')) return;
      await supabaseClient.from('whatsapp_contacts').delete().eq('id', contact.id);
      contacts = contacts.filter((c) => c.id !== contact.id);
      window.nucleoToast('Contacto eliminado.');
      render();
    }
  });

  document.getElementById('add-area-btn').addEventListener('click', () => {
    const maxOrder = contacts.length ? Math.max(...contacts.map((c) => c.order_index)) : 0;
    const draft = { id: 'draft-' + Date.now(), area: '', phone: '', message: '', order_index: maxOrder + 1 };
    const row = document.createElement('div');
    row.className = 'data-row';
    row.style.flexDirection = 'column';
    row.dataset.id = draft.id;
    row.innerHTML = `<div class="data-row-main"><div class="data-row-title">Área nueva</div></div><div class="edit-slot"></div>`;
    listEl.appendChild(row);
    contacts.push(draft);
    openEditor(row, draft, true);
  });

  window.nucleoReady.then((session) => {
    if (session) load();
  });
})();
