// ============================================================
// NÚCLEO — Precios: cargar, previsualizar y guardar
// El precio de cada Máster se edita en Másteres; acá solo se usa
// para calcular el "total si se compra por separado" en la vista previa.
// ============================================================
(function () {
  'use strict';

  const els = {
    promo: document.getElementById('f-promo'),
    regular: document.getElementById('f-regular'),
    guarantee: document.getElementById('f-guarantee'),
    currency: document.getElementById('f-currency'),
    showPromo: document.getElementById('f-show-promo'),
    preview: document.getElementById('preview-stack'),
    lastSaved: document.getElementById('last-saved'),
  };

  let mastersCache = [];

  function renderPreview() {
    const promo = Number(els.promo.value) || 0;
    const regular = Number(els.regular.value) || 0;
    const currency = els.currency.value || 'USD';
    const showPromo = els.showPromo.value === 'true';
    const total = mastersCache.reduce((sum, m) => sum + Number(m.price || 0), 0);

    let rows = mastersCache
      .map(
        (m) => `
      <div class="value-row">
        <span class="value-label">Máster ${m.name}</span>
        <span class="value-dots"></span>
        <span class="value-amount">${currency} ${m.price}/año</span>
      </div>`
      )
      .join('');

    rows += `
      <div class="value-row">
        <span class="value-label">Cursos de regalo con especialistas</span>
        <span class="value-dots"></span>
        <span class="value-amount">No se vende por separado</span>
      </div>
      <div class="value-row value-row-total">
        <span class="value-label">Total si se compra por separado</span>
        <span class="value-dots"></span>
        <span class="value-amount value-strike">${currency} ${total}/año</span>
      </div>`;

    if (showPromo) {
      rows += `
      <div class="value-row value-row-total">
        <span class="value-label">Precio de suscripción anual</span>
        <span class="value-dots"></span>
        <span class="value-amount value-strike">${currency} ${regular}/año</span>
      </div>
      <div class="value-row value-row-final">
        <span class="value-label">Precio promocional de lanzamiento</span>
        <span class="value-dots"></span>
        <span class="value-amount-final">${currency} ${promo}<small>/año</small></span>
      </div>`;
    } else {
      rows += `
      <div class="value-row value-row-final">
        <span class="value-label">Precio de suscripción anual</span>
        <span class="value-dots"></span>
        <span class="value-amount-final">${currency} ${promo}<small>/año</small></span>
      </div>`;
    }

    els.preview.innerHTML = rows;
  }

  [els.promo, els.regular, els.currency].forEach((el) => el.addEventListener('input', renderPreview));
  els.showPromo.addEventListener('change', renderPreview);

  window.nucleoReady.then(async (session) => {
    if (!session) return;

    const [{ data: pricing, error: pricingError }, { data: masters, error: mastersError }] = await Promise.all([
      supabaseClient.from('pricing_plan').select('*').eq('id', 1).single(),
      supabaseClient.from('masters').select('name, price').order('order_index', { ascending: true }),
    ]);

    if (pricingError || !pricing) {
      window.nucleoToast('No pudimos cargar los precios actuales.');
      return;
    }

    mastersCache = mastersError ? [] : masters;

    els.promo.value = pricing.price_promo;
    els.regular.value = pricing.price_regular;
    els.guarantee.value = pricing.guarantee_days;
    els.currency.value = pricing.currency;
    els.showPromo.value = pricing.show_promo === false ? 'false' : 'true';
    els.lastSaved.textContent = 'Última edición: ' + new Date(pricing.updated_at).toLocaleString('es-AR');
    renderPreview();
  });

  document.getElementById('pricing-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const { error } = await supabaseClient
      .from('pricing_plan')
      .update({
        price_promo: Number(els.promo.value),
        price_regular: Number(els.regular.value),
        guarantee_days: Number(els.guarantee.value),
        currency: els.currency.value.trim().toUpperCase(),
        show_promo: els.showPromo.value === 'true',
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    btn.disabled = false;
    btn.textContent = 'Guardar cambios';

    if (error) {
      window.nucleoToast('No se pudo guardar. Probá de nuevo.');
      return;
    }
    window.nucleoToast('Precios actualizados. Ya se ven así en el sitio.');
    els.lastSaved.textContent = 'Última edición: ' + new Date().toLocaleString('es-AR');
  });
})();
