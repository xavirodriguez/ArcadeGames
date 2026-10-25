# Sumi-e — Prompt Card (Hit & Run)

**Uso:** generar conceptos y poses de referencia para el pipeline Sumi-e.
**No es un asset aprobado.** Un prompt no sustituye la normalización, la revisión a escala nativa
ni la validación en el juego.

---

## 1. Regla de oro

```
generate -> inspect -> normalize -> validate in engine -> record provenance -> approve
```

Si el resultado no se puede recortar a `64 × 64`, no tiene alpha real o no se lee a escala 1:1,
no es un asset: es una referencia.

---

## 2. Flujo recomendado para personajes

No pidas un atlas completo de 40 frames en un solo prompt. Los modelos no mantienen el grid,
las proporciones ni el frame map. Haz esto:

1. **Concept sheet** (`1024 × 1024`): 3 vistas del personaje (front, side, back) para aprobar
   diseño, proporciones y paleta.
2. **Key poses** (`1024 × 1024`, una por prompt, usando el concept como referencia):
   `idle`, `attack`, `hurt`.
3. **Limpieza y animación:** en una herramienta de pintura/vector o con un rig simple, deriva los
   8/8/8/6/8 frames manteniendo el baseline.
4. **Atlas:** compón el grid `8 × 5` de `64 × 64` y exporta PNG-32.
5. **QA:** `asset_report.py`, preview a 64 px, revisión en Canvas y Skia.

Para enemigos, repite el flujo usando el piloto aprobado como referencia de estilo.

> **Samurai:** no generes su atlas con un prompt. Ya existe el generador determinista
> `tools/generate_samurai_sumi_e.py` (`512×320`, 40 frames, 7 swatches). Usa prompts para el
> `player` ronin y el resto de la familia.
>
> La hoja `reference/samurai-main-char2` es un ejemplo de output que **no** se puede recortar:
> poses fusionadas con VFX, checkerboard horneado y escala inconsistente. Úsala como referencia
> de estilo/key poses, nunca como atlas.

---

## 3. Global style block

Copia este bloque en todos los prompts de personajes y props. Ajusta solo `SUBJECT` y
`TECHNICAL OUTPUT`.

```text
ROLE/PURPOSE: production concept for a side-scrolling ink-wash arcade game
SUBJECT: [specific character, action and weapon]
VIEW: side view, facing right, full body, feet at the bottom edge, neutral idle
ART DIRECTION: Japanese sumi-e ink wash and ukiyo-e silhouette; organic asymmetric shapes;
  broken dry-brush contour; flat ink washes; paper negative space; one accent color per character;
  no digital airbrush, no pixel-art outline, no neon
PALETTE: washi paper #E8E3D4, warm paper #DCD6C2, ink #171817, muted ink #3A3A35,
  vermilion #C0392B, gold #B8963E, oni blue #3D6FA5, oni red #B53A2A
GAME-SCALE READ: 64x64 px on an 800x600 logical viewport; silhouette must read at 1:1;
  details smaller than 2 px will disappear
TECHNICAL OUTPUT: 1024x1024 PNG, transparent background, centered, full body, no labels
LOCKS: preserve silhouette, proportions, palette, facing and feet baseline from the reference
EXCLUDE: text, kanji, logos, UI, frames, borders, watermark, multiple characters, cropped limbs,
  neon, glow, bloom, pure black fill (#000000), pure white fill (#FFFFFF), chrome, photorealism
```

### Negative prompt (si el modelo lo permite)

```text
neon, glowing edges, bloom, lens flare, chromatic aberration, pure black background,
pure white background, checkerboard, pixel art, 1px outline, photorealism, 3D render,
western fantasy armor, chrome, text, letters, kanji, watermark, signature, frame, border,
multiple characters, cropped feet, extra limbs, inconsistent proportions
```

---

## 4. Pilot prompts

### 4.1 Player ronin — concept sheet

```text
SUBJECT: a lean wandering ronin, worn conical kasa hat, short coat, sash, bare feet or straw
  sandals, a long matchlock rifle held diagonally across the body, calm forward stance
VIEW: three views in a row — front, right-side, back — same scale, same lighting
ART DIRECTION: [paste Global style block]
GAME-SCALE READ: the side view must read as kasa brim + diagonal rifle + coat hem at 64x64
TECHNICAL OUTPUT: 1024x1024 PNG, transparent background, even spacing, no labels
LOCKS: asymmetric hat brim, rifle longer than the torso, one vermilion sash accent
EXCLUDE: [paste Global exclude list]
```

### 4.2 Player ronin — idle key pose

```text
SUBJECT: the same ronin in a grounded idle stance, rifle held low-diagonal, coat hem still,
  kasa casting a flat ink shadow, facing right
VIEW: side view, full body, feet at the bottom edge, centered
ART DIRECTION: [paste Global style block]
GAME-SCALE READ: 64x64 px; the rifle and hat must remain separate from the body mass
TECHNICAL OUTPUT: 1024x1024 PNG, transparent background, single character, no labels
LOCKS: preserve the approved concept sheet proportions and palette
EXCLUDE: [paste Global exclude list]
```

### 4.3 Enemy samurai — idle key pose

```text
SUBJECT: a disciplined enemy samurai, dark lacquered helmet, vertical body mass, katana held
  in a low guard, one gold accent on the helmet, facing right
VIEW: side view, full body, feet at the bottom edge
ART DIRECTION: [paste Global style block]
GAME-SCALE READ: 64x64 px; helmet and katana must break the body silhouette
TECHNICAL OUTPUT: 1024x1024 PNG, transparent background
LOCKS: vertical silhouette, katana longer than the torso
EXCLUDE: [paste Global exclude list]
```

