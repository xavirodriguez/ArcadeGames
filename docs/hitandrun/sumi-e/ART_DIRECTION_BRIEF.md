# Sumi-e — Art Direction Brief (Hit & Run)

**Estado:** propuesta de dirección artística, pendiente de aprobación
**Juego:** Hit & Run (`hitandrun`)
**Tema:** `sumi-e` / Ukiyo-e de tinta
**Fecha:** 2026-10-25

> Este documento define el contrato visual y técnico. No es un catálogo de arte final.
> Ningún asset debe marcarse como `approved` hasta pasar las puertas de validación de la sección 7.

---

## 1. Game frame

| Campo | Valor |
| --- | --- |
| **Player fantasy** | Un rōnin fugitivo atraviesa un Japón feudal pintado a tinta, dejando un rastro de combate sobre el papel. |
| **Core verbs** | Correr, saltar, disparar, esquivar, golpear con katana, sobrevivir a oleadas. |
| **Engine / renderer** | TinyAster ECS. Canvas2D en web; Skia en nativo. El tema Sumi-e actual es Canvas-only. |
| **Target platforms** | Web, Android, iOS. Orientación landscape. |
| **Camera / view / facing** | Side-scroller con profundidad de carril (3/4). El jugador mira a la derecha; el renderer invierte X al girar. |
| **Native viewport** | Mundo lógico `800 × 600` (4:3). El canvas se escala al viewport; DPR hasta 3. |
| **Typical asset size on screen** | Celdas de personaje `64 × 64` px. Silueta útil: `52–58` px de alto, pies en `y ≈ 60`. |
| **UI real** | HUD React superpuesto (esquinas) + HUD canvas del tema. Ambos deben compartir tokens. |

### Restricciones del motor que condicionan el arte

- `CanvasSpriteDrawer` dibuja el `srcRect` a su tamaño nativo (`64 × 64`), sin usar `Render.size`.
  Por tanto, un atlas de personaje Sumi-e debe asumir **64 px de alto visual** y un collider separado.
- El atlas actual del samurai ya ocupa `512 × 320` con celdas `64 × 64` y ancla `(0.5, 0.94)`.
  Mantener ese layout evita tocar `SamuraiAnimationSystems` y `HitRunEnemyPool`.
- El sprite del samurai se carga con una clave única (`hitrun_samurai_enemy`) y **no pasa por el tema**.
  Para que Sumi-e lo controle hace falta una clave de asset por tema o un `Sprite.tint`/`assetKey` resuelto por tema.
- El HUD React actual usa `colors.cyan`, fondos `rgba(10,10,20,0.75)` y `typography.game` (neón).
  Sin un puente de tokens, el HUD romperá la estética aunque el canvas sea correcto.

---

## 2. Visual system

### 2.1 Shape language

- **Orgánico, asimétrico y gestual.** El contorno se lee como una pincelada, no como un vector cerrado.
- **Masas simples con negativo de papel.** Cada personaje debe funcionar como una mancha oscura con 1–2 acentos.
- **Bordes rotos.** El contorno exterior puede tener interrupciones de 1–3 px; el interior usa líneas finas.
- **Geometría reservada.** Círculos y rectángulos perfectos solo para sellos Hanko, talismanes y sellos de puntuación.
- **Sin simetría especular.** Horquillas, armas y ropajes deben romper la silueta.

### 2.2 Silhouette priorities (a 64 px)

| Personaje | Debe leerse | No puede fusionarse |
| --- | --- | --- |
| `player` (rōnin) | Sombrero kasa + línea diagonal del rifle + faldón | El rifle no puede desaparecer contra el cuerpo |
| `samurai` | Casco + katana + verticalidad | La katana debe sobresalir del torso |
| `elite` (oni azul) | Cuernos + hombros anchos + maza | Los cuernos deben superar la línea de hombros |
| `charger` (oni rojo) | Cuernos + arco de katana + inclinación | La inclinación debe indicar carga |
| `wall_trooper` (ashigaru) | Lanza + casco + escudo | La lanza debe cruzar el contorno |
| `hopper` (tengu) | Alas + pico + bufanda | El ala debe crear negativo de papel |
| `popcorn` (diablillo) | Cabeza grande + cuerpo pequeño | La cabeza no puede ser una bola genérica |

### 2.3 Value structure

