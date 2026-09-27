// ============================================================
// NÚCLEO — Moderación de reseñas: aprobar, rechazar, eliminar
// ============================================================
(function () {
  'use strict';

  // Las reseñas las escribe cualquier visitante: todo se escapa antes de mostrarlo.
  const esc = window.nucleoEsc;
  const listEl = document.getElementById('testimonials-list');
  const tabsEl = document.getElementById('tabs');
  const EMPTY = {
    pendiente: 'No hay reseñas esperando revisión.',
    aprobado: 'Todavía no aprobaste ninguna reseña.',
    rechazado: 'No hay reseñas rechazadas.',
  };
  let current = 'pendiente';
  let items = [];

  function updateCounts() {
    Object.keys(EMPTY).forEach((status) => {
      const el = tabsEl.querySelector(`[data-count="${status}"]`);
      if (el) el.textContent = ` (${items.filter((t) => t.status === status).length})`;
    });
  }

  function render() {
    updateCounts();
    const rows = items.filter((t) => t.status === current);
    if (!rows.length) {
      listEl.innerHTML = `<div class="empty-state">${EMPTY[current]}</div>`;
      return;
    }
    listEl.innerHTML = rows
      .map((t) => {
        const masters = (Array.isArray(t.masters) ? t.masters : []).map(esc).join(', ') || 'Sin Másteres indicados';
        const date = new Date(t.created_at).toLocaleDateString('es-AR');
        const who = esc(t.student_name);
        return `
        <div class="data-row" data-id="${esc(t.id)}">
          <div class="data-row-main">
            <div class="data-row-title">${who}</div>
            <div class="data-row-sub review-quote">"${esc(t.testimonial)}"</div>
            <div class="data-row-meta">${masters} · ${date}</div>
          </div>
          <div class="data-row-actions">
            ${current !== 'aprobado' ? `<button type="button" class="btn btn-solid btn-sm" data-action="aprobado" aria-label="Aprobar la reseña de ${who}">Aprobar</button>` : ''}
            ${current !== 'rechazado' ? `<button type="button" class="btn btn-outline btn-sm" data-action="rechazado" aria-label="${current === 'aprobado' ? 'Quitar del sitio' : 'Rechazar'} la reseña de ${who}">${current === 'aprobado' ? 'Quitar del sitio' : 'Rechazar'}</button>` : ''}
            <button type="button" class="icon-btn" data-action="eliminar" aria-label="Eliminar la reseña de ${who}"><svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </div>
        </div>`;
      })
      .join('');
  }

  async function load() {
    const { data, error } = await supabaseClient.from('testimonials').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar las reseñas. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    items = data;
    render();
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-status]');
    if (!btn) return;
    current = btn.dataset.status;
    tabsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    render();
  });

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('.data-row');
    const item = items.find((t) => String(t.id) === row.dataset.id);
    const action = btn.dataset.action;
    btn.disabled = true;

    if (action === 'eliminar') {
      if (!window.confirm(`¿Eliminar la reseña de ${item.student_name}? No se puede deshacer.`)) {
        btn.disabled = false;
        return;
      }
      const { error } = await supabaseClient.from('testimonials').delete().eq('id', item.id);
      if (error) {
        btn.disabled = false;
        return window.nucleoToast('No se pudo eliminar. Probá de nuevo.');
      }
      items = items.filter((t) => t.id !== item.id);
      window.nucleoToast('Reseña eliminada.');
    } else {
      const { error } = await supabaseClient.from('testimonials').update({ status: action }).eq('id', item.id);
      if (error) {
        btn.disabled = false;
        return window.nucleoToast('No se pudo actualizar la reseña. Probá de nuevo.');
      }
      item.status = action;
      window.nucleoToast(action === 'aprobado' ? 'Reseña aprobada. Ya se ve en el sitio.' : 'La reseña ya no se muestra en el sitio.');
    }
    window.nucleoRefreshBadges();
    render();
  });

  window.nucleoReady.then((session) => {
    if (session) load();
  });
})();
