// ============================================================
// NÚCLEO — Administración del CRM: utilidades compartidas por
// Equipo, Roles y permisos y Auditoría.
// Las reglas de la base (RLS) dejan hacer todo esto solo a la
// propietaria del CRM; acá solo se arma lo que se ve.
// ============================================================
(function () {
  'use strict';

  const esc = window.nucleoEsc;

  // Fechas en hora de Buenos Aires, igual que en el CRM.
  const dateTime = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  function fmtDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : dateTime.format(d).replace(',', '');
  }

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // Mismo criterio que el CRM: sin espacios, comas ni signos que permitan agregar destinatarios.
  const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
  function isValidEmail(value) {
    const email = String(value || '').trim();
    return email.length >= 3 && email.length <= 320 && !email.includes('..') && EMAIL_RE.test(email);
  }

  // Permisos que dan acceso a datos personales sensibles o a acciones que no se pueden deshacer.
  const SENSITIVE = new Set(['personas.ver_contacto', 'personas.exportar', 'personas.borrar', 'pagos.ver']);

  const SOURCE_LABEL = { contacto: 'Contacto', suscripcion: 'Lista de espera', arrepentimiento: 'Arrepentimiento', baja: 'Baja' };

  function groupPermissions(permissions) {
    const groups = new Map();
    [...permissions]
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((p) => {
        if (!groups.has(p.area)) groups.set(p.area, []);
        groups.get(p.area).push(p);
      });
    return [...groups.entries()].map(([area, list]) => ({ area, permissions: list }));
  }

  // Llama a la Edge Function crm-equipo y devuelve su mensaje de error en español si falla.
  async function callTeamFunction(body) {
    const { data, error } = await supabaseClient.functions.invoke('crm-equipo', { body });
    if (error) {
      let message = 'No pudimos completar la operación. Probá de nuevo en unos minutos.';
      try {
        if (error.context && typeof error.context.json === 'function') {
          const payload = await error.context.json();
          if (payload && payload.mensaje) message = payload.mensaje;
        }
      } catch (e) {
        /* la respuesta no era JSON: queda el mensaje general */
      }
      throw new Error(message);
    }
    return data;
  }

  // Estas pantallas son de la propietaria del CRM. Si la cuenta de Núcleo no lo es, se explica.
  async function requireOwner(session, container) {
    const { data, error } = await supabaseClient
      .from('crm_members')
      .select('is_owner, active')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (!error && data && data.is_owner && data.active) return true;
    container.innerHTML = error
      ? '<div class="empty-state">No pudimos verificar tu cuenta del CRM. Recargá la página para intentar de nuevo.</div>'
      : '<div class="empty-state">Esta cuenta no es la propietaria del CRM, así que no puede administrar el equipo.</div>';
    return false;
  }

  // Estado de una persona del equipo, igual que en el CRM.
  function memberState(member, status, statusesLoaded) {
    if (member.is_owner) return { key: 'propietaria', label: 'Propietaria' };
    if (!member.active) return { key: 'desactivada', label: 'Desactivada' };
    if (statusesLoaded && status && !status.confirmada && !status.ultimo_ingreso) {
      return { key: 'pendiente', label: 'Invitación pendiente' };
    }
    return { key: 'activa', label: 'Activa' };
  }

  /* ---------- Textos de la auditoría ---------- */
  const text = (v) => (typeof v === 'string' ? v : '');
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const FIELD_LABEL = { nombre: 'nombre', apellido: 'apellido', pais: 'país', etiquetas: 'etiquetas', email: 'email', telefono: 'teléfono' };

  function roleName(id, lookup) {
    if (!id) return 'sin rol';
    return `"${lookup.roleNames.get(id) || 'un rol borrado'}"`;
  }

  // Devuelve texto plano (sin HTML): quien lo muestre lo escapa.
  const DATA_REQUEST_LABEL = { acceso: 'Acceso', rectificacion: 'Rectificación', supresion: 'Supresión' };

  // Fecha sin hora ('2026-10-12'): se muestra tal cual, sin correrla por la zona horaria.
  function fmtDay(day) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : day;
  }

  function describeAudit(entry, lookup) {
    const detail = obj(entry.detail);
    const before = obj(detail.antes);
    const after = obj(detail.despues);

    if (entry.entity === 'crm_roles') {
      if (entry.action === 'insert') return `Creó el rol "${text(after.name)}"`;
      if (entry.action === 'delete') return `Borró el rol "${text(before.name)}"`;
      if (text(before.name) !== text(after.name)) return `Renombró el rol "${text(before.name)}" como "${text(after.name)}"`;
      return `Editó la descripción del rol "${text(after.name)}"`;
    }

    if (entry.entity === 'crm_role_permissions') {
      const key = text(detail.permiso);
      const label = lookup.permissionLabels.get(key) || key;
      const role = roleName(entry.entity_id, lookup);
      return entry.action === 'insert' ? `Sumó el permiso "${label}" al rol ${role}` : `Quitó el permiso "${label}" del rol ${role}`;
    }

    if (entry.entity === 'crm_members') {
      if (entry.action === 'invitar') return `Invitó a ${text(detail.email)} al equipo`;
      if (entry.action === 'sumar_cuenta_existente') return `Sumó al equipo a ${text(detail.email)}, que ya tenía cuenta`;
      if (entry.action === 'reenviar_invitacion') return `Reenvió la invitación a ${text(detail.email)}`;
      const email = text(after.email) || text(before.email);
      if (entry.action === 'insert') return after.is_owner === true ? `${email} quedó como propietaria del CRM` : `Sumó a ${email} al equipo`;
      if (entry.action === 'delete') return `Quitó a ${email} del equipo`;
      const changes = [];
      if (before.active !== after.active) changes.push(after.active ? 'reactivó su acceso' : 'desactivó su acceso');
      if (before.role_id !== after.role_id) changes.push(`le asignó el rol ${roleName(text(after.role_id), lookup)}`);
      if (before.display_name !== after.display_name) changes.push(`cambió su nombre a "${text(after.display_name)}"`);
      return changes.length ? `A ${email}: ${changes.join(', ')}` : `Editó a ${email}`;
    }

    if (entry.entity === 'leads') {
      const code = text(detail.codigo);
      if (entry.action === 'confirmar_pedido') return `Confirmó el pedido ${code}`;
      if (entry.action === 'borrar_mensaje') {
        const type = (SOURCE_LABEL[text(detail.tipo)] || text(detail.tipo)).toLowerCase();
        return `Borró un mensaje de ${type}${code ? ` (${code})` : ''}`;
      }
      if (entry.action === 'exportar_mensajes') return `Descargó ${plural(Number(detail.cantidad || 0), 'mensaje', 'mensajes')} en CSV`;
    }

    if (entry.entity === 'crm_people') {
      if (entry.action === 'ver_persona') {
        return detail.con_contacto === true ? 'Abrió una ficha, con email y teléfono' : 'Abrió una ficha, sin datos de contacto';
      }
      if (entry.action === 'editar_persona') {
        const fields = Array.isArray(detail.campos) ? detail.campos.map((c) => FIELD_LABEL[text(c)] || text(c)) : [];
        return `Editó una ficha: ${fields.join(', ') || 'sin cambios'}`;
      }
      if (entry.action === 'borrar_persona') {
        return `Borró a una persona con ${plural(Number(detail.mensajes || 0), 'mensaje', 'mensajes')} y ${plural(Number(detail.notas || 0), 'nota', 'notas')}`;
      }
      if (entry.action === 'exportar_personas') return `Descargó ${plural(Number(detail.cantidad || 0), 'persona', 'personas')} en CSV`;
      if (entry.action === 'exportar_persona') return 'Descargó todos los datos de una persona';
      if (entry.action === 'retirar_consentimiento') return 'Registró que una persona retiró la autorización para publicar su nombre';
    }

    if (entry.entity === 'leads' && entry.action === 'borrar_vencidos') {
      const people = Number(detail.personas || 0);
      return `Borró ${plural(Number(detail.mensajes || 0), 'formulario vencido', 'formularios vencidos')}${
        people ? ` y ${plural(people, 'persona sin formularios', 'personas sin formularios')}` : ''
      }`;
    }

    if (entry.entity === 'crm_data_requests') {
      const code = text(detail.codigo);
      const kind = DATA_REQUEST_LABEL[text(detail.tipo)] || text(detail.tipo);
      if (entry.action === 'crear_pedido_datos') return `Registró el pedido de datos ${code} (${kind.toLowerCase()})`;
      if (entry.action === 'editar_pedido_datos') {
        const fields = Array.isArray(detail.campos) ? detail.campos.map((c) => (text(c) === 'identidad' ? 'identidad verificada' : 'detalle')) : [];
        return `Editó el pedido de datos ${code}: ${fields.join(', ')}`;
      }
      if (entry.action === 'cerrar_pedido_datos') {
        if (detail.estado === 'anulado') return `Anuló el pedido de datos ${code}`;
        return `Respondió el pedido de datos ${code}${detail.a_tiempo === false ? ', fuera de plazo' : ''}`;
      }
    }

    if (entry.entity === 'crm_holidays') {
      const day = text(after.day) || text(before.day);
      const name = text(after.name) || text(before.name);
      if (entry.action === 'insert') return `Cargó el feriado del ${fmtDay(day)} (${name})`;
      if (entry.action === 'delete') return `Borró el feriado del ${fmtDay(day)} (${name})`;
      return `Editó el feriado del ${fmtDay(day)}`;
    }

    return `${entry.action} en ${entry.entity}`;
  }

  function auditPersonLink(entry) {
    if (entry.entity !== 'crm_people' || !entry.entity_id || entry.action === 'borrar_persona') return null;
    if (typeof NUCLEO_CRM_URL === 'undefined') return null;
    return `${NUCLEO_CRM_URL}/personas/${encodeURIComponent(entry.entity_id)}`;
  }

  window.crmAdmin = {
    esc,
    fmtDateTime,
    plural,
    isValidEmail,
    SENSITIVE,
    groupPermissions,
    callTeamFunction,
    requireOwner,
    memberState,
    describeAudit,
    auditPersonLink,
    fmtDay,
  };
})();
