// ============================================================
// NÚCLEO — FAQ: listar, reordenar, editar, borrar
// ============================================================
(function () {
  'use strict';

  const listEl = document.getElementById('faq-list');
  const template = document.getElementById('faq-edit-template');
  let items = [];

  async function load() {
    const { data, error } = await supabaseClient.from('faq_items').select('*').order('order_index', { ascending: true });
    if (error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar las preguntas.</div>';
      return;
    }
    items = data;
    render();
  }

  function render() {
    if (!items.length) {
      listEl.innerHTML = '<div class="empty-state">Todavía no hay preguntas cargadas.</div>';
      return;
    }
    listEl.innerHTML = '';
    items.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'data-row';
      row.style.flexDirection = 'column';
      row.dataset.id = f.id;
      row.innerHTML = `
        <div style="display:flex; width:100%; gap:16px; align-items:flex-start;">
          <div class="data-row-main">
            <div class="data-row-title">${f.question}</div>
            <div class="data-row-sub">${f.answer.replace(/<[^>]+>/g, '')}</div>
          </div>
          <div class="data-row-actions">
            <button class="icon-btn" data-action="up" ${i === 0 ? 'disabled' : ''} title="Subir"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="down" ${i === items.length - 1 ? 'disabled' : ''} title="Bajar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 4v8M4 8l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="edit" title="Editar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
            <button class="icon-btn" data-action="delete" title="Eliminar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </div>
        </div>
        <div class="edit-slot"></div>
      `;
      listEl.appendChild(row);
    });
  }

  function openEditor(row, item, isNew) {
    const slot = row.querySelector('.edit-slot');
    if (slot.children.length) { slot.innerHTML = ''; return; }
    const node = template.content.cloneNode(true);
    node.querySelector('[data-field="question"]').value = item.question || '';
    node.querySelector('[data-field="answer"]').value = item.answer || '';
    node.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      slot.innerHTML = '';
      if (isNew) row.remove();
    });
    node.querySelector('[data-action="save"]').addEventListener('click', async (ev) => {
      const btn = ev.target;
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      const question = slot.querySelector('[data-field="question"]').value.trim();
      const answer = slot.querySelector('[data-field="answer"]').value.trim();

      if (isNew) {
        const maxOrder = items.length ? Math.max(...items.map((i) => i.order_index)) : 0;
        await supabaseClient.from('faq_items').insert({ question, answer, order_index: maxOrder + 1 });
      } else {
        await supabaseClient.from('faq_items').update({ question, answer, updated_at: new Date().toISOString() }).eq('id', item.id);
      }
      window.nucleoToast('Pregunta guardada.');
      slot.innerHTML = '';
      load();
    });
    slot.appendChild(node);
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = btn.closest('.data-row');
    const index = items.findIndex((i) => i.id === row.dataset.id);
    const item = items[index];
    const action = btn.dataset.action;

    if (action === 'up' || action === 'down') {
      const swapWith = action === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= items.length) return;
      const a = items[index];
      const b = items[swapWith];
      const tmp = a.order_index;
      a.order_index = b.order_index;
      b.order_index = tmp;
      await Promise.all([
        supabaseClient.from('faq_items').update({ order_index: a.order_index }).eq('id', a.id),
        supabaseClient.from('faq_items').update({ order_index: b.order_index }).eq('id', b.id),
      ]);
      items.sort((x, y) => x.order_index - y.order_index);
      render();
      return;
    }
    if (action === 'edit') { openEditor(row, item, false); return; }
    if (action === 'delete') {
      if (!confirm('¿Eliminar esta pregunta? No se puede deshacer.')) return;
      await supabaseClient.from('faq_items').delete().eq('id', item.id);
      items = items.filter((i) => i.id !== item.id);
      window.nucleoToast('Pregunta eliminada.');
      render();
    }
  });

  document.getElementById('add-faq-btn').addEventListener('click', () => {
    const maxOrder = items.length ? Math.max(...items.map((i) => i.order_index)) : 0;
    const draft = { id: 'draft-' + Date.now(), question: '', answer: '', order_index: maxOrder + 1 };
    const row = document.createElement('div');
    row.className = 'data-row';
    row.style.flexDirection = 'column';
    row.dataset.id = draft.id;
    row.innerHTML = `<div class="data-row-main"><div class="data-row-title">Pregunta nueva</div></div><div class="edit-slot"></div>`;
    listEl.appendChild(row);
    items.push(draft);
    openEditor(row, draft, true);
  });

  window.nucleoReady.then((session) => {
    if (session) load();
  });
})();
