// ============================================================
// NÚCLEO — Panel (home): datos en vivo para cada tile
// ============================================================
(function () {
  'use strict';

  window.nucleoReady.then(async (session) => {
    if (!session) return;

    // Precio actual
    const { data: pricing } = await supabaseClient
      .from('pricing_plan')
      .select('price_promo, currency')
      .eq('id', 1)
      .single();
    const precioEl = document.getElementById('tile-precio-desc');
    if (pricing) {
      precioEl.textContent = `Precio de lanzamiento activo: ${pricing.currency} ${pricing.price_promo}/año.`;
    } else {
      precioEl.textContent = 'Administrá el precio de lanzamiento, el precio regular y la garantía.';
    }

    // Másteres
    const { count: mastersCount } = await supabaseClient
      .from('masters')
      .select('id', { count: 'exact', head: true });
    document.getElementById('tile-masteres-desc').textContent =
      `${mastersCount ?? 5} Másteres publicados en el catálogo.`;

    // Mensajes nuevos
    const { count: nuevos } = await supabaseClient
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'nuevo');
    const mensajesEl = document.getElementById('tile-mensajes-desc');
    if (nuevos && nuevos > 0) {
      mensajesEl.textContent = `Tenés ${nuevos} mensaje${nuevos === 1 ? '' : 's'} sin leer.`;
    } else {
      mensajesEl.textContent = 'No hay mensajes nuevos por ahora.';
    }
  });
})();
