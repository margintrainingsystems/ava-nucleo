// ============================================================
// NÚCLEO — Cliente de Supabase (compartido por todo el panel)
// ============================================================
// Este proyecto se conecta al mismo Supabase que usa el sitio público
// de AVA. La clave "anon" es pública por diseño: la seguridad real la
// dan las políticas de RLS configuradas en la base (lectura pública,
// escritura solo para usuarios autenticados).

const SUPABASE_URL = 'https://mryuhzpenzpyhfidwsup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yeXVoenBlbnpweWhmaWR3c3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxODExNDcsImV4cCI6MjEwMjc1NzE0N30.SevGerh6JTDIz67EeWxiADed-sUkIDy3NoFrOqmvgfI';

let supabaseClient;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML =
      '<div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; text-align:center; font-family:sans-serif; color:#F4F5F3; background:#16171B;">' +
      '<div><h1 style="margin-bottom:10px;">No pudimos conectar con la base</h1>' +
      '<p style="color:#9A9CA6;">Revisá tu conexión a internet y recargá la página. Si el problema sigue, puede ser que el servicio esté caído.</p></div></div>';
  });
}
