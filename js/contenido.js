// ============================================================
// NÚCLEO — Contenido del sitio: cargar y guardar site_copy
// ============================================================
(function () {
  'use strict';

  const FIELD_MAP = {
    hero_title: 'c-hero-title',
    hero_subtitle: 'c-hero-subtitle',
    home_intro_body: 'c-home-intro-body',
    community_body: 'c-community-body',
    about_body: 'c-about-body',
    founder_bio_body: 'c-founder-bio-body',
    waitlist_intro: 'c-waitlist-intro',
    footer_tagline: 'c-footer-tagline',
  };

  async function loadCopy() {
    const { data, error } = await supabaseClient.from('site_copy').select('*');
    if (error || !data) {
      window.nucleoToast('No pudimos cargar los textos del sitio.');
      return;
    }
    data.forEach((row) => {
      const inputId = FIELD_MAP[row.key];
      const el = inputId && document.getElementById(inputId);
      if (el) el.value = row.value;
    });
  }

  const FORM_KEYS = {
    'copy-form-hero': ['hero_title', 'hero_subtitle'],
    'copy-form-home-intro': ['home_intro_body'],
    'copy-form-community': ['community_body'],
    'copy-form-about': ['about_body'],
    'copy-form-founder': ['founder_bio_body'],
    'copy-form-waitlist': ['waitlist_intro'],
    'copy-form-footer': ['footer_tagline'],
  };

  Object.entries(FORM_KEYS).forEach(([formId, keys]) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Guardando…';

      const updates = keys.map((key) => {
        const el = document.getElementById(FIELD_MAP[key]);
        return supabaseClient
          .from('site_copy')
          .update({ value: el.value, updated_at: new Date().toISOString() })
          .eq('key', key);
      });

      const results = await Promise.all(updates);
      const hadError = results.some((r) => r.error);

      btn.disabled = false;
      btn.textContent = original;

      if (hadError) {
        window.nucleoToast('No se pudo guardar. Probá de nuevo.');
        return;
      }
      window.nucleoToast('Textos actualizados en el sitio.');
    });
  });

  window.nucleoReady.then((session) => {
    if (session) loadCopy();
  });
})();
