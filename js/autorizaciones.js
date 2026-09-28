// ============================================================
// NÚCLEO — Autorizaciones de madre, padre o tutor/a para
// personas menores de edad (firmadas desde el sitio público).
// ============================================================
(function () {
  'use strict';

  // Los datos los carga cualquier visitante: todo se escapa antes de mostrarlo.
  const esc = window.nucleoEsc;
  const listEl = document.getElementById('auth-list');
  const tabsEl = document.getElementById('tabs');
  const EMPTY = {
    nuevo: 'No hay autorizaciones para revisar.',
    verificado: 'Todavía no verificaste ninguna autorización.',
    revocado: 'No hay autorizaciones revocadas.',
  };
  const SAFE_EMAIL = /^[^\s@?&#%<>"',;:()\[\]\\]+@[^\s@?&#%<>"',;:()\[\]\\]+\.[^\s@?&#%<>"',;:()\[\]\\]+$/;
  let current = 'nuevo';
  let items = [];

  const fmtDate = (iso) =>
    new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtDay = (d) => (d ? d.split('-').reverse().join('/') : '');
  function age(birth) {
    const b = new Date(birth + 'T00:00:00');
    const now = new Date();
    let years = now.getFullYear() - b.getFullYear();
    if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) years--;
    return years;
  }
  const emailLink = (email) =>
    SAFE_EMAIL.test(email || '') ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : esc(email || '');

  function updateCounts() {
    Object.keys(EMPTY).forEach((status) => {
      const el = tabsEl.querySelector(`[data-count="${status}"]`);
      if (el) el.textContent = ` (${items.filter((a) => a.status === status).length})`;
    });
  }

  function rowHTML(a) {
    const scope = [a.authorize_subscription ? 'usar la suscripción' : '', a.authorize_raffle ? 'participar del sorteo de becas' : '']
      .filter(Boolean)
      .join(' y ');
    const minor = `${esc(a.minor_name)} ${esc(a.minor_last_name)}`;
    const adult = `${esc(a.adult_name)} ${esc(a.adult_last_name)}`;
    const rows = [
      ['Código', `<strong>${esc(a.auth_code)}</strong>`],
      ['Firmó', `${esc(a.signature)} · ${fmtDate(a.created_at)}`],
      ['Autoriza', esc(scope)],
      ['Persona adulta', `${adult} (${esc(a.relationship)})`],
      ['Documento', `${esc(a.adult_doc_type)} ${esc(a.adult_doc_number)}`],
      ['Email', emailLink(a.adult_email)],
      a.adult_phone ? ['Teléfono', esc(a.adult_phone)] : null,
      ['Persona menor', minor],
      ['Nacimiento', `${fmtDay(a.minor_birthdate)} (${age(a.minor_birthdate)} años)`],
      a.minor_email ? ['Email de la persona menor', esc(a.minor_email)] : null,
    ].filter(Boolean);
    return `
      <div class="data-row data-row-stack" data-id="${esc(a.id)}">
        <div class="data-row-main">
          <div class="data-row-title">${minor}</div>
          <div class="data-row-sub">Autorizada por ${adult} · ${esc(a.auth_code)}</div>
        </div>
        <dl class="lead-data" style="margin-top:12px;">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <div class="edit-actions" style="margin-top:12px;">
          ${a.status !== 'verificado' ? `<button type="button" class="btn btn-solid btn-sm" data-action="verificado">Marcar como verificada</button>` : ''}
          ${a.status !== 'revocado' ? `<button type="button" class="btn btn-outline btn-sm" data-action="revocado">Revocar</button>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" data-action="eliminar">Eliminar</button>
        </div>
      </div>`;
  }

  function render() {
    updateCounts();
    const rows = items.filter((a) => a.status === current);
    listEl.innerHTML = rows.length ? rows.map(rowHTML).join('') : `<div class="empty-state">${EMPTY[current]}</div>`;
  }

  async function load() {
    const { data, error } = await supabaseClient.from('minor_authorizations').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar las autorizaciones. Recargá la página para intentar de nuevo.</div>';
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
    const item = items.find((a) => String(a.id) === row.dataset.id);
    const action = btn.dataset.action;
    const who = `${item.minor_name} ${item.minor_last_name}`;

    if (action === 'eliminar') {
      if (!window.confirm(`¿Eliminar la autorización de ${who}? No se puede deshacer. Si la persona ya usa AVA, conviene revocarla en vez de eliminarla, así queda constancia.`)) return;
      btn.disabled = true;
      const { error } = window.nucleoRows(await supabaseClient.from('minor_authorizations').delete().eq('id', item.id).select('id'));
      if (error) {
        btn.disabled = false;
        return window.nucleoToast('No se pudo eliminar. Probá de nuevo.');
      }
      items = items.filter((a) => a.id !== item.id);
      window.nucleoToast('Autorización eliminada.');
    } else {
      if (action === 'revocado' && !window.confirm(`¿Revocar la autorización de ${who}? Acordate de dar de baja su acceso.`)) return;
      btn.disabled = true;
      const { error } = window.nucleoRows(await supabaseClient.from('minor_authorizations').update({ status: action }).eq('id', item.id).select('id'));
      if (error) {
        btn.disabled = false;
        return window.nucleoToast('No se pudo actualizar. Probá de nuevo.');
      }
      item.status = action;
      window.nucleoToast(action === 'verificado' ? 'Autorización verificada.' : 'Autorización revocada.');
    }
    render();
  });

  window.nucleoReady.then((session) => {
    if (session) load();
  });
})();
