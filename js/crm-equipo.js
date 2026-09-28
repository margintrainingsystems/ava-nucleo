// ============================================================
// NÚCLEO — Equipo del CRM: invitar, editar, desactivar y quitar
// ============================================================
(function () {
  'use strict';

  const { esc, fmtDateTime, isValidEmail, callTeamFunction, requireOwner, memberState } = window.crmAdmin;
  const listEl = document.getElementById('team-list');
  const inviteBtn = document.getElementById('invite-btn');
  const form = document.getElementById('invite-form');
  const nameEl = document.getElementById('invite-name');
  const emailEl = document.getElementById('invite-email');
  const roleEl = document.getElementById('invite-role');
  const roleHint = document.getElementById('invite-role-hint');
  const errorEl = document.getElementById('invite-error');
  const noRoles = document.getElementById('no-roles');

  let team = [];
  let roles = [];
  let statuses = null; // Map user_id → estado de la cuenta, o null si la función no respondió

  const roleName = (id) => (roles.find((r) => r.id === id) || {}).name || 'Sin rol';
  const who = (m) => m.display_name || m.email;

  function roleOptions(selected) {
    return roles
      .map((r) => `<option value="${esc(r.id)}"${r.id === selected ? ' selected' : ''}>${esc(r.name)}</option>`)
      .join('');
  }

  function render() {
    noRoles.hidden = roles.length > 0;
    inviteBtn.disabled = roles.length === 0;
    if (!team.length) {
      listEl.innerHTML = '<div class="empty-state">Todavía no hay nadie en el equipo.</div>';
      return;
    }
    listEl.innerHTML = team
      .map((m) => {
        const status = statuses ? statuses.get(m.user_id) : undefined;
        const state = memberState(m, status, statuses !== null);
        const name = esc(who(m));
        const actions = m.is_owner
          ? ''
          : `<div class="data-row-actions">
              <button type="button" class="btn btn-outline btn-sm" data-action="edit" aria-label="Editar a ${name}">Editar</button>
              ${state.key === 'pendiente' ? `<button type="button" class="btn btn-ghost btn-sm" data-action="resend" aria-label="Reenviar la invitación a ${name}">Reenviar invitación</button>` : ''}
              <button type="button" class="btn btn-ghost btn-sm" data-action="toggle" aria-label="${m.active ? 'Desactivar' : 'Reactivar'} a ${name}">${m.active ? 'Desactivar' : 'Reactivar'}</button>
              <button type="button" class="icon-btn" data-action="remove" aria-label="Quitar del equipo a ${name}"><svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            </div>`;
        return `
        <div class="data-row data-row-stack" data-id="${esc(m.user_id)}">
          <div class="data-row-top">
            <div class="data-row-main">
              <div class="data-row-title">${name} <span class="status-tag is-${esc(state.key)}">${esc(state.label)}</span></div>
              <div class="data-row-sub">${m.display_name ? esc(m.email) + ' · ' : ''}${m.is_owner ? 'Todos los permisos' : esc(roleName(m.role_id))}</div>
              <div class="data-row-meta">Último ingreso: ${esc(fmtDateTime(status && status.ultimo_ingreso))}</div>
            </div>
            ${actions}
          </div>
          <div class="edit-slot"></div>
        </div>`;
      })
      .join('');
  }

  async function load() {
    const [members, roleRows] = await Promise.all([
      supabaseClient
        .from('crm_members')
        .select('user_id, email, display_name, is_owner, active, role_id, created_at')
        .order('is_owner', { ascending: false })
        .order('created_at'),
      supabaseClient.from('crm_roles').select('id, name, description').order('name'),
    ]);
    if (members.error || roleRows.error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar el equipo. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    team = members.data;
    roles = roleRows.data;
    roleEl.innerHTML = roleOptions(roles[0] && roles[0].id);
    updateRoleHint();
    try {
      const result = await callTeamFunction({ action: 'estado' });
      statuses = new Map(result.miembros.map((s) => [s.user_id, s]));
    } catch (e) {
      statuses = null; // el resto de la pantalla funciona igual
    }
    render();
  }

  function updateRoleHint() {
    const role = roles.find((r) => r.id === roleEl.value);
    roleHint.textContent = role && role.description ? role.description : '';
  }

  /* ---------- Invitar ---------- */
  function setInviteOpen(open) {
    form.hidden = !open;
    inviteBtn.setAttribute('aria-expanded', String(open));
    if (open) nameEl.focus();
    else {
      form.reset();
      errorEl.hidden = true;
      window.nucleoSetDirty('invitar', false);
      if (roles[0]) roleEl.value = roles[0].id;
      updateRoleHint();
    }
  }

  inviteBtn.addEventListener('click', () => setInviteOpen(form.hidden));
  form.querySelector('[data-cancel]').addEventListener('click', () => setInviteOpen(false));
  roleEl.addEventListener('change', updateRoleHint);
  form.addEventListener('input', () => window.nucleoSetDirty('invitar', Boolean(nameEl.value.trim() || emailEl.value.trim())));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    const showError = (message) => {
      errorEl.textContent = message;
      errorEl.hidden = false;
    };
    if (!name) return showError('Escribí el nombre de la persona.');
    if (!isValidEmail(email)) return showError('Revisá el email: tiene que ser una dirección válida, sin espacios.');
    if (!roleEl.value) return showError('Elegí un rol.');
    errorEl.hidden = true;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Enviando…';
    try {
      const result = await callTeamFunction({ action: 'invitar', email, display_name: name, role_id: roleEl.value });
      window.nucleoToast(
        result.estado === 'invitada'
          ? `Le enviamos la invitación a ${email}.`
          : `${email} ya tenía cuenta en AVA: la sumamos al equipo y entra al CRM con su contraseña de siempre.`
      );
      setInviteOpen(false);
      await load();
    } catch (err) {
      showError(err.message);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Enviar invitación';
    }
  });

  /* ---------- Acciones de cada persona ---------- */
  async function update(member, changes, okMessage) {
    const { error } = window.nucleoRows(
      await supabaseClient.from('crm_members').update(changes).eq('user_id', member.user_id).select('user_id')
    );
    if (error) {
      window.nucleoToast('No se pudo guardar el cambio. Probá de nuevo.');
      return false;
    }
    Object.assign(member, changes);
    window.nucleoToast(okMessage);
    return true;
  }

  function openEditor(row, member) {
    const slot = row.querySelector('.edit-slot');
    if (slot.innerHTML) {
      slot.innerHTML = '';
      return;
    }
    const id = esc(member.user_id);
    slot.innerHTML = `
      <form class="edit-form" novalidate>
        <div class="field-row">
          <div class="field">
            <label for="name-${id}">Nombre y apellido</label>
            <input id="name-${id}" maxlength="120" value="${esc(member.display_name)}">
          </div>
          <div class="field">
            <label for="role-${id}">Rol</label>
            <select id="role-${id}">${roleOptions(member.role_id)}</select>
          </div>
        </div>
        <div class="edit-actions" style="margin-top:16px;">
          <button type="submit" class="btn btn-solid btn-sm">Guardar cambios</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel-edit>Cancelar</button>
        </div>
      </form>`;
    const editForm = slot.querySelector('form');
    editForm.querySelector('input').focus();
    editForm.querySelector('[data-cancel-edit]').addEventListener('click', () => (slot.innerHTML = ''));
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = editForm.querySelector('input').value.trim();
      if (!displayName) return window.nucleoToast('Escribí el nombre de la persona.');
      const roleId = editForm.querySelector('select').value;
      if (await update(member, { display_name: displayName, role_id: roleId }, 'Guardaste los cambios.')) render();
    });
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('.data-row');
    const member = team.find((m) => m.user_id === row.dataset.id);
    if (!member) return;
    const action = btn.dataset.action;

    if (action === 'edit') return openEditor(row, member);

    btn.disabled = true;
    if (action === 'resend') {
      try {
        await callTeamFunction({ action: 'reenviar', user_id: member.user_id });
        window.nucleoToast(`Reenviamos la invitación a ${member.email}.`);
      } catch (err) {
        window.nucleoToast(err.message);
      }
      btn.disabled = false;
      return;
    }

    if (action === 'toggle') {
      const deactivating = member.active;
      const question = deactivating
        ? `¿Desactivar a ${who(member)}? Deja de ver el CRM en este momento. Su rol queda guardado por si la reactivás.`
        : `¿Reactivar a ${who(member)}? Vuelve a entrar al CRM con el rol que tenía.`;
      if (window.confirm(question)) {
        await update(member, { active: !deactivating }, deactivating ? `Desactivaste a ${member.email}.` : `Reactivaste a ${member.email}.`);
        render();
      }
      btn.disabled = false;
      return;
    }

    if (action === 'remove') {
      const question = `¿Quitar a ${who(member)} del equipo? Pierde el acceso al CRM. Su cuenta de AVA sigue existiendo (si también es estudiante, conserva el Campus) y la auditoría conserva todo lo que hizo.`;
      if (!window.confirm(question)) {
        btn.disabled = false;
        return;
      }
      const { error } = window.nucleoRows(
        await supabaseClient.from('crm_members').delete().eq('user_id', member.user_id).select('user_id')
      );
      if (error) {
        btn.disabled = false;
        return window.nucleoToast('No se pudo quitar a la persona. Probá de nuevo.');
      }
      team = team.filter((m) => m.user_id !== member.user_id);
      window.nucleoToast(`Quitaste a ${member.email} del equipo.`);
      render();
    }
  });

  window.nucleoReady.then(async (session) => {
    if (!session) return;
    if (!(await requireOwner(session, listEl))) {
      inviteBtn.disabled = true;
      return;
    }
    load();
  });
})();
