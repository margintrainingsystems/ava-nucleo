# Núcleo — Panel de administración de AVA

Panel privado para administrar todo el sitio de AVA. Es una app estática (HTML + CSS + JS, sin build) conectada a la misma base de Supabase que el sitio público (proyecto `mryuhzpenzpyhfidwsup`).

## Qué se administra

| Sección | Qué se edita | Dónde se ve |
|---|---|---|
| **Contenido del sitio** | Todos los textos del sitio, por página, con buscador | Todas las páginas |
| **Mensajes** | Contacto, lista de espera y pedidos de arrepentimiento o baja: leer, notas internas, archivar, responder por email o WhatsApp, confirmar pedidos dentro de las 24 horas, ver si la persona marcó la casilla de privacidad, descargar CSV | Solo en Núcleo |
| **Reseñas** | Aprobar, quitar del sitio o eliminar | Inicio y Reseñas |
| **Másteres** | Nombre, descripción, temas, precio, color y orden; agregar y eliminar | Inicio, Propuesta académica, Suscripción y formulario de reseñas |
| **Precios** | Precio, oferta sí/no, precio tachado, garantía y moneda (con vista previa) | Suscripción y todo texto con `{garantia}` |
| **Preguntas frecuentes** | Preguntas y respuestas, orden | Suscripción |
| **WhatsApp** | Números por área (el primero válido es el del botón flotante) | Contacto y botón flotante |
| **Email** | Direcciones por área (la primera válida es la principal) | Contacto, Privacidad y datos para Google |
| **Redes** | Nombre y link de cada red, en el orden que quieras | Pie de todas las páginas, Contacto y datos para Google |
| **Ajustes** | Cambiar la contraseña | — |

## Quién puede entrar

Tener una cuenta no alcanza: el panel verifica que la cuenta esté en la tabla `admins`. Una cuenta que no esté ahí sale automáticamente con el aviso "Esa cuenta no tiene permiso para entrar a Núcleo". Hoy la única administradora es `ilearnwithava@gmail.com`.

El panel ya no tiene pantalla para crear cuentas. Para que tampoco se puedan crear por fuera, en Supabase: **Authentication → Sign In / Providers → desactivá "Allow new users to sign up"**. Con eso, solo las cuentas existentes pueden iniciar sesión.

## Recuperar la contraseña

"¿Olvidaste tu contraseña?" manda un email con un link a `reset-password.html`. Si el link te lleva a otra dirección, agregá `https://TU-DIRECCION-DE-NUCLEO/reset-password.html` en Supabase → **Authentication → URL Configuration → Redirect URLs**.

## Cómo subirlo (GitHub + Netlify)

1. En el repositorio de GitHub de Núcleo, reemplazá los archivos por el contenido de esta carpeta (lo de adentro, no la carpeta).
2. Netlify publica solo. Build command vacío, publish directory `.`.
3. Subir una versión nueva no toca nada de lo que editaste: todo vive en la base.

## Seguridad

- `netlify.toml` le pide a Google que no indexe el panel y limita el código que el navegador acepta (Supabase, Google Fonts y el CDN de la librería). `README.md` no se publica.
- La clave pública de Supabase está a la vista en `js/supabase-client.js` a propósito: es pública por diseño. Lo que protege los datos son las reglas de la base: el público solo puede leer el contenido y crear mensajes o reseñas pendientes; leer mensajes y editar cualquier cosa queda para la cuenta administradora.
- Todo lo que llega de formularios públicos se muestra escapado (nadie puede meter código en el panel) y el CSV protege las celdas que Excel podría interpretar como fórmulas.

## Archivos

```
/
├── index.html · login.html · reset-password.html · 404.html
├── panel.html · contenido.html · mensajes.html · resenas.html
├── masteres.html · precios.html · faq.html · whatsapp.html · email.html · redes.html · ajustes.html
├── css/base.css      Compartido con el sitio (colores, tipografía, botones)
├── css/nucleo.css    Estructura y componentes del panel
└── js/
    ├── supabase-client.js · guard.js · main.js   Conexión, permiso de admin, menú y avisos
    ├── copy-fields.js     Lista de todos los textos editables del sitio (claves de site_copy)
    ├── contenido.js       Editor de textos
    ├── list-editor.js     Editor compartido de Másteres, preguntas, WhatsApp, Email y Redes
    └── (un archivo por sección)
```
