# Sumi-e — Hit & Run asset package

**Estado:** propuesta de dirección artística · **1 piloto producido (`samurai`), 0 aprobados**
**Juego:** `hitandrun` · **Tema:** `sumi-e`
**Fecha:** 2026-10-25

Este paquete traduce la estética Sumi-e en un contrato visual y técnico accionable. No contiene
arte final aprobado: contiene un piloto, una referencia no shippable, el target, el manifiesto,
la auditoría del estado actual y el flujo de producción.

---

## Entregables

| Documento | Para qué sirve |
| --- | --- |
| [`ART_DIRECTION_BRIEF.md`](./ART_DIRECTION_BRIEF.md) | Dirección visual, paleta, siluetas, contrato técnico, puertas de aceptación. |
| [`ASSET_AUDIT.md`](./ASSET_AUDIT.md) | Evidencia del estado actual: atlas neón, manifiesto muerto, HUD, fuentes, rendimiento. |
| [`asset-manifest.json`](./asset-manifest.json) | Inventario de 24 assets con estado, especificaciones, locks, procedencia y verificación. |
| [`target-board.svg`](./target-board.svg) | Greybox visual a escala nativa: frame 800×600, paleta, frame map, DO/DON'T. |
| [`PROMPT_CARD.md`](./PROMPT_CARD.md) | Prompts y flujo generate → normalize → validate → provenance. |
| [`atlas-readability.png`](./atlas-readability.png) | Piloto en 3 lecturas: papel / tinta / escala de grises. |
| [`characters-preview.png`](./characters-preview.png) | Contact sheet del piloto (checkerboard). |
| [`reference/samurai-main-char2.provenance.md`](./reference/samurai-main-char2.provenance.md) | Procedencia de la referencia de estilo/key poses; **no shippable**. |
| `tools/generate_samurai_sumi_e.py` | Generador determinista del atlas piloto (rerun = bytes idénticos). |
| `tools/asset_report_sumie.py` | Auditor Sumi-e: paleta ≤ 8, acento ≤ 5 %, safe area 2 px, alpha suave. |

Abrir `target-board.svg` en un navegador para verlo a tamaño completo.

---

## Hallazgos clave

1. **No hay arte Sumi-e aprobado.** Hay un piloto `samurai` generado y validado
   técnicamente, y una referencia `samurai-main-char2` no shippable. El único raster
   productivo cableado sigue siendo `samurai-enemy.png`: pixel art neón de 24 colores,
   alpha binario y contorno blanco.
2. **El manifiesto existente es código muerto.** `SUMI_E_ASSET_MANIFEST.ts` no se importa en
   ningún sitio y sus rutas no existen.
3. **El samurai esquiva el tema.** Se carga con una clave fija y `CanvasSpriteDrawer` no consulta
   el tema; el piloto Sumi-e existe pero no está cableado. El resto de enemigos sí pasan por
   `SumiETheme`.
4. **El HUD React sigue siendo neón.** El canvas puede ser Sumi-e, pero la barra superior y las
   pantallas de inicio/game over no comparten tokens.
5. **Las fuentes no se cargan.** `Yuji Boku` se referencia en el tema y `Noto Serif JP` se
   propone para el HUD, pero no hay `expo-font`; el resultado cae a `serif`.
6. **El papel se genera full-screen.** `initParchmentAndBorder` hace `getImageData` por píxel en
   cada resize; conviene cachear o usar un tile.
7. **El piloto falla en tinta sólida.** En papel y grayscale lee; sobre `#171817` la masa negra
   desaparece y solo quedan los acentos. Hace falta un keyline de papel en runtime o restringirlo
   a zonas de papel; no añadir un contorno blanco al atlas.
8. **La referencia no es un atlas.** `samurai-main-char2` tiene fugas de checkerboard en el alpha,
   poses fusionadas con VFX y escala inconsistente. Es estilo, no un asset recortable.

---

## Próxima puerta

1. ~~Elegir el piloto~~ → **samurai** (único personaje con ruta de sprite cableada). Atlas
   512×320 producido y validado; pendiente de revisión visual del usuario y del chequeo
   in-engine (Canvas 800×600 + dispositivo).
2. Wiring in-engine (fuera de alcance de "solo assets"): clave de asset por tema
   (`hitrun_sumi_e_samurai`) + fallback al atlas actual, sin tocar `SamuraiAnimationSystems`.
3. Resolver los dos bloqueantes de coherencia restantes:
   - cargar `Yuji Boku` / `Noto Serif JP`;
   - tokens Sumi-e en el HUD React.
4. Resolver la legibilidad sobre tinta: keyline de papel en runtime o restricción a zonas de
   papel. El fallo está en `atlas-readability.png` y en el campo `readability` del manifiesto.
5. Producir el resto de la familia a partir del piloto validado (`player` o siguiente enemigo).
6. Registrar procedencia y actualizar `asset-manifest.json` antes de aprobar (**hecho** para el
   piloto: `status: "pilot"`, `in_engine_reviewed: false`).

---

## Comandos de QA

```bash
# entorno actual: Python 3.9.6 con Pillow 11.3.0 (instalado con pip3 install --user pillow)

# auditor Sumi-e (paleta, acento, safe area, alpha)
python3 docs/hitandrun/sumi-e/tools/asset_report_sumie.py \
  src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png

# auditor genérico del skill (cuenta tuplas RGBA: con alpha suave NO aplica --max-colors 8)
python3 .agents/skills/create-game-assets/scripts/asset_report.py \
  src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png \
  --expect-size 512x320 --require-alpha --json

# contact sheet
python3 .agents/skills/create-game-assets/scripts/build_preview_sheet.py \
  src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png \
  --out docs/hitandrun/sumi-e/characters-preview.png --columns 4 --cell-size 192

# regenerar el atlas (determinista; reproduce bytes idénticos)
python3 docs/hitandrun/sumi-e/tools/generate_samurai_sumi_e.py
```

> Entorno actual: Python 3.9.6 + Pillow 11.3.0. El reporte genérico con `--max-colors 8` cuenta
> tuplas RGBA y no aplica a alpha suave; el criterio Sumi-e se audita con `asset_report_sumie.py`
> (7 swatches RGB, acento 4.31 %, safe area OK). Ver `ASSET_AUDIT.md §6`.

---

## Relación con el roadmap

Este paquete es el nivel de **assets** del roadmap
[`docs/AESTHETIC_THEME_SYSTEM_ROADMAP.md`](../../AESTHETIC_THEME_SYSTEM_ROADMAP.md).
El roadmap define el contrato `ThemeRenderer`/`ThemeTokens`; este paquete define qué arte necesita
ese contrato para que Sumi-e sea real y no solo procedimental.
