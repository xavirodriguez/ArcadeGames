# Art direction brief — Vertical Shmup ("Fantasía aérea anime")

**Versión:** 1.0
**Fecha:** 2026-10-25
**Derivado de:** `src/games/vertical-shmup/VERTICAL_SHMUP_FANTASIA_AEREA_ANIME_DIRECCION_ARTISTICA.md` (v1.0, documento maestro)
**Auditorías de referencia:** `docs/audit/2026-10-24-vertical-shmup-aerial-fantasy-theme-polish.md`
**Estado de producción:** híbrido — decorado/proyectiles/VFX procedurales (producción activa) + sprites PNG reservados para la nave del jugador y los jefes (planificados).

> Este es el contrato técnico de producción del skill `create-game-assets`. El documento maestro
> (§1–§27) manda en decisiones visuales; este brief fija el marco técnico y los gates de aprobación.

---

## Game frame

- **Player fantasy:** pilota una nave ligera de fantasía tecnológico-mágica (fuselaje nacarado, alas pluma/cristal, núcleo cian) ascendiendo por un cielo de islas flotantes, templos y tormentas de cristal.
- **Core verbs:** esquivar patrones balísticos, disparar, recoger mejoras/pickups, sobrevivir oleadas y jefes.
- **Engine and renderer:** TinyAster ECS. Canvas2D en web (`@tiny-aster/renderer-canvas`), Skia en nativo (`@tiny-aster/renderer-skia`). Ambos renderers registran drawers `shmup_starfield`, `player`, `enemy` y `bullet`. Track procedural: `ShmupColorTokens.ts` + `BIOMES` en `ShmupVisualHelpers.ts` como única fuente de verdad.
- **Target platforms:** web, Android, iOS. Orientación portrait.
- **Camera/view/facing:** cenital ligeramente estilizada, scroll vertical ascendente, morro de la nave apuntando arriba (0°). Sin perspectiva lateral/no frontal.
- **Native viewport and common display scale:** mundo lógico `720 × 1280` (9:16), `config/vertical-shmup.json`. Diseñar todo en esa referencia y expresar proporciones también en % del área jugable.
- **Typical asset size on screen:** nave jugador 72 px lógicos (decisión registrada; el código actual dibuja a 36 px vía `Render.size`, hitbox circular r=2.5 independiente — ver Decisión abierta 1 resuelta en "Visual target"); enemigos 32 px (`ENEMY_SIZE: 32`, collider r=16); bala 4 px; jefe 30–55 % del ancho jugable (216–396 px) según §8.4 del doc maestro.

## Visual system