### 4.4 Blue oni elite — idle key pose

```text
SUBJECT: a broad-shouldered blue oni elite, two horns above the shoulder line, heavy iron club,
  short armored skirt, facing right
VIEW: side view, full body, feet at the bottom edge
ART DIRECTION: [paste Global style block]
GAME-SCALE READ: 64x64 px; horns and club must create a unique silhouette against the red oni
TECHNICAL OUTPUT: 1024x1024 PNG, transparent background
LOCKS: horn shape, shoulder width, club mass
EXCLUDE: [paste Global exclude list]
```

### 4.5 Red oni charger — attack key pose

```text
SUBJECT: a lean red oni charging forward, forward lean, horns swept back, long katana in a
  rising arc, torn sash trailing, facing right
VIEW: side view, full body, feet at the bottom edge
ART DIRECTION: [paste Global style block]
GAME-SCALE READ: 64x64 px; the lean and the katana arc must differ from the blue oni's club
TECHNICAL OUTPUT: 1024x1024 PNG, transparent background
LOCKS: forward lean, swept horns, rising katana arc
EXCLUDE: [paste Global exclude list]
```

---

## 5. Environment, UI and VFX prompts

### 5.1 Parallax environment concept

```text
SUBJECT: a Japanese feudal landscape at dusk for a side-scrolling belt level: distant ink-wash
  mountains, a torii gate, roof silhouettes, a pale red sun, empty paper sky
VIEW: side-scrolling background, 4:3, layered for parallax
ART DIRECTION: [paste Global style block]
TECHNICAL OUTPUT: 1600x1200 PNG, no characters, no UI, no text, no collision cues
LOCKS: 5 depth layers, paper negative space in the sky, no hard horizon line
EXCLUDE: [paste Global exclude list]
```

### 5.2 Hanko seal

```text
SUBJECT: a single vermilion hanko seal with the kanji 生, thick irregular border, slightly worn
  stamp texture, paper negative space inside the strokes
VIEW: flat, front-facing, centered
ART DIRECTION: [paste Global style block]
TECHNICAL OUTPUT: 512x512 PNG, transparent background, no paper texture behind the seal
LOCKS: square seal, thick border, one kanji, slight rotation is allowed in code
EXCLUDE: neon, glow, drop shadow, multiple seals, text other than the kanji, frame
```

### 5.3 Ink splatter decal

```text
SUBJECT: a single black ink impact splatter with a dense center, 4-6 satellite drops and one
  dry trailing stroke, no symmetry
VIEW: top-down / screen-space decal
ART DIRECTION: [paste Global style block]
TECHNICAL OUTPUT: 512x512 PNG, transparent background, pure ink on alpha, no paper
LOCKS: readable at 24-48 px, no colored glow
EXCLUDE: blood red, neon, glow, multiple splatters, frame, text
```

### 5.4 Ofuda talisman

```text
SUBJECT: a single paper ofuda talisman, aged gold border, vermilion seal, two black brush
  strokes, slightly curled corner
VIEW: flat, front-facing, vertical
ART DIRECTION: [paste Global style block]
TECHNICAL OUTPUT: 256x256 PNG, transparent background
LOCKS: paper gold, red seal, black strokes, no readable text
EXCLUDE: neon, glow, multiple talismans, frame, watermark
```

---

## 6. Alpha, normalization and QA

- Pide **transparent background** en la herramienta, no solo en el prompt.
- Verifica el alpha con `asset_report.py --require-alpha`; un fondo horneado o un checkerboard
  falla la puerta.
- Recorta, centra y escala con nearest/linear según el destino; no confíes en el grid generado.
- Para personajes, compón el atlas `512 × 320` con celdas `64 × 64` y anchor `(0.5, 0.94)`.
- Revisa a 64 px sobre papel claro y sobre una zona de tinta.
- No marques `approved` hasta que pase las puertas de `ART_DIRECTION_BRIEF.md §7`.

```bash
# auditor Sumi-e del piloto
python3 docs/hitandrun/sumi-e/tools/asset_report_sumie.py \
  src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png

# auditor genérico (sin --max-colors para alpha suave)
python3 .agents/skills/create-game-assets/scripts/asset_report.py \
  src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png \
  --expect-size 512x320 --require-alpha --json

# contact sheet
python3 .agents/skills/create-game-assets/scripts/build_preview_sheet.py \
  src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png \
  --out docs/hitandrun/sumi-e/characters-preview.png --columns 4 --cell-size 192
```

> Entorno actual: Python 3.9.6 + Pillow 11.3.0. `--max-colors 8` cuenta tuplas RGBA y no aplica a
> alpha suave; el criterio Sumi-e se audita con `asset_report_sumie.py` (7 swatches RGB). Ver
> `ASSET_AUDIT.md §6`.

---

## 7. Provenance record (copiar por asset)

```json
{
  "asset_id": "character-player-ronin",
  "tool": "",
  "model": "",
  "date": "",
  "prompt": "",
  "negative_prompt": "",
  "seed": "",
  "reference_images": [],
  "license_or_terms": "",
  "edits": [],
  "source_file": "",
  "final_file": ""
}
```

Guarda este registro junto al asset y actualiza `asset-manifest.json` antes de aprobar.
