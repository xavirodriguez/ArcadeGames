# Sumi-e — Asset Audit (Hit & Run)

**Fecha:** 2026-10-25
**Alcance:** assets, manifiesto, fuentes, HUD y pipeline visual del tema `sumi-e`.
**Método:** inspección estática de código, medición de PNGs y ejecución del generador prototipo;
sin ejecución del juego.

---

## 1. Resumen ejecutivo

No existe todavía un asset **Sumi-e** aprobado. Sí existe un **piloto** generativo para el enemigo
`samurai` (`src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png` +
`tools/generate_samurai_sumi_e.py`), validado a nivel de atlas y de legibilidad sobre papel y
grayscale, pero no en el juego. El único raster productivo de personaje sigue siendo el atlas de
samurai en estilo **neón/pixel art**, y el tema Sumi-e dibuja casi todo con formas procedurales.
Además, el HUD React sigue siendo neón. El resultado es que en una misma partida conviven tres
lenguajes visuales:

1. Fondo y HUD canvas: papel, tinta y sellos (Sumi-e).
2. Samurai: pixel art rojo/negro con contorno blanco (neón) o piloto Sumi-e, según el wiring.
3. HUD React: cian, violeta, rosa y glow (neón).

El piloto falla en el stress test de tinta sólida: la masa negra desaparece y solo quedan los
acentos dorado y bermellón. Es el principal hallazgo de la hoja de legibilidad
(`atlas-readability.png`).

El manifiesto `SUMI_E_ASSET_MANIFEST.ts` es aspiracional y **no se consume desde ningún sitio**.
Sus rutas no existen y sus dimensiones no coinciden con el atlas real.

---

## 2. Evidencia

### 2.1 El manifiesto Sumi-e es código muerto

- `src/games/hitandrun/rendering/theme/sumi-e/SumiEAssetManifest.ts` exporta
  `SUMI_E_ASSET_MANIFEST` y `SUMI_E_ASSET_PROMPTS`.
- `grep` en `src/` no encuentra ningún import de ninguno de los dos.
- Las rutas declaradas (`assets/themes/sumi-e/...`) no existen en el repositorio.
- El tema `SumiETheme.ts` no lee el manifiesto: dibuja formas con `ctx` para `player`, `popcorn`,
  `charger` y `elite`.

### 2.2 Discrepancias técnicas del manifiesto

| Campo | Manifiesto | Atlas real | Impacto |
| --- | --- | --- | --- |
| Celda `player` | `64 × 64` | `64 × 64` | Coincide |
| Celda `blue_oni` | `80 × 80` | No existe | Rompe el frame map |
| Celda `red_oni` | `72 × 72` | No existe | Rompe el frame map |
| Celda `skeleton_warrior` | `60 × 60` | No existe | Rompe el frame map |
| Celda `tengu_bird` | `64 × 64` | No existe | Coincide en tamaño, no en ID |
| Anchor | `y = 1.0` en todos | `y = 0.94` | Cambia el baseline y los pies |
| `baseScale` | 1.0–1.2 | El drawer no lo usa | Escala prometida pero ignorada |
| Frames por clip | 1 frame por clip | 8/8/8/6/8 | Placeholder, no producción |
| FPS | 6–12 variables | 8/10/14/16/10 | Inconsistente |
| IDs | `blue_oni`, `red_oni`, `skeleton_warrior`, `tengu_bird` | `elite`, `charger`, `wall_trooper`, `hopper`, `popcorn` | No mapean al ECS |

### 2.3 Atlas existente: medición real

`src/games/hitandrun/assets/samurai-enemy.png`:

| Propiedad | Valor medido |
| --- | --- |
| Dimensiones | `512 × 320` |
| Formato | PNG-8, color type 3 (paleta), sin interlace |
| Alpha | `tRNS` con **1 índice transparente** (alpha binario) |
| Paleta | 24 colores |
| Píxeles transparentes | 111.071 de 163.840 (≈ 67,8 %) |
| Outline | `#13141C` (casi negro azulado) |
| Rojo principal | `#9B1B2B` / `#5E1A25` |
| Highlight | `#E6EDEE` (blanco frío) |
| Oro | `#DE9C4B` / `#F9C954` |
| Grid | 8 × 5, celdas `64 × 64` |
| Anchor | `(0.5, 0.94)` |
| Clips | idle 0–7, walk 8–15, attack 16–23, hurt 24–29, empty 30–31, death 32–39 |