- **Shape language:** anime con siluetas claras; naves angulares direccionales, criaturas mágicas ornamentales con anillos/talismanes; geometría solo para telegráficos y sellos ceremoniales.
- **Silhouette priorities (por función, no por color):** jugador → flecha/dardo con núcleo central y motores separados. Enemigos: scout (pequeño angular), interceptor (estrecho, morro largo), armored (ancho, placas), support (redondo/simétrico), boss (silueta única por bioma con núcleo vulnerable inequívoco). Verificado: el arquetipo visual vive en `ShmupEnemy.archetype`, desacoplado de `EnemyPath.kind`.
- **Value structure:** jugador y amenazas más contrastados; fondos desaturados en la franja central de combate; prueba obligatoria en escala de grises (§23 del doc maestro).
- **Palette roles and exact swatches:** fuente única = `SHMUP_COLOR_TOKENS` en `rendering/ShmupColorTokens.ts` (cielo `#14294F/#3477B8/#8FD6F5`, nubes `#777FBE/#FFF4E6`, foliaje `#235A58/#4BAA91/#A4E5B6`, flor `#F5A6D2`, arquitectura `#394A70`, oro `#FFD18A`; jugador `#55E8FF/#F3FCFF/#3F8DFF`, enemigo `#302B72/#F25DBB`, balas `#FF6B65/#FFAA45/#FF4FBF`, aviso `#FFD166`, pickup `#76F7C5`, UI `#EAF5FF/#A6C3DE`). Prohibido duplicar hex en Canvas y Skia.
- **Materials and surface cues:** energía = núcleo nítido + halo moderado; metal = placas planas con contorno; magia = translúcidos, anillos, partículas convergentes. Sin bloom sin núcleo legible.
- **Edge/line treatment:** contornos definidos en gameplay; bordes suaves solo en capas atmosféricas. El glow nunca debe ampliar el área de amenaza aparente más allá del núcleo.
- **Lighting direction and contrast:** luz coherente por bioma (perfil `lightSource` en `BIOMES`); highlight de nube nunca debe camuflar proyectiles claros.
- **Detail density and focal hierarchy:** decorado rico en laterales/planos lejanos, franja central limpia. Prioridad de render: hitbox/jugador → balas hostiles + telegráficos → siluetas enemigas + núcleo vulnerable → disparos propios y pickups → fondos y partículas ambientales.
- **Motion character:** simulación estable; ciclos visuales de 2–6 poses; anticipación 2–3 frames en ataques relevantes; estelas cortas; sin animación constante en toda entidad.
- **Explicit exclusions:** destello blanco a pantalla completa, parpadeos rápidos, mismo magenta para flores y balas, ruido de partículas sobre patrones densos, HUD ornamentado, sprites sin escala compartida, perspectivas mixtas.

## Technical contract

### Track A — Familias procedurales (producción activa)

Los "assets" del decorado y del combate son código: son verificados como contracts de test (path/doc de auditoría), no como PNG.

- Archivos: `rendering/ShmupColorTokens.ts` (tokens), `rendering/ShmupVisualHelpers.ts` (perfiles `BIOMES`, colocación determinista), `rendering/ShmupCanvasVisuals.ts` + `rendering/ShmupSkiaVisuals.ts` (traducción a llamadas de dibujo).
- **Paridad Canvas/Skia:** misma dimensión lógica, mismo orden de capas, misma silueta por arquetipo y misma paleta. Efecto no soportado en Skia => fallback documentado, no cambio silencioso de diseño.
- **Determinismo:** toda decoración se deriva de `world time`, `wave` y parallax determinista. Prohibido gameplay RNG para VFX.
- **Plan de degradación** (en orden): partículas ornamentales → detalle secundario de fondo → glows amplios → fragmentos decorativos. Nunca precede al reducir contraste de balas hostiles.
- Motivos por bioma (único diferenciador visual): archipiélago = nubes marfil + islas jade + pétalos rosas; jardines = verdes ricos + polen dorado + lianas; templos = pizarra + ornamentos oro + runas escasas; tormenta = cielo gris-azul oscuro + cristales cian contenidos.

### Track B — Sprites PNG (nave del jugador y jefes)

| Propiedad | Valor |
| --- | --- |
| Formato | PNG-32 RGBA8888, alpha straight (no premultiplicado), fondo transparente |
| Color space | sRGB |
| Celda de autoría | Nave/estados: `256 × 256` px (2× de la celda de 128). Arte útil centrado ~70 % de la celda (≈ 176 px), margen transparente ≥ 8 px por lado. Autoría a resolución máxima y visualización reducida: el detalle pequeño se degrada a contorno, nunca al revés |
| Exportación | Se publica la celda íntegra 256×256 (sin re-muestreo intermedio). Cobertura DPR: arte de 88 px lógicos × DPR 3 = 264 px físicos → 256 px cubre el 97 %, inválido solo para arte > 85 px + DPR 3. Mismo archivo para web y nativo |
| Celda del jefe | Autoría a 2× del tamaño máximo en pantalla (jefe de hasta 396 px lógicos → master 792–1024 px), export 1× medido sobre la ref. 720×1280 |
| Anchor/pivot | Centro `(0.5, 0.5)`; el hitbox es independiente y sigue siendo el collider del componente (`r = 2.5` jugador) |
| Facing | Arriba; el renderer escala vía `Render.size` (a definir en el drawer de sprite de este juego, **no** reutilizar el Draw del `srcRect` a tamaño nativo de hitandrun) y gira/invierte según estado (tilt ±8–12°) |
| Filtering | Linear + no-mipmap en Canvas2D; en Skia usar calidad alta (no re-muestreo nearest) |
| Capas | Fuselaje/glow separados solo si el efecto lo requiere (§16.4); no fragmentar por defecto |
| Budget | Nave ≤ 150 KB por state (256 px, ≤ 8 colores + 2 acentos); jefe ≤ 400 KB; atlas solo si > 1 frame y el game loop lo soporta |
| Naming | `assets/shmup/player/…`, `assets/shmup/enemies/…` (ver §16.3 del doc maestro; pendiente sea `src/games/vertical-shmup/assets/shmup/`) |

