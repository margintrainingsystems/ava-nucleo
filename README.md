# Núcleo — Panel de administración de AVA

Panel privado de la dueña para administrar todo AVA: el sitio y el CRM. Es una app estática (HTML + CSS + JS, sin build) conectada a la misma base de Supabase que el sitio público (proyecto `mryuhzpenzpyhfidwsup`).

## Qué se administra

| Sección | Qué se edita | Dónde se ve |
|---|---|---|
| **Contenido del sitio** | Todos los textos del sitio, por página, con buscador | Todas las páginas |
| **Reseñas** | Aprobar, quitar del sitio o eliminar | Inicio y Reseñas |
| **Másteres** | Nombre, descripción, temas, precio, color y orden; agregar y eliminar | Inicio, Propuesta académica, Suscripción y formulario de reseñas |
| **Precios** | Precio, oferta sí/no, precio tachado, garantía y moneda (con vista previa) | Suscripción y todo texto con `{garantia}` |
| **Preguntas frecuentes** | Preguntas y respuestas, orden | Suscripción |
| **WhatsApp** | Números por área (el primero válido es el del botón flotante) | Contacto y botón flotante |
| **Email** | Direcciones por área (la primera válida es la principal) | Contacto, Privacidad y datos para Google |
| **Redes** | Nombre y link de cada red, en el orden que quieras | Pie de todas las páginas, Contacto y datos para Google |
| **Cursos del Campus** | Cursos (Máster o de regalo, dirección, publicado o borrador), módulos, clases (video de YouTube oculto, duración, texto) y materiales, en español, inglés y portugués. También los nombres de los Másteres en inglés y portugués | Campus (`https://ava-campus.netlify.app`, repo `ava-campus`) |
| **CRM → Mensajes** | Abre el CRM en otra pestaña. El menú muestra cuántos mensajes hay sin leer | CRM |
| **CRM → Equipo** | Invitar personas al CRM, cambiar su nombre y rol, reenviar invitaciones, desactivar, reactivar y quitar | CRM |
| **CRM → Roles y permisos** | Crear, editar y borrar roles; elegir sus permisos (los sensibles van marcados) | CRM |
| **CRM → Auditoría** | Quién abrió fichas, descargó datos, cobró, sorteó o cambió algo en el CRM, y cuándo. Filtro "Cobros y sorteo" para altas, bajas, devoluciones, cupo, cotización y becas. Solo lectura | Solo en Núcleo |
| **CRM → Cupo, dólar y emails** | Abre CRM → Configuración: abrir y cerrar inscripciones, el cupo de suscripciones anuales, la cotización del dólar blue (se lee sola de dolarhoy.com y se puede cargar a mano), remitente, plantillas y email de prueba. Se puede delegar con el permiso "Editar la configuración" | CRM y, en la fase 4 parte 2, la página de Suscripción |
| **CRM → Feriados** | Los días que no cuentan como hábiles. Se pegan varios juntos (uno por renglón). Al cargar o borrar uno, el CRM recalcula los plazos pendientes | Plazos de los pedidos de datos en el CRM |
| **Ajustes** | Cambiar la contraseña | — |

## Núcleo y el Campus

- **El Campus** (`https://ava-campus.netlify.app`, repo `ava-campus`) es donde estudian los alumnos. El acceso lo da la suscripción registrada en el CRM.
- En **Cursos del Campus** se carga todo el contenido. Un curso nuevo queda como borrador: solo lo ven las cuentas de Núcleo (también desde el Campus, para revisarlo) hasta que se publica.
- Cada texto tiene español (obligatorio), inglés y portugués. Si falta un idioma, el Campus muestra el español.
- Si cambia la dirección del Campus, actualizá `NUCLEO_CAMPUS_URL` en `js/supabase-client.js`.

## Núcleo y el CRM

- **Núcleo** es solo de la dueña: el sitio, la configuración del CRM, el equipo, los roles y la auditoría.
- **El CRM** (`https://ava-crm.netlify.app`, repo `ava-crm`) es la herramienta de trabajo diario que se comparte con el equipo: mensajes, personas, pedidos de datos, consentimientos, retención, suscripciones, pagos y el sorteo de becas.
- La sección Mensajes se mudó al CRM. `/mensajes.html` redirige ahí para que los links viejos sigan funcionando.
- Equipo, Roles y Auditoría funcionan solo si la cuenta de Núcleo también es la propietaria del CRM (`crm_members.is_owner`). Hoy lo es `ilearnwithava@gmail.com`.
- Las invitaciones las manda la Edge Function `crm-equipo` (su código vive en el repo `ava-crm`). El link del email siempre lleva al CRM.
- Si cambia la dirección del CRM, actualizá `NUCLEO_CRM_URL` en `js/supabase-client.js`, las redirecciones de `netlify.toml` y la variable `CRM_URL` de la Edge Function.

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
- La clave pública de Supabase está a la vista en `js/supabase-client.js` a propósito: es pública por diseño. Lo que protege los datos son las reglas de la base: el público solo puede leer el contenido y crear mensajes o reseñas pendientes; leer mensajes y editar cualquier cosa queda para la cuenta administradora. El equipo y los roles del CRM solo los cambia la propietaria del CRM.
- Todo lo que llega de formularios públicos se muestra escapado (nadie puede meter código en el panel) y el CSV protege las celdas que Excel podría interpretar como fórmulas.

## Archivos

```
/
├── index.html · login.html · reset-password.html · 404.html
├── panel.html · contenido.html · resenas.html
├── equipo.html · roles.html · auditoria.html · feriados.html   Administración del CRM
├── campus.html                                                Cursos del Campus
├── masteres.html · precios.html · faq.html · whatsapp.html · email.html · redes.html · ajustes.html
├── css/base.css      Compartido con el sitio (colores, tipografía, botones)
├── css/nucleo.css    Estructura y componentes del panel
└── js/
    ├── supabase-client.js · guard.js · main.js   Conexión, permiso de admin, menú y avisos
    ├── copy-fields.js     Lista de todos los textos editables del sitio (claves de site_copy)
    ├── contenido.js       Editor de textos
    ├── list-editor.js     Editor compartido de Másteres, preguntas, WhatsApp, Email, Redes y el Campus
    ├── campus-admin.js    Cursos, módulos, clases y materiales del Campus
    ├── crm-admin.js       Utilidades del CRM: fechas, invitaciones, permisos y textos de la auditoría
    ├── crm-equipo.js · crm-roles.js · crm-auditoria.js · crm-feriados.js
    └── (un archivo por sección)
```