**Conclusión:** el atlas es pixel art de 24 colores con alpha binario y contorno blanco. No puede
reproducir bordes de pincel, aguadas ni transparencia suave. Es válido para el tema `fantasy`,
no para Sumi-e.

### 2.4 El sprite del samurai esquiva el tema

- `HitRunEnemyPool.acquireEnemy` usa `shape: "sprite"` solo para el arquetipo `samurai` cuando
  `SAMURAI_SPRITE_READY_RESOURCE === true`.
- El resto de arquetipos (`popcorn`, `wall`, `hopper`, `charger`, `elite`) usan sus shapes y, por
  tanto, pasan por `ThemeRegistry.getActiveTheme().renderEntity(...)`.
- El sprite se dibuja con `CanvasSpriteDrawer`, que no consulta el tema ni `Render.size`.
- `SumiETheme.renderEntity` no tiene una rama para `samurai`: si el sprite no está listo, se usa
  `drawHitRunSamuraiFallback`, que dibuja un samurai neo-retro procedural con colores fijos
  (`#c92337`, `#171923`, `#e6b84b`).

**Resultado:** el jugador y cuatro enemigos pueden ser Sumi-e, pero el samurai seguirá siendo neón
si se carga el legacy; el piloto Sumi-e existe pero aún no está cableado. La inconsistencia es
visible en la misma oleada.

Además, `SumiETheme.renderEntity` solo tiene ramas para `player`, `popcorn`, `charger` y `elite`.
`wall_trooper` y `hopper` caen en el `default`, que dibuja la misma silueta de oni azul que
`elite`. En una oleada, tres arquetipos distintos se ven iguales.

| `visualId` | Rama en `SumiETheme` | Resultado actual |
| --- | --- | --- |
| `player` | `player` | Ronin blocky (rects + triángulo) |
| `popcorn` | `popcorn` | Círculo negro + punto rojo |
| `charger` | `charger` | Círculo rojo + cuerno |
| `elite` | `elite` | Círculo azul + punto dorado |
| `wall_trooper` | `default` | **Círculo azul (oni equivocado)** |
| `hopper` | `default` | **Círculo azul (oni equivocado)** |
| `samurai` | sprite / fallback | Sprite neón o fallback neo-retro |

### 2.5 El HUD React no comparte tokens

- `src/app/hitandrun/index.tsx` pinta el HUD con `colors.cyan`, `colors.pink`, `colors.violet`,
  `rgba(10, 10, 20, 0.75)` y `typography.game`.
- El HUD canvas del tema pinta sellos y tinteros Sumi-e.
- `GameThemeProvider` existe y expone `accentColors`, pero no se usa en Hit & Run y no incluye
  tokens Sumi-e (`paper`, `ink`, `vermilion`, `gold`).

**Resultado:** aunque el canvas sea Sumi-e, la barra superior y la pantalla de inicio/game over
seguirán siendo neón.

### 2.6 Fuentes referenciadas pero no cargadas

- `SumiETheme.ts` usa `'Yuji Boku'` y `'Share Tech Mono'` en `ctx.font`.
- `'Yuji Boku'` y `'Noto Serif JP'` no se cargan en ningún sitio (`expo-font` no se usa para ellas).
- `app.json` incluye el plugin `expo-font`, pero no hay registro de estas familias.
- El resultado real es un fallback a `serif` del sistema; la caligrafía no se ve.

### 2.7 Riesgo de rendimiento en el papel

- `SumiETheme.initParchmentAndBorder` crea un canvas offscreen del tamaño del viewport y ejecuta
  `getImageData` + bucle por píxel + `putImageData` en cada resize.
- A `800 × 600 × DPR 3`, son ~4,3 M de píxeles por reconstrucción, con un bucle JS de ~17 M de
  operaciones. Es aceptable una vez, pero costoso si se recalcula al cambiar orientación o tamaño.
- No hay límite de tamaño ni reutilización de la textura entre temas.

### 2.8 Assets de UI y audio

