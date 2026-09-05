// ============================================================
// NÚCLEO — Mensajes: listar, filtrar, ver detalle, archivar
// ============================================================
(function () {
  'use strict';

  const listEl = document.getElementById('leads-list');
  const template = document.getElementById('lead-detail-template');
  const tabsEl = document.getElementById('tabs');
  let currentFilter = 'todos';
  let leads = [];

  const SOURCE_LABEL = { contacto: 'Formulario de contacto', suscripcion: 'Lista de espera' };
  const STATUS_LABEL = { nuevo: 'Sin leer', leido: 'Leído', archivado: 'Archivado' };

  async function loadLeads() {
    const { data, error } = await supabaseClient
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar los mensajes.</div>';
      return;
    }
    leads = data;
    render();
  }

  function rowHTML(lead) {
    const date = new Date(lead.created_at).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const fullName = (lead.name || lead.last_name) ? `${lead.name || ''} ${lead.last_name || ''}`.trim() : 'Sin nombre';
    return `
      <div style="display:flex; width:100%; gap:16px; align-items:flex-start;">
        <div class="data-row-main">
          <div class="data-row-title" data-row-title>${fullName} <span class="status-tag is-${lead.status}">· ${STATUS_LABEL[lead.status]}</span></div>
          <div class="data-row-sub">${lead.email || ''}${lead.phone ? ' · ' + lead.phone : ''} — ${SOURCE_LABEL[lead.source] || lead.source}${lead.motivo ? ' · ' + lead.motivo : ''}${lead.country ? ' · ' + lead.country : ''}</div>
          <div class="data-row-meta">${date}</div>
        </div>
      </div>
      <div class="detail-slot"></div>
    `;
  }

  function render() {
    const filtered = currentFilter === 'todos' ? leads : leads.filter((l) => l.status === currentFilter);

    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty-state">No hay mensajes acá todavía.</div>';
      return;
    }

    listEl.innerHTML = '';
    filtered.forEach((lead) => {
      const row = document.createElement('div');
      row.className = 'data-row';
      row.style.flexDirection = 'column';
      row.style.cursor = 'pointer';
      row.dataset.id = lead.id;
      row.innerHTML = rowHTML(lead);
      listEl.appendChild(row);
    });
  }

  // Actualiza solo la etiqueta de estado de UNA fila, sin re-dibujar toda la lista
  // (así el detalle que la persona tiene abierto no se cierra solo).
  function updateRowStatusBadge(lead) {
    const row = listEl.querySelector(`.data-row[data-id="${lead.id}"]`);
    if (!row) return;
    const titleEl = row.querySelector('[data-row-title]');
    const fullName = (lead.name || lead.last_name) ? `${lead.name || ''} ${lead.last_name || ''}`.trim() : 'Sin nombre';
    titleEl.innerHTML = `${fullName} <span class="status-tag is-${lead.status}">· ${STATUS_LABEL[lead.status]}</span>`;
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    tabsEl.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    currentFilter = btn.dataset.status;
    render();
  });

  listEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.data-row');
    if (!row) return;
    const actionBtn = e.target.closest('button, a');
    const slot = row.querySelector('.detail-slot');
    const lead = leads.find((l) => l.id === row.dataset.id);

    // Click en la fila (no en un control interno del detalle): expandir/colapsar
    if (!actionBtn) {
      if (slot.children.length) {
        slot.innerHTML = '';
        return;
      }
      const node = template.content.cloneNode(true);
      node.querySelector('[data-field="full-message"]').textContent =
        lead.message || '(Sin mensaje escrito — este registro viene de la lista de espera de suscripción.)';
      const mailto = node.querySelector('[data-field="mailto-link"]');
      mailto.href = `mailto:${lead.email}?subject=${encodeURIComponent('Re: tu consulta a AVA')}`;
      const archiveBtn = node.querySelector('[data-action="toggle-archive"]');
      archiveBtn.textContent = lead.status === 'archivado' ? 'Desarchivar' : 'Archivar';
      slot.appendChild(node);

      // Si estaba "sin leer", al abrirlo lo pasamos a "leído" — sin re-dibujar toda la lista.
      if (lead.status === 'nuevo') {
        lead.status = 'leido';
        updateRowStatusBadge(lead);
        await supabaseClient.from('leads').update({ status: 'leido' }).eq('id', lead.id);
      }
      return;
    }

    // Archivar / desarchivar
    if (actionBtn.dataset.action === 'toggle-archive') {
      const wasArchived = lead.status === 'archivado';
      lead.status = wasArchived ? 'leido' : 'archivado';
      updateRowStatusBadge(lead);
      actionBtn.textContent = wasArchived ? 'Archivar' : 'Desarchivar';
      await supabaseClient.from('leads').update({ status: lead.status }).eq('id', lead.id);
      window.nucleoToast(wasArchived ? 'Mensaje desarchivado.' : 'Mensaje archivado.');
      // Si estamos filtrando y el mensaje ya no pertenece a este filtro, lo sacamos de la vista.
      if (currentFilter !== 'todos' && lead.status !== currentFilter) {
        row.remove();
      }
      return;
    }

    // Eliminar
    if (actionBtn.dataset.action === 'delete') {
      if (!confirm('¿Eliminar este mensaje? No se puede deshacer.')) return;
      await supabaseClient.from('leads').delete().eq('id', lead.id);
      leads = leads.filter((l) => l.id !== lead.id);
      window.nucleoToast('Mensaje eliminado.');
      row.remove();
    }
  });

  window.nucleoReady.then((session) => {
    if (session) loadLeads();
  });
})();
