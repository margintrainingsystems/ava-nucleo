// ============================================================
// NÚCLEO — Feriados para los plazos en días hábiles del CRM
// ============================================================
(function () {
  'use strict';

  const { esc, requireOwner, fmtDay } = window.crmAdmin;
  const listEl = document.getElementById('holiday-list');
  const yearsEl = document.getElementById('holiday-years');
  const titleEl = document.getElementById('holiday-title');
  const warningEl = document.getElementById('holiday-warning');
  const addBtn = document.getElementById('holiday-add-btn');
  const form = document.getElementById('holiday-form');
  const linesEl = document.getElementById('holiday-lines');
  const errorEl = document.getElementById('holiday-error');

  const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const thisYear = Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric' }).format(new Date()),
  );

  let holidays = [];
  let year = thisYear;

  function weekday(day) {
    const [y, m, d] = day.split('-').map(Number);
    return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  }

  // Acepta "12/10/2026 Nombre", "2026-10-12 Nombre" y separadores como tab, ";" o " - ".
  function parseLine(line) {
    const clean = line.trim();
    if (!clean) return null;
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[;,\t-]?\s*(.*)$/.exec(clean);
    let y, mo, d, name;
    if (m) {
      [, d, mo, y, name] = m;
    } else {
      m = /^(\d{4})-(\d{2})-(\d{2})\s*[;,\t-]?\s*(.*)$/.exec(clean);
      if (!m) return { error: clean };
      [, y, mo, d, name] = m;
    }
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
    const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (date.toISOString().slice(0, 10) !== iso) return { error: clean };
    name = (name || '').trim();
    if (!name || name.length > 120) return { error: clean };
    return { day: iso, name };
  }

  function yearsToShow() {
    const years = new Set([thisYear, thisYear + 1]);
    holidays.forEach((h) => years.add(Number(h.day.slice(0, 4))));
    return [...years].sort((a, b) => a - b);
  }

  function render() {
    const byYear = (y) => holidays.filter((h) => h.day.startsWith(`${y}-`));
    yearsEl.innerHTML = yearsToShow()
      .map(
        (y) =>
          `<button type="button" data-year="${y}" aria-pressed="${y === year}">${y}<span class="tab-count">${byYear(y).length}</span></button>`,
      )
      .join('');

    const missing = [thisYear, thisYear + 1].filter((y) => byYear(y).length === 0);
    warningEl.hidden = missing.length === 0;
    warningEl.textContent = missing.length
      ? `Faltan los feriados de ${missing.join(' y ')}. Sin ellos, el CRM avisa que los plazos en días hábiles pueden quedar cortos.`
      : '';

    titleEl.textContent = `Feriados de ${year}`;
    const rows = byYear(year);
    if (!rows.length) {
      listEl.innerHTML = `<div class="empty-state">Todavía no cargaste feriados de ${year}.</div>`;
      return;
    }
    listEl.innerHTML = rows
      .map(
        (h) => `
        <div class="data-row" data-id="${esc(h.id)}">
          <div class="data-row-main">
            <div class="data-row-title">${esc(fmtDay(h.day))} · ${esc(weekday(h.day))}</div>
            <div class="data-row-sub">${esc(h.name)}</div>
          </div>
          <div class="data-row-actions">
            <button type="button" class="icon-btn" data-action="remove" aria-label="Borrar el feriado del ${esc(fmtDay(h.day))}"><svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.6 9.4h6.8L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </div>
        </div>`,
      )
      .join('');
  }

  async function load() {
    const { data, error } = await supabaseClient.from('crm_holidays').select('id, day, name').order('day');
    if (error) {
      listEl.innerHTML = '<div class="empty-state">No pudimos cargar los feriados. Recargá la página para intentar de nuevo.</div>';
      return;
    }
    holidays = data;
    render();
  }

  function showForm(open) {
    form.hidden = !open;
    addBtn.setAttribute('aria-expanded', String(open));
    errorEl.hidden = true;
    window.nucleoSetDirty('feriados', false);
    if (open) linesEl.focus();
    else linesEl.value = '';
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  yearsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-year]');
    if (!btn) return;
    year = Number(btn.dataset.year);
    render();
  });

  addBtn.addEventListener('click', () => showForm(form.hidden));
  form.querySelector('[data-cancel]').addEventListener('click', () => showForm(false));
  linesEl.addEventListener('input', () => window.nucleoSetDirty('feriados', linesEl.value.trim() !== ''));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const parsed = linesEl.value.split('\n').map(parseLine).filter(Boolean);
    const bad = parsed.filter((p) => p.error);
    if (!parsed.length) return showError('Escribí al menos un feriado.');
    if (bad.length) {
      return showError(`Revisá ${bad.length === 1 ? 'este renglón' : 'estos renglones'}: ${bad.map((b) => `"${b.error}"`).join(', ')}. Cada uno necesita una fecha válida y un nombre.`);
    }
    const unique = [...new Map(parsed.map((p) => [p.day, p])).values()];
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    const { data, error } = await supabaseClient
      .from('crm_holidays')
      .upsert(unique, { onConflict: 'day', ignoreDuplicates: true })
      .select('id');
    submit.disabled = false;
    if (error) return showError('No se pudieron guardar. Probá de nuevo.');
    const added = data ? data.length : 0;
    const skipped = unique.length - added;
    showForm(false);
    year = Number(unique[0].day.slice(0, 4));
    await load();
    window.nucleoToast(
      `${added === 1 ? 'Cargaste 1 feriado' : `Cargaste ${added} feriados`}${skipped ? `. ${skipped === 1 ? '1 ya estaba' : `${skipped} ya estaban`} cargado${skipped === 1 ? '' : 's'}` : ''}.`,
    );
  });

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="remove"]');
    if (!btn) return;
    const id = btn.closest('[data-id]').dataset.id;
    const h = holidays.find((x) => x.id === id);
    if (!h || !window.confirm(`¿Borrar el feriado del ${fmtDay(h.day)} (${h.name})? Los plazos pendientes se recalculan.`)) return;
    const { error } = await supabaseClient.from('crm_holidays').delete().eq('id', id);
    if (error) return window.nucleoToast('No se pudo borrar. Probá de nuevo.');
    await load();
    window.nucleoToast('Borraste el feriado.');
  });

  window.nucleoReady.then(async (session) => {
    if (!session) return;
    if (!(await requireOwner(session, listEl))) {
      addBtn.hidden = true;
      return;
    }
    load();
  });
})();