- No hay assets de UI Sumi-e: sellos, tinteros, paneles y botones se dibujan en canvas o React.
- El audio actual usa MP3 genéricos (`shoot.mp3`, `hit.mp3`, `explosion.mp3`), no recetas Sumi-e.
- `@tiny-aster/arcade-sound-kit` ya existe y puede generar los efectos; no hay que añadir un
  `SoundSynth` nuevo.

### 2.9 Piloto generativo del samurai

El workspace ya contiene un piloto completo, no solo un prototipo:

| Archivo | Rol | Estado |
| --- | --- | --- |
| `tools/generate_samurai_sumi_e.py` | Generador determinista; escribe atlas + `atlas.json` + `animations.json` | Pilot |
| `src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png` | Atlas piloto `512 × 320`, 40 frames | Pilot |
| `.../samurai.atlas.json` | Frame map 8×5, pivote `(0.5, 0.94)` | Pilot |
| `.../samurai.animations.json` | Clips 8/8/8/6/8 | Pilot |
| `atlas-readability.png` | Sheet de legibilidad: papel / tinta / grayscale | Evidencia |
| `characters-preview.png` | Contact sheet sobre checkerboard | Evidencia |
| `tools/asset_report_sumie.py` | Auditor de paleta, acento, safe area y alpha | QA |

**Validación ejecutada:** el atlas se generó con el script (sin Pillow; el atlas es
dependency-free) y se midió el PNG:

- `512 × 320`, RGBA8888, 40 frames, celdas `64 × 64`, 34.042 bytes.
- **7 colores RGB exactos:** `#171817`, `#3A3A35`, `#B8963E`, `#6E6B5E`, `#8E2A20`, `#C0392B`,
  `#F2EEE3`; 0 píxeles fuera de paleta.
- Alpha: 130.729 píxeles transparentes, 13.731 con alpha parcial, 19.380 opacos.
- Frames 30 y 31 vacíos (correcto).
- BBox local por celda: `x[15,61]`, `y[10,61]`; safe area de 2 px: PASS. (`asset_report.py`
  reporta el bbox global del atlas como `[22, 10, 510, 318]`.)
- Baseline: el shadow de muerte llega a `y=61`; no toca el borde inferior.
- Acento bermellón: 4,31 % de los píxeles pintados con alpha ≥ 128 (≤ 5 %).
- JSON: `frameOrder`, pivote `(0.5, 0.94)`, clips y `frameRate` coinciden con el contrato.
- `tools/asset_report_sumie.py`: PASS.

**Legibilidad (`atlas-readability.png`):**

| Fondo | Resultado |
| --- | --- |
| Papel `#E8E3D4` | ✅ La silueta, la katana y los acentos se leen |
| Tinta sólida `#171817` (stress test) | ❌ La masa negra desaparece; solo quedan los acentos dorado y bermellón |
| Grayscale | ✅ La silueta se mantiene |

En el fondo real (papel con montañas al 6–16 % de tinta), el piloto lee. El fallo aparece en una
zona de tinta sólida, que hoy no es el fondo jugable pero sí un caso que la puerta de aceptación
exige cubrir.

**Lo que cubre:** el enemigo `samurai` (katana, casco, acentos dorados, faja bermellón).
**Lo que no cubre:** el `player` ronin (kasa + rifle), los onis, el ashigaru, el tengu ni el
diablillo. Tampoco sustituye la validación en Canvas/Skia ni la decisión de reemplazar el atlas
legacy.

**Decisión pendiente:** para que el piloto lea sobre tinta hace falta una de estas opciones:
1. Keyline de papel en runtime cuando el fondo sea oscuro (presentación, no asset).
2. Restringir el samurai a zonas de papel y documentar la limitación.
3. Aclarar la masa a `ink.muted #3A3A35` o `wash #6E6B5E`, perdiendo parte del contraste Sumi-e.

No añadir un contorno blanco al atlas: viola la regla de borde y se ve como glow.

### 2.10 Referencia `samurai-main-char2` (no shippable)

El workspace también contiene una hoja de referencia de estilo/key poses, con procedencia propia:

| Archivo | Rol | Estado |
| --- | --- | --- |
| `reference/samurai-main-char2-alpha.png` | Referencia `1408 × 768` con alpha keyed | Referencia |
| `reference/samurai-main-char2-alpha-verify.jpg` | Verificación del keying sobre checkerboard | Evidencia |
| `reference/samurai-main-char2.provenance.md` | Procedencia y puertas pendientes | Registro |

