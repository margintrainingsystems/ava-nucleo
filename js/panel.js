// ============================================================
// NÚCLEO — Panel (inicio): un resumen en vivo en cada acceso
// ============================================================
(function () {
  'use strict';

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const fmt = (n) => new Intl.NumberFormat('es-AR').format(Number(n) || 0);
  const count = (table, column, value) =>
    supabaseClient.from(table).select('id', { count: 'exact', head: true }).eq(column, value);

  window.nucleoReady.then(async (session) => {
    if (!session) return;

    const [pricing, masters, unread, waitlist, pending, social, requests] = await Promise.all([
      supabaseClient.from('pricing_plan').select('price_promo, currency, show_promo').eq('id', 1).single(),
      supabaseClient.from('masters').select('id', { count: 'exact', head: true }),
      count('leads', 'status', 'nuevo'),
      count('leads', 'source', 'suscripcion'),
      count('testimonials', 'status', 'pendiente'),
      supabaseClient.from('social_links').select('id', { count: 'exact', head: true }),
      supabaseClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('source', ['arrepentimiento', 'baja'])
        .is('confirmed_at', null),
    ]).catch(() => []);

    if (pricing && !pricing.error && pricing.data) {
      const p = pricing.data;
      set('tile-precios', `${p.show_promo === false ? 'Precio anual' : 'Precio de oferta'}: ${p.currency} ${fmt(p.price_promo)}.`);
    } else {
      set('tile-precios', 'Precio, oferta, garantía y moneda.');
    }

    if (masters && !masters.error) {
      const n = masters.count || 0;
      set('tile-masteres', n === 1 ? '1 Máster publicado.' : `${n} Másteres publicados.`);
    } else {
      set('tile-masteres', 'Nombre, temas, precio y orden de cada Máster.');
    }

    if (unread && !unread.error && waitlist && !waitlist.error) {
      const u = unread.count || 0;
      const w = waitlist.count || 0;
      const r = requests && !requests.error ? requests.count || 0 : 0;
      set(
        'tile-mensajes',
        (r ? `${r === 1 ? '1 pedido' : `${r} pedidos`} de arrepentimiento o baja para confirmar · ` : '') +
          `${u === 0 ? 'Nada sin leer' : u === 1 ? '1 sin leer' : `${u} sin leer`} · ${w === 1 ? '1 persona' : `${fmt(w)} personas`} en la lista de espera.`
      );
    } else {
      set('tile-mensajes', 'Contacto y lista de espera.');
    }

    if (social && !social.error) {
      const n = social.count || 0;
      set('tile-redes', n === 0 ? 'Todavía no cargaste redes: el sitio no muestra el bloque.' : n === 1 ? '1 red publicada.' : `${n} redes publicadas.`);
    }

    if (pending && !pending.error) {
      const n = pending.count || 0;
      set('tile-resenas', n === 0 ? 'No hay reseñas esperando revisión.' : n === 1 ? '1 reseña espera tu revisión.' : `${n} reseñas esperan tu revisión.`);
    } else {
      set('tile-resenas', 'Aprobá lo que publican tus alumnos antes de que aparezca en el sitio.');
    }
  });
})();
