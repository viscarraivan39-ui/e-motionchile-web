# Regla oficial de activos visuales — E-motion Chile SpA

## REGLA CRÍTICA: NO REINTERPRETAR ACTIVOS APROBADOS

Cuando una imagen, banner, logo, mockup, captura o composición visual haya sido **aprobada explícitamente por el propietario del proyecto**, esa pieza se considera un **ACTIVO VISUAL OFICIAL**.

### Debe ocurrir esto

`IMAGEN APROBADA → ARCHIVO ORIGINAL → /assets/ → REFERENCIA DIRECTA EN HTML/CSS → WEB`

### Nunca debe ocurrir esto

`IMAGEN APROBADA → reinterpretación → rediseño → SVG parecido → WEB`

## Reglas de implementación

1. **No generar una imagen similar** si ya existe una imagen aprobada.
2. **No redibujar logos** con CSS, texto, iconos o SVG alternativo cuando existe el logo oficial.
3. **No cambiar colores, proporciones, composición ni elementos internos** del activo aprobado.
4. **No usar `object-fit: cover` ni `aspect-ratio` que recorte una imagen aprobada.** El activo debe mostrarse completo salvo que el propietario solicite explícitamente un recorte.
5. Si el activo aprobado es raster y debe mantenerse como archivo dentro de GitHub, puede encapsularse en un SVG con `data:image/...;base64` sin alterar la imagen original.
6. Los archivos visuales aprobados deben tener nombres claros y estables.
7. Los archivos `*-visual.svg`, `*-card.svg` o `*-preview.svg` que sean reinterpretaciones **no pueden sustituir** a un activo aprobado.
8. Si falta el archivo exacto aprobado, **NO se debe inventar un reemplazo y presentarlo como si fuera el mismo**. Se debe dejar constancia de que falta el asset original.
9. Antes de publicar un cambio visual, comprobar que la ruta HTML/CSS apunta al archivo aprobado correcto.
10. Si una imagen se ve diferente en la web respecto de la imagen aprobada, revisar primero la ruta del asset, `object-fit`, `aspect-ratio`, `width/height`, compresión y caché antes de generar una nueva imagen.

## Estado actual del repositorio

Se corrigió el CSS para que las imágenes no sean recortadas automáticamente.

La regla queda documentada en este archivo y debe considerarse obligatoria para futuras modificaciones.

**Importante:** las imágenes exactas aprobadas que están disponibles en el entorno de trabajo (`emotion_assets/`) todavía no están todas almacenadas como archivos equivalentes dentro de este repositorio. Por eso no se deben cambiar las referencias actuales a nombres que todavía no existen en GitHub.

**ForestaMetrics:** el repositorio contiene `assets/forestametrics-preview.svg`. Si existe una imagen oficial aprobada distinta, debe incorporarse como archivo exacto antes de considerarla definitiva.

## Criterio de aprobación

La frase del propietario **"esta imagen es la que va"**, **"usa esta misma"**, **"esa es la aprobada"** o equivalente significa que el archivo visual es definitivo y no puede ser reinterpretado durante la implementación.