**Qué aporta:** proporciones, armadura, katana, pose y tratamiento de tinta. Es útil para el
enemigo samurai; para el `player` ronin sirve solo como referencia de tinta/pose, no de silueta
(kasa + rifle).
**Qué falla:**
- El checkerboard está horneado en el JPEG original; el flood-fill deja parches visibles en la
  verificación (fila superior y salpicadura central).
- 4 frames de walk independientes, 3 poses fusionadas con su VFX y 6 VFX sueltos; no hay grid ni
  escala consistente.
- Generador, prompt y licencia desconocidos; no se puede aprobar ni shippear.

**Uso permitido:** referencia de estilo y key poses. **Prohibido:** recortar tal cual a celdas
`64 × 64`, publicar como asset o asumir que el alpha está limpio.

---

## 3. Matriz de cumplimiento Sumi-e

| Criterio | Atlas legacy | Piloto samurai |
| --- | --- | --- |
| Paleta de papel/tinta | ❌ Negro azulado, rojo neón, blanco frío | ✅ 7 swatches exactos, 0 off-palette |
| Alpha suave de pincel | ❌ Alpha binario | ✅ Rampa continua 4–255 |
| Contorno roto | ❌ Contorno de píxel continuo | ✅ Dry-brush y bordes suaves |
| Sin glow/neón | ❌ Highlight blanco frío y rojo saturado | ✅ Sin glow, sin blanco puro de relleno |
| Silueta a 64 px | ✅ El samurai se lee bien | ✅ La katana y el casco se leen |
| Grid y anchor | ✅ 8×5, `(0.5, 0.94)` | ✅ 8×5, `(0.5, 0.94)` |
| Frame map | ✅ 40 frames, clips correctos | ✅ 40 frames, clips 8/8/8/6/8 |
| Sin texto en sprite | ✅ | ✅ |
| Acento ≤ 5 % | ⚠️ No medido | ✅ 4,31 % |
| Legibilidad sobre tinta | ✅ Contorno blanco lo separa | ❌ La masa negra desaparece |
| Procedencia | ⚠️ Desconocida | ✅ MIT + generador determinista |

---

## 4. Assets que faltan (mapa real del ECS)

| `visualId` real | Concepto Sumi-e | Asset | Estado |
| --- | --- | --- | --- |
| `player` | Rōnin con kasa y rifle | `characters/player.png` | Falta |
| `samurai` | Samurai con katana | `enemies/samurai.png` | **Piloto producido**; pendiente in-engine |
| `elite` | Oni azul con maza | `enemies/elite_blue_oni.png` | Falta |
| `charger` | Oni rojo cargando | `enemies/charger_red_oni.png` | Falta |
| `wall_trooper` | Ashigaru con lanza/escudo | `enemies/wall_trooper.png` | Falta |
| `hopper` | Tengu saltarín | `enemies/hopper_tengu.png` | Falta |
| `popcorn` | Diablillo pequeño | `enemies/popcorn_imp.png` | Falta |
| `bullet_hmg`, `arrow`, `bolt` | Ofuda | Procedural / `projectiles/ofuda.png` | Parcial |
| `fireball`, `rocket` | Pergamino ardiendo | Procedural / `projectiles/rocket.png` | Parcial |
| `enemy_bullet` | Aguja de tinta | Procedural | Parcial |
| `pickup_weapon` | Pergamino de arma | Procedural / `props/pickup.png` | Parcial |
| Fondo | Papel, montañas, torii, tejados | Procedural | Parcial |
| HUD | Sellos, tinteros, puntuación | React/SVG | Parcial |
| Fuentes | Yuji Boku + Noto Serif JP | `.ttf` | Falta |
| Audio | Taiko, disparo, impacto | Recetas sound-kit | Falta |

---

## 5. Plan de corrección recomendado

### P0 — Desbloquear la coherencia visual

1. Cargar `Yuji Boku` y `Noto Serif JP` con `expo-font` y un fallback `serif`.
2. Resolver el sprite del samurai por tema: `assetKey` específico (`hitrun_sumi_e_samurai`) o
   `Sprite.tint`/drawer temático.
3. Llevar los tokens Sumi-e a `GameThemeProvider` y usarlos en el HUD React de Hit & Run.
4. Corregir o retirar `SUMI_E_ASSET_MANIFEST.ts`: o se conecta al loader, o se elimina para evitar
   que parezca implementado.

