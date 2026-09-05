# Núcleo — Panel de administración de AVA

Panel privado para administrar el sitio institucional de AVA: precios, catálogo de Másteres, mensajes recibidos y algunos textos clave del home. Es una app estática (HTML + CSS + JS, sin build) conectada a Supabase.

## Antes de desplegar: 3 pasos obligatorios

### 1. Restringir quién puede crear cuenta

Ahora mismo, cualquiera que entre a `login.html` y use el botón **"Primera vez acá"** puede crearse una cuenta con acceso total al panel. Es así a propósito, para que vos puedas crear tu primera cuenta sin que yo tenga que manipular la base de datos a mano.

**Ni bien crees tu cuenta, andá a Supabase → tu proyecto → Authentication → Sign In / Providers → Email, y desactivá "Allow new users to sign up".** Así nadie más va a poder registrarse, y la pantalla de "Primera vez acá" queda inofensiva (solo vos vas a tener contraseña).

Proyecto de Supabase: `mryuhzpenzpyhfidwsup` (ya está creado y conectado, no hace falta crear uno nuevo).

### 2. Crear tu cuenta

1. Subí este panel a Netlify (ver más abajo).
2. Entrá a `login.html` → "Primera vez acá" → cargá tu email y una contraseña de al menos 8 caracteres.
3. Si Supabase pide confirmación por email, vas a recibir un correo — confirmalo antes de iniciar sesión.
4. Iniciá sesión normalmente.
5. Hacé el paso 1 de arriba (desactivar altas nuevas).

### 3. Verificar que el sitio público ve los mismos datos

El sitio institucional (`aprendeconava.com`) ya está conectado a esta misma base de Supabase para leer precios y Másteres, y para guardar los mensajes de contacto y de suscripción. Si editás un precio acá y no lo ves reflejado en el sitio, revisá la consola del navegador ahí — probablemente el script de Supabase no cargó (ver "Notas técnicas" abajo).

## Qué se administra desde acá

| Sección | Qué hace | Dónde impacta |
|---|---|---|
| **Precios** | Precio promocional, precio regular, precio por Máster individual, días de garantía | `aprendeconava.com/suscripcion.html` (desglose de precios y checkout) |
| **Másteres** | Nombre, descripción, temas incluidos, color de acento y orden de cada Máster | `aprendeconava.com` (home, sección "Elegí tu ruta") |
| **Mensajes** | Bandeja unificada de leads: formulario de contacto + interés de suscripción | Se generan cuando alguien completa esos formularios en el sitio |
| **Contenido del sitio** | Título y bajada del hero, primer párrafo de la bio de la fundadora | `aprendeconava.com` (home y sección de fundadora) — **por ahora esto se guarda en la base pero el sitio todavía no lo lee automáticamente; ver Pendientes** |
| **Ajustes** | Cambiar tu contraseña | — |

## Pendiente / alcance actual (para ser honesta sobre qué falta)

- **"Contenido del sitio" no está conectado todavía al HTML del sitio público.** Guarda los textos en la tabla `site_copy` de Supabase, pero `index.html` y `sobre-ava.html` siguen mostrando el texto que está escrito directo en el código. Conectar esto es el próximo paso si te sirve — avisame y lo hacemos.
- La **propuesta académica detallada** (`propuesta-academica.html`, con la descripción de cada tema dentro de cada Máster) sigue siendo estática. La edición de Másteres desde acá solo actualiza el resumen que aparece en el home. Unificar los dos requeriría rediseñar esa página para que también sea dinámica — es un paso más de trabajo, decime si lo priorizamos.
- No hay roles ni multi-usuario: es una sola cuenta de administradora.

## Cómo subirlo (GitHub drag-and-drop + Netlify)

Igual que el sitio principal:
1. Repositorio nuevo en GitHub → "uploading an existing file" → arrastrá todo el contenido de esta carpeta.
2. Netlify → "Add new site" → conectá el repo. Build command vacío, publish directory `.`.
3. Sugerencia: usá un subdominio propio, por ejemplo `admin.aprendeconava.com`, apuntándolo a este sitio de Netlify (separado del sitio institucional).
4. Google no debería indexar esto — ya incluí `<meta name="robots" content="noindex, nofollow">` en todas las páginas, pero si querés blindarlo más, poné el sitio de Netlify en "Password protection" (disponible en algunos planes) además del login propio.

## Notas técnicas

- Usa el cliente de Supabase vía CDN (`unpkg.com/@supabase/supabase-js@2`). Esto requiere que el navegador de quien lo use tenga acceso normal a internet — no debería ser un problema en el uso real, pero **si alguna vez ves que los datos no cargan, lo primero es revisar la consola del navegador por errores de red**.
- La clave pública de Supabase (`anon key`) está a la vista en `js/supabase-client.js` a propósito: es pública por diseño en Supabase. La seguridad real está en las políticas de RLS (Row Level Security) configuradas en la base: cualquiera puede leer precios/Másteres y crear un mensaje, pero solo una cuenta autenticada puede editar o borrar algo.
- Recuperar contraseña ("¿Olvidaste tu contraseña?") depende de que Supabase tenga configurado el envío de emails. Por defecto viene activo con un remitente genérico de Supabase; si querés que los emails salgan de tu propio dominio, hay que configurar SMTP propio en el proyecto de Supabase (Settings → Auth → SMTP Settings).
