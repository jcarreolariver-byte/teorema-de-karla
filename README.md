# El teorema de Karla

Adaptación autónoma de la experiencia original: cuatro mundos Three.js, vuelos continuos, cinco deseos, dieciséis estrellas formando K, recorrido de cualidades y música original continua.

Cierre: «Que nunca te alcance el olvido, mi eterna casualidad».

Cumpleaños: 20 de octubre. Las dos grabaciones originales suenan completas en el encuentro y al completar la K. La música baja durante cada mensaje y recupera su volumen al terminar. No se genera ninguna voz.

## Desarrollo

`npm ci`, `npm test`, `npm run build`. Vite usa `/teorema-de-karla/`. No requiere backend ni claves.

## Publicación

GitHub Pages sirve la carpeta `docs` de `main`, que contiene el build verificado. Para actualizar: `npm run build:pages` y subir los cambios. El comando regenera `docs` con `.nojekyll`.

## Portada y apertura

La vista previa para WhatsApp usa `portada-karla-v1.jpg` (1200 × 630), con metadatos Open Graph disponibles sin ejecutar JavaScript.

El regalo abre el 20 de octubre de 2026 a las 00:00 de Morelia (`America/Mexico_City`, UTC−06:00; `2026-10-20T06:00:00Z`). La cuenta usa Date/Age del servidor y un reloj monotónico; no depende de la hora configurada en el teléfono. La app, sus texturas 3D, música y voces se cargan después de la apertura. Antes solo se descarga el fondo de la espera.

GitHub Pages es estático: esta espera regula la visita normal; no es una barrera de acceso a los archivos públicos ni al código del repositorio.
