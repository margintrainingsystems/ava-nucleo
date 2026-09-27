// ============================================================
// NÚCLEO — Precios: cargar, validar, previsualizar y guardar
// El precio de cada Máster se edita en Másteres; acá se usa solo para
// calcular el "total si se compra por separado" de la vista previa.
// ============================================================
(function () {
  'use strict';

  const esc = window.nucleoEsc;
  const $ = (id) => document.getElementById(id);
  const els = {
    form: $('pricing-form'),
    promo: $('f-promo'),
    promoLabel: $('f-promo-label'),
    regular: $('f-regular'),
    regularField: $('f-regular-field'),
    guarantee: $('f-guarantee'),
    currency: $('f-currency'),
    showPromo: $('f-show-promo'),
    preview: $('preview-stack'),
    lastSaved: $('last-saved'),
    save: $('save-btn'),
  };

  let masters = [];
  let copy = {};
  let saved = null; // últimos valores guardados, para detectar cambios

  const fmt = (n) => new Intl.NumberFormat('es-AR').format(Number(n) || 0);
  const text = (key, fallback) => (copy[key] && copy[key].trim() ? copy[key] : fallback);
  const values = () => ({
    price_promo: els.promo.value,
    price_regular: els.regular.value,
    guarantee_days: els.guarantee.value,
    currency: els.currency.value.trim().toUpperCase(),
    show_promo: els.showPromo.value === 'true',
  });

  /* ---------- Etiquetas según haya oferta o no ---------- */
  function syncMode() {
    const offer = els.showPromo.value === 'true';
    els.promoLabel.textContent = offer ? 'Precio de oferta (el que se cobra)' : 'Precio anual (el que se cobra)';
    els.regularField.hidden = !offer;
    els.regular.required = offer;
  }

  /* ---------- Vista previa con los textos reales del sitio ---------- */
  function renderPreview() {
    const v = values();
    const cur = esc(v.currency || 'USD');
    const perYear = esc(text('plan_per_year', '/año'));
    const total = masters.reduce((sum, m) => sum + Number(m.price || 0), 0);
    const row = (label, amount, cls = '') =>
      `<div class="value-row ${cls}"><span class="value-label">${label}</span><span class="value-dots" aria-hidden="true"></span>${amount}</div>`;

    let html = masters.map((m) => row(`Máster ${esc(m.name)}`, `<span class="value-amount">${cur} ${fmt(m.price)}${perYear}</span>`)).join('');
    html += row(esc(text('plan_gifts_label', 'Cursos de regalo con especialistas')), `<span class="value-amount">${esc(text('plan_gifts_value', 'No se vende por separado'))}</span>`);
    html += row(esc(text('plan_total_label', 'Total si se compra por separado')), `<span class="value-amount value-strike">${cur} ${fmt(total)}${perYear}</span>`, 'value-row-total');
    if (v.show_promo) {
      html += row(esc(text('plan_regular_label', 'Precio de suscripción anual')), `<span class="value-amount value-strike">${cur} ${fmt(v.price_regular)}${perYear}</span>`, 'value-row-total');
      html += row(esc(text('plan_promo_label', 'Precio promocional de lanzamiento')), `<span class="value-amount-final">${cur} ${fmt(v.price_promo)}<small>${perYear}</small></span>`, 'value-row-final');
    } else {
      html += row(esc(text('plan_regular_label', 'Precio de suscripción anual')), `<span class="value-amount-final">${cur} ${fmt(v.price_promo)}<small>${perYear}</small></span>`, 'value-row-final');
    }
    els.preview.innerHTML = html;
  }

  /* ---------- Validación ---------- */
  function setError(input, message) {
    const err = $(`${input.id}-error`);
    err.textContent = message || '';
    err.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  function validate() {
    const v = values();
    const checks = [
      [els.promo, v.price_promo === '' || Number(v.price_promo) < 0 ? 'Poné un precio válido (0 o más).' : ''],
      [els.regular, v.show_promo && (v.price_regular === '' || Number(v.price_regular) <= Number(v.price_promo)) ? 'Para mostrar una oferta, el precio regular tiene que ser más alto que el de oferta.' : ''],
      [els.guarantee, v.guarantee_days === '' || Number(v.guarantee_days) < 0 || !Number.isInteger(Number(v.guarantee_days)) ? 'Poné una cantidad de días válida.' : ''],
      [els.currency, !/^[A-Z]{3}$/.test(v.currency) ? 'Usá un código de 3 letras, por ejemplo USD.' : ''],
    ];
    let first = null;
    checks.forEach(([input, msg]) => {
      setError(input, msg);
      if (msg && !first) first = input;
    });
    return first;
  }

  function onChange() {
    syncMode();
    renderPreview();
    window.nucleoSetDirty('precios', saved !== null && JSON.stringify(values()) !== saved);
  }
  els.form.addEventListener('input', onChange);
  els.showPromo.addEventListener('change', onChange);

  /* ---------- Carga ---------- */
  window.nucleoReady.then(async (session) => {
    if (!session) return;
    const [pricingRes, mastersRes, copyRes] = await Promise.all([
      supabaseClient.from('pricing_plan').select('*').eq('id', 1).single(),
      supabaseClient.from('masters').select('name, price').order('order_index', { ascending: true }),
      supabaseClient.from('site_copy').select('key, value').like('key', 'plan_%'),
    ]);
    if (pricingRes.error || !pricingRes.data) {
      window.nucleoToast('No pudimos cargar los precios. Recargá la página para intentar de nuevo.');
      els.save.disabled = true;
      return;
    }
    const p = pricingRes.data;
    masters = mastersRes.error ? [] : mastersRes.data;
    (copyRes.data || []).forEach((r) => (copy[r.key] = r.value));

    els.promo.value = p.price_promo;
    els.regular.value = p.price_regular;
    els.guarantee.value = p.guarantee_days;
    els.currency.value = p.currency;
    els.showPromo.value = p.show_promo === false ? 'false' : 'true';
    els.lastSaved.textContent = 'Última edición: ' + new Date(p.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    saved = JSON.stringify(values());
    syncMode();
    renderPreview();
  });

  /* ---------- Guardar ---------- */
  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      invalid.focus();
      return;
    }
    const v = values();
    els.save.disabled = true;
    els.save.textContent = 'Guardando…';
    const now = new Date().toISOString();
    const update = {
      price_promo: Number(v.price_promo),
      guarantee_days: Number(v.guarantee_days),
      currency: v.currency,
      show_promo: v.show_promo,
      updated_at: now,
    };
    // Sin oferta, el precio regular no se usa: se conserva el último cargado.
    if (v.show_promo) update.price_regular = Number(v.price_regular);
    let error = null;
    try {
      ({ error } = window.nucleoRows(await supabaseClient.from('pricing_plan').update(update).eq('id', 1).select('id')));
    } catch (err) {
      error = err;
    }
    els.save.disabled = false;
    els.save.textContent = 'Guardar cambios';
    if (error) {
      window.nucleoToast('No se pudo guardar. Probá de nuevo en un momento.');
      return;
    }
    saved = JSON.stringify(values());
    window.nucleoSetDirty('precios', false);
    els.lastSaved.textContent = 'Última edición: ' + new Date(now).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    window.nucleoToast('Precios guardados. Ya están en el sitio.');
  });
})();
