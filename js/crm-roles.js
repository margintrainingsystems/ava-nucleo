// ============================================================
// NÚCLEO — Roles y permisos del CRM
// ============================================================
(function () {
  'use strict';

  const { esc, plural, SENSITIVE, groupPermissions, requireOwner } = window.crmAdmin;
  const listEl = document.getElementById('roles-list');
  const slot = document.getElementById('role-editor-slot');
  const newBtn = document.getElementById('new-role-btn');

  let roles = [];
  let permissions = [];
  let counts = new Map();

  function render() {
    if (!roles.length) {
      listEl.innerHTML =
        '<div class="empty-state">Todavía no hay roles. Creá uno por cada puesto de tu equipo, por ejemplo "Docente" o "Atención a estudiantes", y dale solo los permisos que necesita.</div>';
      return;
    }
    listEl.innerHTML = roles
      .map((r) => {
        const members = counts.get(r.id) || 0;
        const name = esc(r.name);
        return `
        <div class="data-row" data-id="${esc(r.id)}">
          <div class="data-row-main">
            <div class="data-row-title">${name}</div>
            ${r.description ? `<div class="data-row-sub">${esc(r.description)}</div>` : ''}
            <div class="data-row-meta">${plural(r.keys.length, 'permiso', 'permisos')} · ${plural(members, 'persona', 'personas')}${members ? ' · Para borrarlo, primero asigná otro rol a sus personas.' : ''}</div>
          </div>
          <div class="data-row-actions">
            <button type="button" class="btn btn-outline btn-sm" data-action="edit" aria-label="Editar el rol ${name}">Editar</button>
            ${members ? '' : `<button type="button" class="icon-btn" data-action="delete" aria-label="Borrar el rol ${name}"><svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`}
          </div>
        </div>`;
      })
      .join('');
  }

  async function load() {
    const [roleRows, permRows, memberRows] = await Promise.all([
      supabaseClient.from('crm_roles').select('id, name, description, crm_role_permissions(permission_key)').order('name'),
      supabaseClient.from('crm_permissions').select('key, area, label, description, sort_order').order('sort_order'),
      supabaseClient.from('crm_members').select('role_id'),
    ]);
    if (roleRows.error || permRows.error || memberRows.error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar los roles. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    roles = roleRows.data.map((r) => ({ ...r, keys: r.crm_role_permissions.map((p) => p.permission_key) }));
    permissions = permRows.data;
    counts = new Map();
    memberRows.data.forEach((m) => m.role_id && counts.set(m.role_id, (counts.get(m.role_id) || 0) + 1));
    render();
  }

  /* ---------- Editor (crear o editar) ---------- */
  function closeEditor() {
    slot.innerHTML = '';
    window.nucleoSetDirty('rol', false);
    newBtn.disabled = false;
  }

  function openEditor(role) {
    if (slot.innerHTML && !window.confirm('Tenés un rol a medio editar. ¿Descartar los cambios?')) return;
    const selected = new Set(role ? role.keys : []);
    const groups = groupPermissions(permissions)
      .map(
        (g) => `
        <fieldset class="perm-group">
          <legend>${esc(g.area)}</legend>
          ${g.permissions
            .map(
              (p) => `
            <div class="perm-row">
              <input type="checkbox" id="perm-${esc(p.key)}" value="${esc(p.key)}"${selected.has(p.key) ? ' checked' : ''} aria-describedby="perm-${esc(p.key)}-desc">
              <label for="perm-${esc(p.key)}">
                <span class="perm-label">${esc(p.label)}${SENSITIVE.has(p.key) ? ' <span class="tag-sensitive">Sensible</span>' : ''}</span>
                <span class="perm-desc" id="perm-${esc(p.key)}-desc">${esc(p.description)}</span>
              </label>
            </div>`
            )
            .join('')}
        </fieldset>`
      )
      .join('');

    slot.innerHTML = `
      <form class="edit-form role-editor" novalidate style="margin: 0 0 24px; border-top: none; padding-top: 0;">
        <h3 style="margin-bottom:16px;">${role ? `Editar "${esc(role.name)}"` : 'Crear rol'}</h3>
        <div class="field-row">
          <div class="field">
            <label for="role-name">Nombre</label>
            <input id="role-name" maxlength="60" placeholder="Por ejemplo: Docente" value="${role ? esc(role.name) : ''}">
          </div>
          <div class="field">
            <label for="role-description">Descripción <span class="field-optional">(opcional)</span></label>
            <input id="role-description" maxlength="300" placeholder="Para qué sirve este rol" value="${role ? esc(role.description) : ''}">
          </div>
        </div>
        <p class="field-hint" style="margin:16px 0 8px;">Los permisos marcados como sensibles dan acceso a datos personales o a acciones que no se pueden deshacer.</p>
        <div class="perm-groups">${groups}</div>
        <p class="field-error" role="alert" hidden></p>
        <div class="edit-actions" style="margin-top:16px;">
          <button type="submit" class="btn btn-solid btn-sm">${role ? 'Guardar cambios' : 'Crear rol'}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel>Cancelar</button>
        </div>
      </form>`;

    const form = slot.querySelector('form');
    const errorEl = form.querySelector('.field-error');
    newBtn.disabled = true;
    form.querySelector('#role-name').focus();
    form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    form.addEventListener('input', () => window.nucleoSetDirty('rol', true));
    form.addEventListener('change', () => window.nucleoSetDirty('rol', true));
    form.querySelector('[data-cancel]').addEventListener('click', closeEditor);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.querySelector('#role-name').value.trim();
      if (!name) {
        errorEl.textContent = 'Poné un nombre al rol.';
        errorEl.hidden = false;
        return;
      }
      const keys = [...form.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value);
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      const { error } = await supabaseClient.rpc('crm_save_role', {
        p_id: role ? role.id : null,
        p_name: name,
        p_description: form.querySelector('#role-description').value.trim(),
        p_permissions: keys,
      });
      submit.disabled = false;
      if (error) {
        errorEl.textContent = error.code === '23505' ? 'Ya existe un rol con ese nombre.' : 'No pudimos guardar el rol. Probá de nuevo.';
        errorEl.hidden = false;
        return;
      }
      closeEditor();
      window.nucleoToast(role ? `Guardaste los cambios de "${name}".` : `Creaste el rol "${name}".`);
      await load();
    });
  }

  newBtn.addEventListener('click', () => openEditor(null));

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const role = roles.find((r) => r.id === btn.closest('.data-row').dataset.id);
    if (!role) return;
    if (btn.dataset.action === 'edit') return openEditor(role);

    if (btn.dataset.action === 'delete') {
      if (!window.confirm(`¿Borrar el rol "${role.name}"? No se puede deshacer.`)) return;
      btn.disabled = true;
      const { error } = window.nucleoRows(await supabaseClient.from('crm_roles').delete().eq('id', role.id).select('id'));
      if (error) {
        btn.disabled = false;
        return window.nucleoToast('No se pudo borrar el rol. Si alguien lo tiene asignado, primero cambiale el rol.');
      }
      window.nucleoToast(`Borraste el rol "${role.name}".`);
      await load();
    }
  });

  window.nucleoReady.then(async (session) => {
    if (!session) return;
    if (!(await requireOwner(session, listEl))) {
      newBtn.disabled = true;
      return;
    }
    load();
  });
})();