| Banda | Uso | Rango |
| --- | --- | --- |
| **Papel** | Fondo, negativo, zonas no pintadas | 85–95 % luminancia |
| **Aguada clara** | Montañas lejanas, niebla, sombras suaves | 65–80 % |
| **Aguada media** | Ropajes, terreno, volumen secundario | 40–60 % |
| **Tinta** | Contorno, masa principal, texto | 8–20 % |
| **Acento** | Sello, sangre, peligro, kanji | 35–50 % (solo 3–5 % del área) |

El personaje debe seguir leyéndose en escala de grises. El acento nunca es la única señal de una amenaza.

### 2.4 Palette roles and exact swatches

| Token | Hex | Rol |
| --- | --- | --- |
| `paper.base` | `#E8E3D4` | Papel washi base |
| `paper.warm` | `#DCD6C2` | Suelo, zonas cálidas, panel |
| `paper.highlight` | `#F2EEE3` | Reserva de luz, ojos, filo de arma |
| `paper.shadow` | `#C9C2AE` | Sombra de papel, viñeta seca |
| `ink.primary` | `#171817` | Tinta principal, contorno |
| `ink.muted` | `#3A3A35` | Líneas secundarias, textura |
| `wash.mountain` | `rgba(23,24,23,0.08)` | Montaña lejana |
| `wash.mid` | `rgba(23,24,23,0.14)` | Montaña media |
| `wash.near` | `rgba(23,24,23,0.22)` | Montaña cercana |
| `wash.foreground` | `rgba(23,24,23,0.32)` | Silueta de primer plano |
| `accent.vermilion` | `#C0392B` | Sellos, peligro, kanji |
| `accent.vermilionDark` | `#8E2A20` | Sombra del sello, sangre seca |
| `accent.gold` | `#B8963E` | Talismanes, detalles de élite |
| `oni.blue` | `#3D6FA5` | Oni azul / élite |
| `oni.red` | `#B53A2A` | Oni rojo / charger |
| `ui.text` | `#121110` | Texto sobre papel |
| `ui.seal` | `#C0392B` | Fondo de sello |
| `ui.paperPanel` | `rgba(232,227,212,0.92)` | Panel HUD |

**Prohibido:** `#000000` puro como relleno, `#FFFFFF` puro como relleno, neón (`#00FFFF`, `#FF00FF`), degradados de arcoíris, sombras de color.

### 2.5 Materials and surface cues

- **Tela:** aguada plana + 1–2 trazos secos; sin brillo.
- **Armadura:** tinta oscura + líneas de oro; sin especular metálico.
- **Piel de oni:** aguada plana azul o bermellón; contorno más oscuro.
- **Hueso:** color papel + contorno de tinta; sin blanco puro.
- **Metal:** tinta oscura + una sola línea de papel como filo.
- **Madera/torii:** bermellón desaturado + vetas de tinta.
- **Humo/niebla:** aguada con `globalAlpha`, sin `shadowBlur` de color.

### 2.6 Edge and line treatment

- Contorno exterior: 2–3 px a 64 px, con roturas y grosor variable.
- Líneas interiores: 1 px, nunca paralelas perfectas.
- Sin glow, sin `shadowBlur` de neón, sin contorno blanco.
- El alpha suave (PNG-32) es obligatorio para reproducir bordes de pincel; el atlas actual usa PNG-8 con alpha binario.

### 2.7 Lighting

- Luz difusa desde arriba-izquierda.
- Sombras como aguada plana desplazada 1–2 px hacia abajo-derecha.
- Sin rim light, sin luces de color, sin reflejos especulares.
- Viñeta global de papel, no sombra por objeto.

### 2.8 Detail density and focal hierarchy

- **Cabeza/arma:** 70 % del detalle.
- **Torso:** 20 %.
- **Piernas:** 10 %.
- A 64 px, cualquier detalle menor de 2 px desaparece: no dibujar costuras, cuerdas finas ni patrones de tela.
- El kanji flotante y los sellos son el foco tipográfico; los personajes no llevan texto.

### 2.9 Motion character

- Animación a **8–12 fps** con holds; no interpolación suave.
- Anticipación 2–3 frames, acción 3–4, recuperación 2–3.
- Deformación máxima: 10 %; los pies no se mueven del baseline.
- El rastro de tinta y las salpicaduras son efectos de presentación, nunca colisión.

### 2.10 Explicit exclusions

- Neón, bloom, scanlines, CRT, glow.
- Píxel art con contorno de 1 px y relleno plano brillante.
- Fantasía occidental, chrome, armaduras de placas genéricas.
- Gradientes digitales de airbrush.
- Texto o logos dentro de sprites.
- Más de 8 colores por personaje (6 tintas + 2 acentos).
- Fondos fotorrealistas o texturas de imagen pesada.