> Decisión registrada 2026-10-25: "el sprite lo más grande posible para máxima calidad" →
> celda 256×256 en vez de 128. Los enemigos comunes siguen Track A: si algún día migran a
> sprite, heredarán la misma celda 256.

### Gates de QA (comunes a ambos tracks)

1. Silueta legible a 1:1 sobre un fondo claro (nubes) y uno oscuro (tormenta), y en escala de grises.
2. Paridad visual Canvas/Skia capturada en el mismo viewport lógico.
3. Los cambios de presentación no alteran resultados de simulación con seed (tests de contratos del juego).
4. Sin confusión entre partículas ambientales, pickups y balas hostiles.
5. `asset_report.py` para cada PNG (tamaño, alpha real, colores) + contact sheet antes de integrar.

## Visual target

- **Primer objetivo de aprobación:** nave del jugador (idle) como sprite PNG — es el asset de mayor exposición y define la identidad. Mientras no esté aprobado, el greybox vigente es el drawer procedural `shmup_player` (flecha + núcleo cian).
- **Decisión abierta 1 — RESUELTA (2026-10-25, escala de autoría y de pantalla):**
  - *Autoría:* celda 256×256 (ver Track B) según decisión del usuario de "sprites lo más grandes posible para máxima calidad".
  - *Pantalla:* el arte del jugador se muestra a **72 px lógicos** (punto medio del rango 64–88 del doc maestro), subiendo el `Render.size` de 36 → 72. Es un cambio exclusivamente de presentación: el test de contratos ya cubre que el hitbox circular (`r = 2.5`) es independiente del tamaño del sprite. El valor final (64/72/88) se reconfirma con capturas en dispositivo.
  - *Nota:* a 72 px × DPR 3 = 216 px físicos, la celda 256 deja margen de headroom; a 88 px el cubrimiento es del 97 % (aceptable).
- **Do:** flecha/dardo leíble a 36 px, ≤ 3 acentos luminosos, motores separados del cuerpo, núcleo cian único. **Don't:** nave blanca sin separación sobre nube, red de luces distribuida, estela larga, hitbox dibujada ocupando el fuselaje.
- **Native-scale gameplay capture:** pendiente (requiere build local con DNS disponible). Sin captura + revisión en engine no se marca ningún asset `approved`.
- **Approval owner/date:** pendiente de asignar.

---

## Notas de provenance y decisiones

- La decisión de camino híbrido (decorado procedural + sprites para jugador/jefes) quedó registrada el 2026-10-25 con el usuario; no contradice ninguna regla del doc maestro (§15 permite elegir formato por función).
- Los jefes entran al manifest como Track B por ser las piezas centrales de cada bioma según §8 del doc maestro, el nivel de exposición exige identidad visual máxima.
- Sprites de enemigos comunes NO están planificados: los 5 arquetipos ya se leen procedualmente por silueta (audit 24/10) y añadir PNGs requeriría soporte de sprite en `ShmupCanvasVisuals`/`ShmupSkiaVisuals` sin beneficio de gameplay.
