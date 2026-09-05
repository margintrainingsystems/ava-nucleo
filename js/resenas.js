// ============================================================
// NÚCLEO — Moderación de reseñas: aprobar / rechazar / eliminar
// ============================================================
(function () {
  'use strict';

  const listEl = document.getElementById('testimonials-list');
  const tabsEl = document.getElementById('tabs');
  let currentFilter = 'pendiente';
  let items = [];

  async function load() {
    const { data, error } = await supabaseClient
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar las reseñas.</div>';
      return;
    }
    items = data;
    render();
  }

  function render() {
    const filtered = items.filter((t) => t.status === currentFilter);
    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty-state">No hay reseñas acá.</div>';
      return;
    }
    listEl.innerHTML = '';
    filtered.forEach((t) => {
      const row = document.createElement('div');
      row.className = 'data-row';
      row.dataset.id = t.id;
      const date = new Date(t.created_at).toLocaleDateString('es-AR');
      const masters = (t.masters || []).join(', ') || 'Sin especificar';
      row.innerHTML = `
        <div class="data-row-main">
          <div class="data-row-title">${t.student_name}</div>
          <div class="data-row-sub">"${t.testimonial}"</div>
          <div class="data-row-meta">${masters} · ${date}</div>
        </div>
        <div class="data-row-actions">
          ${currentFilter !== 'aprobado' ? '<button class="btn btn-solid btn-sm" data-action="aprobar">Aprobar</button>' : ''}
          ${currentFilter !== 'rechazado' ? '<button class="btn btn-outline btn-sm" data-action="rechazar">Rechazar</button>' : ''}
          <button class="icon-btn" data-action="eliminar" title="Eliminar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      `;
      listEl.appendChild(row);
    });
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
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = btn.closest('.data-row');
    const item = items.find((t) => t.id === row.dataset.id);
    const action = btn.dataset.action;

    if (action === 'aprobar') {
      item.status = 'aprobado';
      await supabaseClient.from('testimonials').update({ status: 'aprobado' }).eq('id', item.id);
      window.nucleoToast('Reseña aprobada. Ya aparece en el sitio.');
      row.remove();
      return;
    }
    if (action === 'rechazar') {
      item.status = 'rechazado';
      await supabaseClient.from('testimonials').update({ status: 'rechazado' }).eq('id', item.id);
      window.nucleoToast('Reseña rechazada.');
      row.remove();
      return;
    }
    if (action === 'eliminar') {
      if (!confirm('¿Eliminar esta reseña? No se puede deshacer.')) return;
      await supabaseClient.from('testimonials').delete().eq('id', item.id);
      items = items.filter((t) => t.id !== item.id);
      window.nucleoToast('Reseña eliminada.');
      row.remove();
    }
  });

  window.nucleoReady.then((session) => {
    if (session) load();
  });
})();