---

## 3. Technical contract

### 3.1 Character atlas

| Propiedad | Valor |
| --- | --- |
| Formato | PNG-32 RGBA8888, alpha straight (no premultiplicado) |
| Color space | sRGB |
| Atlas | `512 × 320` px |
| Grid | 8 columnas × 5 filas |
| Celda | `64 × 64` px |
| Frames | 40 |
| Anchor | `x = 0.5`, `y = 0.94` (pies en `y ≈ 60`) |
| Safe area | 2 px en cada borde de celda |
| Facing | Derecha; el renderer invierte X |
| Filtering | Linear (el sprite se dibuja a 64 px; evitar nearest para bordes de pincel) |
| Max colors | 8 por personaje (6 tintas + 2 acentos) |
| File budget | 60–120 KB por atlas (sin comprimir en exceso) |

### 3.2 Frame map (idéntico al atlas actual)

| Clip | Frames | Count | Loop |
| --- | --- | --- | --- |
| `idle` | 0–7 | 8 | Sí |
| `walk` | 8–15 | 8 | Sí |
| `attack` | 16–23 | 8 | No |
| `hurt` | 24–29 | 6 | No |
| `empty` | 30–31 | 2 | — |
| `death` | 32–39 | 8 | No |

> Mantener este mapa permite usar `SAMURAI_ANIMATIONS` y `getSamuraiFrameRect` sin cambios.
> Cualquier atlas con celdas de 80/72/60 px (como propone el manifiesto actual) requiere un renderer por asset y rompe la paridad.

### 3.3 Paths and naming

```
src/games/hitandrun/assets/themes/sumi-e/
  characters/player.png
  characters/player.atlas.json
  characters/player.animations.json
  enemies/samurai.png
  enemies/elite_blue_oni.png
  enemies/charger_red_oni.png
  enemies/wall_trooper.png
  enemies/hopper_tengu.png
  enemies/popcorn_imp.png
  projectiles/ofuda.png
  props/torii.png
  props/lantern.png
  textures/paper-grain-256.png   (opcional)
```

- IDs en `kebab-case`; nombres de archivo en `snake_case` solo si el loader lo exige.
- Un atlas por personaje; no mezclar personajes en una textura.
- Los PNG deben incluir `atlas.json` con frame order, celdas, anchor y clips.

### 3.4 UI and fonts

| Elemento | Implementación | Asset |
| --- | --- | --- |
| Sellos Hanko | React Native / SVG + canvas | Código, no raster |
| Tinteros de vida | React Native / canvas | Código, no raster |
| Panel de puntuación | React Native + tokens | Código, no raster |
| Títulos | Fuente `Yuji Boku` | `.ttf`, OFL 1.1 |
| Texto/kanji | Fuente `Noto Serif JP` | `.otf/.ttf`, OFL 1.1 |
| Iconos simples | SVG | Vector, no raster |

**Bloqueante actual:** `Yuji Boku` se referencia en `SumiETheme.ts` pero no se carga con `expo-font`.
`Noto Serif JP` se propone para HUD/diálogo y tampoco está cargada. Sin fuentes, el tema cae a
`serif` genérico y pierde identidad.

### 3.5 Background and VFX

- **Papel:** procedural con caché. Generar una textura de `256 × 256` seamless o un offscreen de `1024 × 1024` como máximo; no generar ruido full-screen con `getImageData` en cada resize.
- **Montañas:** procedurales con `quadraticCurveTo`, 3–5 capas, opacidades del palette.
- **Decals de tinta:** procedurales, buffer circular de 32–64, coordenadas de mundo.
- **Kanji flotante:** fuente + pool de objetos; `reduceMotion` lo desactiva.
- **Sin assets raster para VFX** salvo que el profiling lo justifique.

### 3.6 Audio

- No crear archivos nuevos ni un `SoundSynth` ad hoc.
- Usar recetas de `@tiny-aster/arcade-sound-kit`: `shoot`, `hit`, `hit_critical`, `explosion`, `pickup`, y una variante de tambor taiko si existe.
- El audio es opcional para el tema; si no hay receta, mantener el audio actual.

---

## 4. Visual target

**Target propuesto:** `docs/hitandrun/sumi-e/target-board.svg`

Contiene, a escala nativa:

- Frame de gameplay `800 × 600` con papel, montañas, suelo, siluetas de primer plano, jugador, tres enemigos, ofuda, decal de tinta, kanji flotante y HUD de sellos.
- Panel lateral con paleta, tipografía, contrato técnico y frame map.
- Tira inferior con el value ladder y ejemplos DO/DON'T.

