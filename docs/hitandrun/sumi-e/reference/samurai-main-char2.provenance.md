# Provenance — `samurai-main-char2`

**Estado:** REFERENCIA de estilo/key poses. No es un asset de producción. No aprobado.

## Fuente

| Campo | Valor |
| --- | --- |
| Archivo original | `.agents/skills/create-game-assets/assets/main_char2.jpg` |
| Formato original | JPEG 1408×768, RGB, sin alpha, 300 DPI, 806 KB |
| Checkerboard | **Horneado en el píxel** (blanco `#FFFFFF` + gris `~#C8C8C8` bicolor plano) |
| Herramienta generadora | Desconocida (IA presumible, sin registro) |
| Prompt / licencia | Desconocidos — **bloquean el estado `approved`** hasta registrarse |
| Fecha de llegada | 2026-10-25 |

## Transformaciones aplicadas

| Fecha | Operación | Herramienta |
| --- | --- | --- |
| 2026-10-25 | Keying por inundación desde bordes sobre máscara bicolor (gris 200±30 / blanco ≥247); configura `samurai-main-char2-alpha.png` RGBA | Script ad-hoc Python/Pillow (flood-fill BFS) |

Riesgo conocido del keying: el estilo sumi-e admite roturas de contorno 1–3 px; una inundación puede filtrarse al interior del la armadura si algún contorno se abrió. Verificación visual realizada (`samurai-main-char2-alpha-verify.jpg`): quedan parches de checkerboard visibles en la fila superior y en la salpicadura central. El alpha **no es shippable**.

## Autoresía de poses (blobs ≥ 400 px, tras flood)

- 4 frames de walk **independientes** (bbox individuales de 56–719 px de ancho).
- 3 poses grandes **fusionadas con su VFX** (salpicadura/estela toca el personaje): áreas 165k, 57k, 34k px.
- 6 VFX sueltos identificables (2 slashes negros, 2 estelas azules, splash rojo, nube de muerte).

→ Confirmación numérica de la regla del `PROMPT_CARD.md`: **el sheet no mantiene grid ni escala consistente; no se puede recortar tal cual a celdas de 64×64.**

## Puertas de aprobación pendientes

1. Origen/licencia del generador (o reencuadre como trabajo derivado de referencia no shippable).
2. ~~Verificación visual del alpha~~ → **FALLA**: fugas de checkerboard visibles; hay que rehacer
   el keying o descartar el alpha.
3. Cuantización de paleta por pose vs. tokens del brief (`paper.base` `#E8E3D4`, `ink.primary` `#171817`, `accent.vermilion` `#C0392B`, …).
4. Derivación de frames (8/8/8/6/8) en herramienta de pintura y conformado al atlas `8×5` de 64×64 con anchor `(0.5, 0.94)`.
5. Revisión a escala nativa en Canvas/Skia + captura in-engine.
