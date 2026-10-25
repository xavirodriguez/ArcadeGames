# Provenance — `player` (Sumi-e ronin pilot)

**Estado:** PILOTO técnico. No aprobado. No cableado al juego.
**Asset:** `src/games/hitandrun/assets/themes/sumi-e/characters/player.png`
**Manifiesto:** `character-player-ronin` en [`../asset-manifest.json`](../asset-manifest.json)

## Fuente

| Campo | Valor |
| --- | --- |
| Herramienta | `docs/hitandrun/sumi-e/tools/generate_player_sumi_e.py` |
| Tipo | Generación procedural determinista (sin modelo de IA, sin imágenes de entrada) |
| Autoría | Proyecto (código propio) |
| Licencia | MIT (repositorio) |
| Fecha | 2026-10-25 |
| Salida | `512 × 320` PNG-32 RGBA8888, 40 frames, 7 swatches |
| SHA-256 | `7381293b7a5cdb21c458309ab02762a54acae544043139a42b8fd518b19c8742` |
| Determinismo | Dos ejecuciones consecutivas producen bytes idénticos |

## Referencia de estilo

La hoja `docs/hitandrun/sumi-e/reference/samurai-main-char2-alpha.png`
(`.agents/skills/create-game-assets/assets/main_char2.jpg`) se usó **solo como key poses y
lenguaje de tinta** (kasa ancha, rifle largo en diagonal, faldón, masas de tinta rotas).

- No se recortó, trazó ni sampleó ningún píxel de esa hoja.
- El generador dibuja con primitivas propias (trazos de pincel, discos, aguadas) sobre una paleta
  fija de 7 swatches.
- La hoja de referencia sigue sin licencia conocida y **no es shippable**; este piloto no hereda
  ese problema porque no incorpora su contenido.

## Transformaciones

| Fecha | Operación | Herramienta |
| --- | --- | --- |
| 2026-10-25 | Generación del atlas + `atlas.json` + `animations.json` | `generate_player_sumi_e.py` |
| 2026-10-25 | Auditoría de paleta/alpha/safe area | `asset_report_sumie.py` |
| 2026-10-25 | Contact sheet y hoja de legibilidad | `build_atlas_contact_sheet.py`, `build_readability_sheet.py` |

## Verificación

- [x] `512 × 320`, grid `8 × 5`, celda `64 × 64`, 40 frames.
- [x] Frame map `idle 0–7 / walk 8–15 / attack 16–23 / hurt 24–29 / empty 30–31 / death 32–39`.
- [x] Anchor `(0.5, 0.94)`; pies en `y ≈ 59.6`; celdas 30–31 vacías.
- [x] PNG-32 con alpha continuo (4–255), sin fondo horneado.
- [x] 7 swatches RGB exactos, 0 píxeles fuera de paleta, 0 rellenos negros/blancos puros.
- [x] Acento (oro + bermellón) 2,78 % de los píxeles pintados con alpha ≥ 128.
- [x] Safe area 2 px: PASS en las 40 celdas.
- [x] Revisión a escala nativa (1:1) sobre papel y grayscale.
- [ ] Revisión in-engine (Canvas 800×600 y Skia).
- [ ] Keyline de papel en runtime o restricción a zonas de papel (falla el stress test de tinta).
- [ ] Wiring: clave de asset por tema + fallback al `player` procedural actual.

## Puertas antes de `approved`

1. Revisar el atlas a 64 px en Canvas y Skia, sobre papel y sobre tinta.
2. Resolver la legibilidad sobre tinta (decisión compartida con el piloto `samurai`).
3. Cablear la clave `hitrun_sumi_e_player` sin romper `SumiETheme.renderEntity("player")`.
4. Revisión visual del usuario sobre este piloto.
