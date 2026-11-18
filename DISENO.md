# Reglas para aplicar un diseño a este portafolio

Lee este archivo completo antes de tocar algo. Quien te escribe no programa. Responde en español, en pocas frases y sin mostrar código.

Vas a recibir una imagen de diseño y una "Ficha de estilo" (colores en hex, tipografías de Google Fonts, forma de botones y posición de la foto). Tu único trabajo es que la página se vea como esa imagen. La página ya funciona: no la reconstruyas.

## Qué sí puedes cambiar

- Colores, fondos (color sólido o degradado), bordes, sombras, esquinas y espacios.
- Tipografías: solo de Google Fonts, cambiando el `<link>` de fuentes que ya está en el `<head>` de cada plantilla.
- Tamaños de letra y de bloques.
- La posición de una pieza que ya existe, dentro de su misma sección. Por ejemplo: la foto a la izquierda o a la derecha, el nombre arriba o al lado.

Archivos que puedes editar:

- `static/css/base.css`, `inicio.css`, `sobre-mi.css`, `casos.css`, `fotos.css`, `contacto.css`.
- `templates/inicio.html`, `casos.html`, `fotos.html`, `contacto.html`, `templates/partials/header.html`, `templates/partials/footer.html`. En las plantillas solo puedes reordenar bloques completos, agregar una clase nueva o cambiar el `<link>` de fuentes.

## Qué nunca haces

- No tocas `server.py`, `app/`, `schema.sql`, `static/js/`, `templates/admin/`, `editbar.html`, `loader.html`, `editar.css`, `admin.css`, `vercel.json`, `pyproject.toml`, `requirements.txt`, `.vercelignore`, `configurar.*`, `publicar.*` ni nada de `assets/`.
- No tocas las carpetas `inicio/`, `casos/`, `fotos/` y `contacto/` de la raíz ni el `index.html` de la raíz. Son copias de respaldo. La página real está en `templates/`.
- No borras ni renombras ninguna etiqueta `{{ ... }}` o `{% ... %}`, ni ningún `id`, `class`, `data-*`, `aria-*`, `href`, `contenteditable`, `hidden` o `type="file"`. De eso depende el editor.
- No escribes textos nuevos en las plantillas ni cambias los que hay. Los textos y las fotos vienen de la base de datos y se cambian en el admin.
- No inventas datos: nombres, cargos, premios, clientes, programas, correos ni enlaces.
- No quitas piezas ni botones. Siguen: menú 01 Inicio, 02 Proyectos, 03 Fotos y 04 Contacto; botón BLACK & WHITE; Escribirme; Ver una muestra; Descargar CV; Ver todos los proyectos; íconos del pie; botón de volver arriba.
- No cambias a dónde lleva un enlace.
- No agregas páginas, secciones, carruseles, formularios, botones, íconos ni JavaScript.
- No usas la terminal, no instalas nada y no publicas.

Si la imagen muestra algo que la página no tiene, ignóralo y dilo al final en una frase.

## Clases que el JavaScript usa

Estas clases se activan solas al usar la página. Sus estilos tienen que seguir existiendo y verse bien con los colores nuevos: `bw` (modo blanco y negro), `open` (menú del celular), `hide` (pantalla de carga), `visible`, `show`, `is-out`, `no-scroll`, `case-open`, `is-video`, `is-disabled`, `is-current`, `is-live`.

El modo BLACK & WHITE debe seguir dejando toda la página en blanco y negro. Si cambias un color, revisa también su regla `body.bw` o `body.home.bw`.

## Celular

- Bajo 900 px de ancho, la portada va en este orden: nombre, luego foto, luego el resto. Está en `inicio.css`, dentro de `@media (max-width: 900px)`. No lo cambies.
- A 390 px de ancho nada puede quedar cortado ni salirse de la pantalla.

## Orden de trabajo

1. Primer pedido: aplica la imagen solo a la portada (`inicio.html`, `inicio.css`, `sobre-mi.css`, y en `base.css` lo general: fondo, cabecera, botones y pie).
2. Pedido de corrección: cambia solo lo que se nombra y deja todo lo demás igual.
3. Último pedido: lleva los mismos colores y tipografías a Proyectos, Fotos y Contacto, sin cambiar cómo se abren o se pasan las fotos y los videos.

Al terminar cada pedido, di en dos o tres frases qué cambiaste y en qué página.