### P1 — Validar el piloto samurai

1. ~~Elegir el piloto~~ → `samurai` (única ruta de sprite cableada).
2. ~~Crear el atlas~~ → producido en `.../enemies/samurai.png` (`512 × 320`, 40 frames,
   7 swatches).
3. Revisar a 64 px en Canvas 800×600 y en dispositivo físico, sobre papel y sobre tinta.
4. Resolver la legibilidad sobre tinta: keyline de papel en runtime o restricción a papel.
5. Aprobar el piloto antes de producir la familia.

### P2 — Producir la familia y el fondo

1. Producir el `player` ronin y los 5 enemigos restantes usando el piloto como referencia
   (`elite`, `charger`, `wall_trooper`, `hopper`, `popcorn`).
2. Cachear el papel y limitar su resolución.
3. Añadir props de fondo (torii, farol, tejados) solo si aportan profundidad.
4. Mapear audio a recetas de `arcade-sound-kit`.

> **Observación del greybox:** en el target board, los onis azul y rojo tienen masas muy
> parecidas. El arte final debe diferenciarlos por postura, forma de cuernos y arma (maza vs.
> katana), no solo por color. Si en grayscale se confunden, la silueta no está resuelta.

---

## 6. QA ejecutado y QA pendiente

### Ejecutado

- Inspección visual del atlas legacy con la herramienta de lectura de imágenes.
- `sips`: `512 × 320`, `hasAlpha: yes`, `space: RGB`, `format: png`.
- Parser PNG propio del atlas legacy: IHDR, PLTE, tRNS, conteo de píxeles y paleta.
- Generación del atlas piloto en
  `src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png`.
- `asset_report.py`: `512 × 320`, RGBA, 34.042 bytes, 130.729 píxeles transparentes,
  content bounds `[22, 10, 510, 318]`, `problems: []`.
- `asset_report_sumie.py`: 7 swatches RGB, 0 off-palette, 252 niveles de alpha, acento 4,31 %,
  safe area PASS, pure fills 0.
- `build_preview_sheet.py`: contact sheet generado correctamente con Python 3.9.6 + Pillow 11.3.0.
- Determinismo: dos ejecuciones del generador producen el mismo PNG
  (`sha256 c4a187ad9d0036f0...`) y los mismos JSON; `cmp` idéntico.
- Validación del JSON del piloto: 40 frames, pivote `(0.5, 0.94)`, clips 8/8/8/6/8.
- Inspección de `atlas-readability.png`: papel ✅, grayscale ✅, tinta ❌.
- Búsqueda de imports de `SUMI_E_ASSET_MANIFEST` (0 resultados).
- Búsqueda de carga de fuentes (0 resultados para `Yuji Boku`/`Noto Serif JP`).

### Pendiente / bloqueado

- No se ha ejecutado el juego ni capturado un frame real del piloto en Canvas/Skia.
- No se ha validado el atlas en un dispositivo físico.
- La legibilidad sobre tinta sigue fallando; hay que decidir keyline runtime o restricción a papel.
- El `--max-colors 8` del `asset_report.py` genérico no aplica a alpha suave: cuenta tuplas RGBA
  (720 en el piloto). El criterio Sumi-e se audita con `asset_report_sumie.py` (7 swatches RGB).

### Comandos de QA

```bash
# auditor Sumi-e (paleta, acento, safe area, alpha)
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

---

## 7. Decisiones que necesitan aprobación

1. ¿Se adopta el piloto `samurai` tras la revisión in-engine o se mantiene el atlas legacy como
   excepción?
2. ¿El HUD React se adapta a Sumi-e o se oculta y se usa solo el HUD canvas?
3. ¿Se elimina `SUMI_E_ASSET_MANIFEST.ts` o se convierte en el manifiesto real del loader?
4. ¿El siguiente asset es el `player` ronin (más visible) o un enemigo?
5. ¿Se acepta el coste de cargar dos fuentes japonesas en el bundle inicial o se cargan por tema?
6. ¿Cómo se resuelve la legibilidad sobre tinta: keyline de papel en runtime o restricción a papel?
7. ¿La referencia `samurai-main-char2` se conserva solo como estilo o se descarta?