**Estado:** propuesto, no aprobado. El tablero es un greybox de dirección, no arte final.

### Criterios de aprobación del target

1. La silueta del jugador se distingue de los tres enemigos a escala 1:1.
2. El HUD de sellos se lee sobre papel claro y sobre una zona de tinta.
3. El acento bermellón no supera el 5 % del frame.
4. Ningún personaje usa neón, blanco puro o negro puro como relleno.
5. El frame sigue leyéndose en grayscale.
6. Un artista puede replicar el estilo con la paleta y las reglas, sin ver una referencia externa.
7. Los onis azul y rojo se diferencian por postura, cuernos y arma, no solo por color.

> **Evidencia de los pilotos:** `atlas-readability.png` y `player-readability.png`
> (papel ✅ / grayscale ✅ / tinta sólida ❌ en ambos).
> La referencia `reference/samurai-main-char2` es estilo/key poses, no un atlas recortable.

---

## 5. Asset families

| Familia | Assets | Estado | Notas |
| --- | --- | --- | --- |
| **Personajes** | `player`, `samurai`, `elite`, `charger`, `wall_trooper`, `hopper`, `popcorn` | `2 pilots + 5 planned` | `samurai` y `player` pilotos `512×320`; legibilidad en tinta pendiente y wiring pendiente |
| **Proyectiles** | `ofuda`, `enemy_bullet`, `rocket` | `code-native` | Procedurales; raster opcional 32×32 |
| **Props** | `torii`, `lantern`, `roof`, `bamboo` | `planned` / `code-native` | Fondo; sin colisión |
| **UI** | `hanko`, `ink-pot`, `score-stamp`, `scroll-panel` | `code-native` | React/SVG + canvas |
| **Tipografía** | `Yuji Boku`, `Noto Serif JP` | `planned` | OFL 1.1; requiere `expo-font` |
| **Fondos** | `paper-grain`, `mountain-layers`, `fog` | `code-native` | Cacheado; sin imágenes pesadas |
| **VFX** | `ink-splatter`, `slash-arc`, `kanji-popup` | `code-native` | RNG inyectado; sin `Math.random` |
| **Audio** | `sumi-e-pack` | `planned` | Recetas de `arcade-sound-kit` |

---

## 6. Production pipeline

> Prompts de referencia y flujo de generación: `PROMPT_CARD.md`.
> Un prompt no es un asset aprobado; el piloto debe normalizarse y validarse en el juego.

1. **Aprobar el target board** y congelar paleta, siluetas y frame map.
2. **Pilotos producidos:** `samurai` (`.../enemies/samurai.png`) y `player`
   (`.../characters/player.png`), ambos `512×320`, 40 frames, 7 swatches. No producir el resto de
   la familia hasta revisarlos en el juego.
3. **Normalizar** con `asset_report_sumie.py`, `asset_report.py` y `build_preview_sheet.py`; el
   entorno actual (`Python 3.9.6` + Pillow 11.3.0) ya los ejecuta.
4. **Validar en el juego** a 800×600 y en un dispositivo real; comprobar pies, escala, legibilidad
   y colisión. Incluir el stress test de tinta sólida: el piloto pasa papel/grayscale y falla
   tinta; decidir keyline runtime o restricción a papel.
5. **Producir la familia** reutilizando el piloto como referencia; un personaje por lote.
6. **Importar** con `require` estático, clave de asset por tema y fallback al atlas actual.
7. **Registrar procedencia** en `asset-manifest.json` antes de marcar `approved`.

### Comandos de QA

```bash
# auditor Sumi-e (paleta, acento, safe area, alpha) — repetir para player.png
python3 docs/hitandrun/sumi-e/tools/asset_report_sumie.py \
  src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png

# auditor genérico (sin --max-colors para alpha suave)
python3 .agents/skills/create-game-assets/scripts/asset_report.py \
  src/games/hitandrun/assets/themes/sumi-e/characters/player.png \
  --expect-size 512x320 --require-alpha --json

# contact sheet por clip
python3 docs/hitandrun/sumi-e/tools/build_atlas_contact_sheet.py \
  src/games/hitandrun/assets/themes/sumi-e/characters/player.png \
  --out docs/hitandrun/sumi-e/player-preview.png --zoom 3 \
  --labels "idle 0-7,walk 8-15,attack 16-23,hurt 24-29 + empty 30-31,death 32-39"

# legibilidad papel / tinta / grayscale
python3 docs/hitandrun/sumi-e/tools/build_readability_sheet.py \
  src/games/hitandrun/assets/themes/sumi-e/characters/player.png \
  --out docs/hitandrun/sumi-e/player-readability.png
```

