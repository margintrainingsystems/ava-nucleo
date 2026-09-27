// ============================================================
// NÚCLEO — Mensajes: contacto, lista de espera y pedidos de
// arrepentimiento o baja (estos últimos se confirman por email
// dentro de las 24 horas, como pide la Disposición 954/2025).
// ============================================================
(function () {
  'use strict';

  const esc = window.nucleoEsc;
  const listEl = document.getElementById('leads-list');
  const tabsEl = document.getElementById('source-tabs');
  const archivedEl = document.getElementById('show-archived');
  const exportBtn = document.getElementById('export-btn');

  const SOURCE_LABEL = { contacto: 'Contacto', suscripcion: 'Lista de espera', arrepentimiento: 'Arrepentimiento', baja: 'Baja' };
  const REQUEST_NAME = { arrepentimiento: 'arrepentimiento', baja: 'baja de servicio' };
  const isRequest = (l) => l.source === 'arrepentimiento' || l.source === 'baja';
  const deadline = (l) => new Date(new Date(l.created_at).getTime() + 24 * 60 * 60 * 1000);
  const STATUS_LABEL = { nuevo: 'Sin leer', leido: 'Leído', archivado: 'Archivado' };
  let leads = [];
  let source = 'todos';

  const fullName = (l) => `${l.name || ''} ${l.last_name || ''}`.trim() || 'Sin nombre';
  const digits = (s) => String(s || '').replace(/\D/g, '');
  // Los emails vienen de formularios públicos: solo se arma un link si tiene
  // forma de email y sin caracteres que permitan agregar asunto, copias o cuerpo.
  const SAFE_EMAIL = /^[^\s@?&#%<>"',;:()\[\]\\]+@[^\s@?&#%<>"',;:()\[\]\\]+\.[^\s@?&#%<>"',;:()\[\]\\]+$/;
  const mailHref = (email, query) => (SAFE_EMAIL.test(email || '') ? `mailto:${email}${query ? '?' + query : ''}` : null);
  const fmtDate = (iso) =>
    new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function visible() {
    return leads.filter(
      (l) => (source === 'todos' || l.source === source) && (archivedEl.checked || l.status !== 'archivado')
    );
  }

  /* ---------- Dibujo ---------- */
  // Estado del plazo de 24 horas de un pedido de arrepentimiento o baja.
  function requestStatus(l) {
    if (l.confirmed_at) return `<span class="request-ok">Confirmado el ${fmtDate(l.confirmed_at)}</span>`;
    const due = deadline(l);
    return due < new Date()
      ? `<span class="request-late">Sin confirmar · el plazo venció el ${fmtDate(due)}</span>`
      : `<span class="request-due">Confirmar por email antes del ${fmtDate(due)}</span>`;
  }

  function summaryHTML(l) {
    const parts = [esc(l.email), SOURCE_LABEL[l.source] || esc(l.source)];
    if (isRequest(l)) parts.push(esc(l.request_code));
    else if (l.motivo) parts.push(esc(l.motivo));
    if (l.country) parts.push(esc(l.country));
    return `
      <span class="lead-dot" aria-hidden="true"></span>
      <span class="data-row-main">
        <span class="data-row-title">${esc(fullName(l))} <span class="status-tag is-${esc(l.status)}">${STATUS_LABEL[l.status] || ''}</span></span>
        <span class="data-row-sub">${parts.join(' · ')}</span>
        <span class="data-row-meta">${fmtDate(l.created_at)}${isRequest(l) ? ` · ${requestStatus(l)}` : ''}</span>
      </span>`;
  }

  // Email de confirmación ya redactado, con el código que exige la norma.
  function confirmationMail(l) {
    const what = REQUEST_NAME[l.source];
    const subject = `AVA — Confirmación de tu pedido de ${what} (${l.request_code})`;
    const body =
      `Hola ${l.name || ''}:\n\n` +
      `Recibimos tu pedido de ${what} de la suscripción a AVA. El código de identificación de tu pedido es ${l.request_code}.\n\n` +
      (l.source === 'arrepentimiento'
        ? 'Vamos a gestionar la devolución y te avisamos cuando esté hecha.\n\n'
        : 'Tu suscripción no se va a renovar y mantenés el acceso hasta el final del año contratado.\n\n') +
      'Cualquier duda, respondé este email.\n\nAVA';
    return mailHref(l.email, `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  function detailHTML(l) {
    const phone = digits(l.phone);
    const subject = l.source === 'suscripcion' ? 'AVA — lista de espera' : 'Re: tu consulta a AVA';
    const request = isRequest(l);
    const rows = [
      request ? ['Código', `<strong>${esc(l.request_code)}</strong>`] : null,
      ['Email', mailHref(l.email) ? `<a href="${esc(mailHref(l.email))}">${esc(l.email)}</a>` : `${esc(l.email)} <span class="field-optional">(dirección inválida: revisala antes de escribir)</span>`],
      l.phone ? ['Teléfono', esc(l.phone)] : null,
      l.country ? ['País', esc(l.country)] : null,
      l.motivo ? [request ? 'Operación' : 'Motivo', esc(l.motivo)] : null,
      request ? null : ['Privacidad', l.privacy_consent ? 'Marcó la casilla (consentimiento expreso)' : 'Sin casilla: llegó antes de que existiera'],
      ['Llegó', fmtDate(l.created_at)],
      request ? ['Plazo', requestStatus(l)] : null,
    ].filter(Boolean);
    const emptyMessage = request
      ? `Pedido de ${REQUEST_NAME[l.source]} (sin comentario).`
      : l.source === 'suscripcion' ? 'Se anotó en la lista de espera (no escribió un mensaje).' : 'Sin mensaje.';
    return `
      <p class="lead-message">${l.message ? esc(l.message) : emptyMessage}</p>
      <dl class="lead-data">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <div class="field lead-notes">
        <label for="notes-${esc(l.id)}">Notas internas <span class="field-optional">(solo las ves vos)</span></label>
        <textarea id="notes-${esc(l.id)}" data-notes maxlength="2000" placeholder="Ej: le escribí por WhatsApp el martes.">${esc(l.notes || '')}</textarea>
        <div><button type="button" class="btn btn-outline btn-sm" data-action="save-notes">Guardar nota</button></div>
      </div>
      <div class="edit-actions">
        ${
          request
            ? `${confirmationMail(l) ? `<a class="btn btn-solid btn-sm" href="${esc(confirmationMail(l))}">Enviar confirmación por email</a>` : ''}
               ${l.confirmed_at ? '' : '<button type="button" class="btn btn-outline btn-sm" data-action="confirm">Marcar como confirmado</button>'}`
            : mailHref(l.email) ? `<a class="btn btn-solid btn-sm" href="${esc(mailHref(l.email, `subject=${encodeURIComponent(subject)}`))}">Responder por email</a>` : ''
        }
        ${phone.length >= 8 ? `<a class="btn btn-outline btn-sm" href="https://wa.me/${phone}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : ''}
        <button type="button" class="btn btn-ghost btn-sm" data-action="unread">Marcar como no leído</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="archive">${l.status === 'archivado' ? 'Desarchivar' : 'Archivar'}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="delete">Eliminar</button>
      </div>`;
  }

  function updateCounts() {
    ['todos', 'contacto', 'suscripcion', 'arrepentimiento', 'baja'].forEach((s) => {
      const n = leads.filter((l) => (s === 'todos' || l.source === s) && (archivedEl.checked || l.status !== 'archivado')).length;
      const el = tabsEl.querySelector(`[data-count="${s}"]`);
      if (el) el.textContent = ` (${n})`;
    });
  }

  function render() {
    updateCounts();
    const rows = visible();
    if (!rows.length) {
      const EMPTY = {
        suscripcion: 'Todavía nadie se anotó en la lista de espera.',
        arrepentimiento: 'No hay pedidos de arrepentimiento.',
        baja: 'No hay pedidos de baja.',
      };
      listEl.innerHTML = `<div class="empty-state">${EMPTY[source] || 'No hay mensajes para mostrar.'}</div>`;
      return;
    }
    listEl.innerHTML = rows
      .map(
        (l) => `
      <div class="data-row data-row-stack lead-row${l.status === 'nuevo' ? ' is-unread' : ''}" data-id="${esc(l.id)}">
        <button type="button" class="lead-toggle" aria-expanded="false" aria-controls="lead-${esc(l.id)}">${summaryHTML(l)}</button>
        <div class="lead-detail" id="lead-${esc(l.id)}" hidden></div>
      </div>`
      )
      .join('');
  }

  function refreshRow(row, l) {
    row.classList.toggle('is-unread', l.status === 'nuevo');
    row.querySelector('.lead-toggle').innerHTML = summaryHTML(l);
  }

  /* ---------- Cambios en la base ---------- */
  async function setStatus(l, status) {
    const previous = l.status;
    l.status = status;
    const { error } = window.nucleoRows(await supabaseClient.from('leads').update({ status }).eq('id', l.id).select('id'));
    if (error) {
      l.status = previous;
      window.nucleoToast('No se pudo actualizar el mensaje. Probá de nuevo.');
      return false;
    }
    window.nucleoRefreshBadges();
    updateCounts();
    return true;
  }

  async function load() {
    const { data, error } = await supabaseClient.from('leads').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar los mensajes. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    leads = data;
    render();
  }

  // Notas escritas y sin guardar dentro de scope: se pregunta antes de perderlas.
  function discardNotesOk(scope) {
    const dirty = [...scope.querySelectorAll('[data-notes]')].filter((t) => {
      const l = leads.find((x) => String(x.id) === t.closest('.lead-row').dataset.id);
      return l && t.value.trim() !== (l.notes || '');
    });
    if (!dirty.length) return true;
    if (!window.confirm('Tenés una nota sin guardar. ¿Descartarla?')) return false;
    dirty.forEach((t) => window.nucleoSetDirty('notes-' + t.closest('.lead-row').dataset.id, false));
    return true;
  }

  /* ---------- Eventos ---------- */
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-source]');
    if (!btn) return;
    if (!discardNotesOk(listEl)) return;
    source = btn.dataset.source;
    tabsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    render();
  });
  archivedEl.addEventListener('change', () => {
    if (!discardNotesOk(listEl)) {
      archivedEl.checked = !archivedEl.checked;
      return;
    }
    render();
  });

  listEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.lead-row');
    if (!row) return;
    const l = leads.find((x) => String(x.id) === row.dataset.id);
    const toggle = e.target.closest('.lead-toggle');
    const detail = row.querySelector('.lead-detail');

    if (toggle) {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      if (open) {
        if (!discardNotesOk(detail)) return toggle.setAttribute('aria-expanded', 'true');
        detail.hidden = true;
        detail.innerHTML = '';
        return;
      }
      detail.innerHTML = detailHTML(l);
      detail.hidden = false;
      // Abrirlo es leerlo (como en cualquier bandeja de email).
      if (l.status === 'nuevo' && (await setStatus(l, 'leido'))) refreshRow(row, l);
      return;
    }

    const action = e.target.closest('button[data-action]');
    if (!action) return;

    if (action.dataset.action === 'save-notes') {
      const notes = detail.querySelector('[data-notes]').value.trim();
      action.disabled = true;
      const { error } = window.nucleoRows(await supabaseClient.from('leads').update({ notes: notes || null }).eq('id', l.id).select('id'));
      action.disabled = false;
      if (error) return window.nucleoToast('No se pudo guardar la nota. Probá de nuevo.');
      l.notes = notes || null;
      window.nucleoSetDirty('notes-' + l.id, false);
      window.nucleoToast('Nota guardada.');
      return;
    }

    if (action.dataset.action === 'confirm') {
      action.disabled = true;
      const now = new Date().toISOString();
      const { error } = window.nucleoRows(await supabaseClient.from('leads').update({ confirmed_at: now }).eq('id', l.id).select('id'));
      if (error) {
        action.disabled = false;
        return window.nucleoToast('No se pudo marcar como confirmado. Probá de nuevo.');
      }
      l.confirmed_at = now;
      refreshRow(row, l);
      // Solo se actualiza el plazo: la nota que se esté escribiendo no se pierde.
      const due = detail.querySelector('.lead-data .request-due, .lead-data .request-late');
      if (due) due.outerHTML = requestStatus(l);
      action.remove();
      window.nucleoToast('Pedido marcado como confirmado.');
      return;
    }

    if (action.dataset.action === 'unread') {
      if (await setStatus(l, 'nuevo')) {
        refreshRow(row, l);
        window.nucleoToast('Marcado como no leído.');
      }
      return;
    }

    if (action.dataset.action === 'archive') {
      const archiving = l.status !== 'archivado';
      if (archiving && !archivedEl.checked && !discardNotesOk(row)) return;
      if (!(await setStatus(l, archiving ? 'archivado' : 'leido'))) return;
      window.nucleoToast(archiving ? 'Archivado.' : 'Desarchivado.');
      if (archiving && !archivedEl.checked) {
        row.remove();
        if (!listEl.querySelector('.lead-row')) render();
      } else {
        refreshRow(row, l);
        action.textContent = archiving ? 'Desarchivar' : 'Archivar';
      }
      return;
    }

    if (action.dataset.action === 'delete') {
      if (!window.confirm(`¿Eliminar el mensaje de ${fullName(l)}? No se puede deshacer.`)) return;
      const { error } = window.nucleoRows(await supabaseClient.from('leads').delete().eq('id', l.id).select('id'));
      if (error) return window.nucleoToast('No se pudo eliminar. Probá de nuevo.');
      leads = leads.filter((x) => x.id !== l.id);
      window.nucleoSetDirty('notes-' + l.id, false);
      window.nucleoRefreshBadges();
      window.nucleoToast('Mensaje eliminado.');
      row.remove();
      updateCounts();
      if (!listEl.querySelector('.lead-row')) render();
    }
  });

  // Nota escrita y sin guardar: se avisa antes de salir de la página.
  listEl.addEventListener('input', (e) => {
    if (!e.target.matches('[data-notes]')) return;
    const row = e.target.closest('.lead-row');
    const l = leads.find((x) => String(x.id) === row.dataset.id);
    window.nucleoSetDirty('notes-' + l.id, e.target.value.trim() !== (l.notes || ''));
  });

  /* ---------- Descargar CSV ----------
     Separado por ";" y con BOM para que Excel en español lo abra bien.
     Las celdas que empiezan con = + - @ se protegen: los datos vienen de
     formularios públicos y Excel podría interpretarlos como fórmulas. */
  exportBtn.addEventListener('click', () => {
    const rows = visible();
    if (!rows.length) return window.nucleoToast('No hay nada para descargar con estos filtros.');
    const cell = (v) => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@\t\r]/.test(s) && !/^\+[\d\s()-]+$/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ['Fecha', 'Tipo', 'Código', 'Nombre', 'Apellido', 'Email', 'Teléfono', 'País', 'Motivo u operación', 'Mensaje', 'Estado', 'Confirmado', 'Aceptó privacidad', 'Notas'];
    const lines = rows.map((l) =>
      [fmtDate(l.created_at), SOURCE_LABEL[l.source] || l.source, l.request_code, l.name, l.last_name, l.email, l.phone, l.country, l.motivo, l.message, STATUS_LABEL[l.status] || l.status, l.confirmed_at ? fmtDate(l.confirmed_at) : '', isRequest(l) ? '' : (l.privacy_consent ? 'Sí' : 'No'), l.notes]
        .map(cell)
        .join(';')
    );
    const csv = '﻿' + [header.map(cell).join(';')].concat(lines).join('\r\n');
    const name = { todos: 'mensajes', contacto: 'contacto', suscripcion: 'lista-de-espera', arrepentimiento: 'arrepentimiento', baja: 'bajas' }[source];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `ava-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  });

  window.nucleoReady.then((session) => {
    if (session) load();
  });
})();
