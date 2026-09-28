// ============================================================
// NÚCLEO — Auditoría del CRM (solo lectura)
// ============================================================
(function () {
  'use strict';

  const { esc, fmtDateTime, describeAudit, auditPersonLink, requireOwner } = window.crmAdmin;
  const listEl = document.getElementById('audit-list');
  const tabsEl = document.getElementById('audit-tabs');
  const moreBtn = document.getElementById('audit-more');
  const PAGE = 50;

  let filter = 'todo';
  let entries = [];
  const lookup = { roleNames: new Map(), permissionLabels: new Map() };

  function query(before) {
    let q = supabaseClient
      .from('crm_audit_log')
      .select('id, at, actor_id, actor_email, action, entity, entity_id, detail')
      .order('id', { ascending: false })
      .limit(PAGE);
    if (filter === 'personas') q = q.in('entity', ['crm_people', 'leads', 'crm_data_requests', 'crm_emails']);
    if (filter === 'cobros') q = q.in('entity', ['crm_subscriptions', 'crm_enrollment_settings', 'crm_fx_rates', 'crm_raffles']);
    if (filter === 'equipo') q = q.eq('entity', 'crm_members');
    if (filter === 'roles') q = q.in('entity', ['crm_roles', 'crm_role_permissions']);
    if (before) q = q.lt('id', before);
    return q;
  }

  function render() {
    if (!entries.length) {
      listEl.innerHTML = '<div class="empty-state">Todavía no hay registros.</div>';
      return;
    }
    listEl.innerHTML = entries
      .map((e) => {
        const link = auditPersonLink(e);
        return `
        <div class="data-row">
          <div class="data-row-main">
            <div class="data-row-title">${esc(describeAudit(e, lookup))}</div>
            <div class="data-row-sub">${esc(e.actor_email || 'El CRM, automático')} · ${esc(fmtDateTime(e.at))}${
              link ? ` · <a class="row-link" href="${esc(link)}" target="_blank" rel="noopener">Ver la ficha en el CRM<span class="visually-hidden"> (se abre en otra pestaña)</span></a>` : ''
            }</div>
          </div>
        </div>`;
      })
      .join('');
  }

  async function load(append) {
    const before = append && entries.length ? entries[entries.length - 1].id : null;
    moreBtn.disabled = true;
    const { data, error } = await query(before);
    moreBtn.disabled = false;
    if (error) {
      if (!append) listEl.innerHTML = '<div class="empty-state">No pudimos cargar la auditoría. Recargá la página para intentar de nuevo.</div>';
      else window.nucleoToast('No pudimos cargar más registros. Probá de nuevo.');
      return;
    }
    entries = append ? entries.concat(data) : data;
    moreBtn.hidden = data.length < PAGE;
    render();
  }

  async function loadLookup() {
    const [roles, perms] = await Promise.all([
      supabaseClient.from('crm_roles').select('id, name'),
      supabaseClient.from('crm_permissions').select('key, label'),
    ]);
    if (!roles.error) roles.data.forEach((r) => lookup.roleNames.set(r.id, r.name));
    if (!perms.error) perms.data.forEach((p) => lookup.permissionLabels.set(p.key, p.label));
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn || btn.dataset.filter === filter) return;
    filter = btn.dataset.filter;
    tabsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    listEl.innerHTML = '<div class="empty-state">Cargando registros…</div>';
    load(false);
  });
  moreBtn.addEventListener('click', () => load(true));

  window.nucleoReady.then(async (session) => {
    if (!session) return;
    if (!(await requireOwner(session, listEl))) return;
    await loadLookup();
    load(false);
  });
})();