> Entorno actual: Python 3.9.6 + Pillow 11.3.0. `--max-colors 8` no aplica a alpha suave
> (cuenta tuplas RGBA); usar `asset_report_sumie.py` para swatches RGB.

---

## 7. Acceptance gates

Un asset solo pasa a `approved` si cumple **todas**:

- [ ] Silueta legible a 64 px y en movimiento.
- [ ] Frame map y dimensiones exactos (`512 × 320`, `64 × 64`, 40 frames).
- [ ] Anchor `(0.5, 0.94)` y pies estables.
- [ ] PNG-32 con alpha suave; sin fondo horneado.
- [ ] ≤ 8 colores por personaje; sin neón, negro puro ni blanco puro de relleno.
- [ ] Sin texto, logos, marcos ni duplicados.
- [ ] Revisado en Canvas y Skia.
- [ ] Revisado sobre papel claro y sobre zona de tinta.
- [ ] Procedencia y licencia registradas.
- [ ] `asset_report.py` pasa sin errores.

> **Estado de los pilotos:** `samurai` y `player` pasan las puertas técnicas y de paleta, pero
> fallan la de tinta sólida. No se marcan `approved` hasta resolverla y revisarlos en Canvas/Skia.

---

## 8. Open decisions

| Decisión | Opciones | Recomendación |
| --- | --- | --- |
| ¿Atlas compartido o por personaje? | Un atlas global vs uno por personaje | Uno por personaje; el engine ya usa una clave por asset |
| ¿Sprite o shapes procedurales? | Mantener shapes vs atlas Sumi-e | Atlas para personajes; shapes para VFX/props |
| ¿Cómo se aplica el tema al sprite? | `assetKey` por tema vs `tint` | `assetKey` por tema; el tint no reproduce el estilo |
| ¿Fuentes? | `Yuji Boku`/`Noto Serif JP` vs sistema | Cargar ambas con `expo-font`; fallback `serif` |
| ¿Papel? | Full-screen noise vs tile 256×256 | Tile cacheado; medir antes de optimizar |
| ¿HUD React? | Dejarlo neón vs tokens Sumi-e | Tokens compartidos; es parte del tema |
| ¿Alcance inicial? | 7 personajes vs 1 piloto | Dos pilotos (`samurai`, `player`); siguiente `elite` |
| ¿Legibilidad en tinta? | Keyline runtime vs restricción a papel vs wash más claro | Keyline runtime; no tocar el atlas |
| ¿Referencia `samurai-main-char2`? | Usar como estilo vs descartar | Solo estilo/key poses; no shippable |

---

## 9. Provenance

### Referencias de estudio (no usar como assets)

- **Tinta y negativo:** Sesshū Tōyō, Hasegawa Tōhaku. Estudiar compresión de valores, espacio
  vacío y bordes perdidos; no copiar composiciones.
- **Silueta y composición:** Ukiyo-e de Hokusai, Hiroshige y Kuniyoshi. Estudiar diagonales,
  siluetas y color plano; no calcar ni exportar obras.
- **Colecciones de dominio público:** The Met Open Access, Wikimedia Commons, Library of Congress.
  Verificar la licencia de cada pieza antes de usarla como referencia; ninguna se envía al juego.

- **Paleta y reglas:** derivadas de `SumiETheme.ts` y `SUMI_E_PALETTE`.
- **Atlas existente:** `src/games/hitandrun/assets/samurai-enemy.png`, commit `8c124576`.
  Licencia/origen no documentados; **no reutilizar como arte Sumi-e**.
- **Referencia de estilo:** `reference/samurai-main-char2-alpha.png` (JPEG original `1408×768`,
  checkerboard horneado; alpha keyed con fugas). Generador, prompt y licencia desconocidos;
  **no shippable**. Ver `reference/samurai-main-char2.provenance.md`.
- **Pilotos procedurales:** `tools/generate_samurai_sumi_e.py` y `tools/generate_player_sumi_e.py`
  (código propio, MIT, deterministas). El `player` usa la referencia solo como key poses; no
  samplea sus píxeles. Ver `reference/player-pilot.provenance.md`.
- **Fuentes:** Yuji Boku (Copyright 2021 The Yuji Project Authors, OFL 1.1) y Noto Serif JP (Copyright 2012 Google Inc., OFL 1.1).
- **Target board:** greybox vectorial propio, sin arte generado.
