// ============================================================
// NÚCLEO — Cliente de Supabase (compartido por todo el panel)
// ============================================================
// Es la misma base que usa el sitio público. La clave "anon" es pública
// por diseño: la seguridad real la dan las políticas de RLS de la base.
// Leer mensajes y reseñas pendientes, y editar cualquier cosa, solo lo
// puede hacer una cuenta que esté en la tabla "admins".

const SUPABASE_URL = 'https://mryuhzpenzpyhfidwsup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yeXVoenBlbnpweWhmaWR3c3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxODExNDcsImV4cCI6MjEwMjc1NzE0N30.SevGerh6JTDIz67EeWxiADed-sUkIDy3NoFrOqmvgfI';

// Dirección del sitio público, para los links "Ver en el sitio".
// La dirección de Netlify sigue funcionando aunque se conecte el dominio propio.
const NUCLEO_SITE_URL = 'https://aprendeconava.netlify.app';

// Editar o borrar con .select('id') y pasar la respuesta por acá: si las
// reglas de la base no dejaron tocar la fila (sesión vencida, fila borrada),
// Supabase no da error pero no cambia nada; así se avisa en vez de mostrar "guardado".
window.nucleoRows = function (res) {
  if (res.error) return res;
  if (!res.data || !res.data.length) return { data: res.data, error: { message: 'No se modificó ninguna fila' } };
  return res;
};

let supabaseClient;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  // La librería de Supabase no cargó (sin conexión, bloqueador, CDN caído):
  // en vez de una pantalla en blanco, se explica qué pasó.
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.remove('auth-pending');
    document.body.innerHTML =
      '<main class="auth-shell"><div class="auth-card" role="alert">' +
      '<h1>No pudimos conectar con la base</h1>' +
      '<p class="body-md">Revisá tu conexión a internet y recargá la página. Si el problema sigue, puede que el servicio esté caído por un rato.</p>' +
      '</div></main>';
  });
}
