# El teorema de Karla

Una experiencia poética e interactiva para Karla (Jockey), con una constelación en forma de **K** y cierre exacto:

> Que nunca te alcance el olvido, mi eterna casualidad.

## Publicación gratuita con GitHub Pages

1. En **Settings → General → Danger Zone → Change repository visibility**, cambia el repositorio a **Public** (GitHub Pages en el plan gratuito lo requiere).
2. Abre **Settings → Pages** y selecciona **Deploy from a branch**, rama **main**, carpeta **/(root)**. Guarda.
3. La dirección prevista, cuando Pages confirme que está listo, es:
   **https://jcarreolariver-byte.github.io/teorema-de-karla/**
4. En teléfono, toca **Iniciar demostración** para habilitar sonido y comenzar.

## Audio

La experiencia funciona sin bibliotecas ni compilación: `index.html` contiene el diseño y la lógica. Incluye una atmósfera instrumental generativa provisional. Para reemplazarla con música Suno, sube tu archivo MP3 al repositorio como `audio/score.mp3`; la aplicación lo usará automáticamente en lugar del sonido generativo.

Las grabaciones originales para Daniela no se reutilizan porque mencionan su nombre.

## Personalización

En `index.html`, el objeto `gift` contiene los textos, los deseos y el cierre. La constelación K se dibuja con Canvas y el contenido se adapta a pantallas móviles.

**Privacidad:** en un repositorio público, también serán públicos sus archivos, música y textos.
