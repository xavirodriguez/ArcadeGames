# Informe de Diagnóstico de Duplicación — ArcadeGames / TinyAsterEngine

## Resumen Ejecutivo

Este informe presenta el diagnóstico completo de duplicación de código en el repositorio `github.com/xavirodriguez/ArcadeGames` (rama `master`). El análisis toma como entrada el informe de la herramienta `jscpd` (`report/jscpd-report.json`), el cual identificó **183 clones exactos** con 1,795 líneas duplicadas en 385 archivos (2.76% de duplicación en líneas de TypeScript).

Siguiendo el proceso de análisis obligatorio:
1. **Agregación:** Se agruparon los 183 clones por par de archivos unívoco, resultando en **64 pares de archivos** evaluados.
2. **Clasificación:** Se asignó cada par a una categoría principal (`SELF`, `CANVAS_SKIA`, `CROSS_GAME`, `CROSS_DOMAIN`).
3. **Inspección de código:** Para cada par con ≥ 10 líneas, se leyeron las líneas exactas del fragmento, cabeceras/imports y módulos compartidos del dominio en `src/games/shared/` o `packages/core/src/`.
4. **Verificación de vivacidad:** Se rastreó la presencia de símbolos mediante `grep` para descartar código muerto.
5. **Reglas de análisis:** Se aplicaron rigurosamente las reglas R1 a R8 (incluyendo el umbral de 70 tokens) y D1 a D3 (rutas relativas exactas, criterios de aceptación verificables y marcado `@internal`).

---

## Índice de Pares Agregados

| Par | Archivo 1 | Archivo 2 | Categoría | Clones | Líneas Totales | Max Tokens |
| --- | --------- | --------- | --------- | ------ | -------------- | ---------- |
| **01** | `shared/rendering/SharedVFX.ts` | `shared/rendering/SharedVFX.ts` | `SELF` | 25 | 198 | 104 |
| **02** | `geometrywars/rendering/GeometryWarsSkiaVisuals.ts` | `geometrywars/rendering/GeometryWarsSkiaVisuals.ts` | `SELF` | 15 | 157 | 86 |
| **03** | `flappybird/rendering/FlappyBirdCanvasVisuals.ts` | `flappybird/rendering/FlappyBirdSkiaVisuals.ts` | `CANVAS_SKIA` | 12 | 151 | 217 |
| **04** | `echorunner/EchoRunnerGame.ts` | `platformer/PlatformerGame.ts` | `CROSS_GAME` | 9 | 120 | 137 |
| **05** | `geometrywars/rendering/GeometryWarsCanvasVisuals.ts` | `geometrywars/rendering/GeometryWarsSkiaVisuals.ts` | `CANVAS_SKIA` | 5 | 104 | 177 |
| **06** | `space-invaders/rendering/SpaceInvadersCanvasVisuals.ts` | `space-invaders/rendering/SpaceInvadersSkiaVisuals.ts` | `CANVAS_SKIA` | 8 | 80 | 125 |
| **07** | `echorunner/rendering/EchoRunnerSkiaVisuals.ts` | `echorunner/rendering/EchoRunnerSkiaVisuals.ts` | `SELF` | 8 | 73 | 87 |
| **08** | `asteroids/rendering/AsteroidsCanvasVisuals.ts` | `asteroids/rendering/AsteroidsMissionHUD.ts` | `CROSS_DOMAIN` | 1 | 71 | 453 |
| **09** | `arkanoid/rendering/ArkanoidSkiaVisuals.ts` | `pong/rendering/PongSkiaVisuals.ts` | `CROSS_GAME` | 5 | 51 | 74 |
| **10** | `echorunner/rendering/EchoRunnerCanvasVisuals.ts` | `echorunner/rendering/EchoRunnerSkiaVisuals.ts` | `CANVAS_SKIA` | 6 | 51 | 173 |
| **11** | `geometrywars/rendering/GeometryWarsCanvasVisuals.ts` | `geometrywars/rendering/GeometryWarsCanvasVisuals.ts` | `SELF` | 5 | 47 | 69 |
| **12** | `asteroids/rendering/AsteroidsSkiaVisuals.ts` | `asteroids/rendering/AsteroidsSkiaVisuals.ts` | `SELF` | 4 | 46 | 101 |
| **13** | `arkanoid/rendering/ArkanoidCanvasVisuals.ts` | `pong/rendering/PongCanvasVisuals.ts` | `CROSS_GAME` | 4 | 44 | 87 |
| **14** | `arkanoid/ArkanoidGame.ts` | `pong/PongGame.ts` | `CROSS_GAME` | 4 | 43 | 104 |
| **15** | `scenes/SceneManager.ts` | `scenes/SceneManager.ts` | `SELF` | 2 | 38 | 117 |
| **16** | `systems/EnemyBehaviorRegistry.ts` | `systems/EnemyBehaviorRegistry.ts` | `SELF` | 3 | 36 | 66 |
| **17** | `arkanoid/rendering/ArkanoidCanvasVisuals.ts` | `arkanoid/rendering/ArkanoidSkiaVisuals.ts` | `CANVAS_SKIA` | 3 | 33 | 156 |
| **18** | `frogger/EntityFactory.ts` | `frogger/EntityFactory.ts` | `SELF` | 2 | 31 | 106 |
| **19** | `pong/rendering/PongCanvasVisuals.ts` | `pong/rendering/PongSkiaVisuals.ts` | `CANVAS_SKIA` | 2 | 30 | 133 |
| **20** | `snapshots/SnapshotSerializer.ts` | `snapshots/SnapshotSerializerSoA.ts` | `CROSS_DOMAIN` | 1 | 29 | 72 |
| **21** | `flappybird/FlappyBirdGame.ts` | `geometrywars/GeometryWarsGame.ts` | `CROSS_GAME` | 2 | 28 | 138 |
| **22** | `flappybird/FlappyBirdGame.ts` | `space-invaders/SpaceInvadersGame.ts` | `CROSS_GAME` | 2 | 25 | 140 |
| **23** | `frogger/rendering/FroggerCanvasVisuals.ts` | `frogger/rendering/FroggerSkiaVisuals.ts` | `CANVAS_SKIA` | 3 | 24 | 58 |
| **24** | `geometrywars/entities/GeometryWarsEntities.ts` | `geometrywars/entities/GeometryWarsEntities.ts` | `SELF` | 4 | 24 | 55 |
| **25** | `frogger/rendering/FroggerSkiaVisuals.ts` | `frogger/rendering/FroggerSkiaVisuals.ts` | `SELF` | 3 | 22 | 54 |
| **26** | `arkanoid/rendering/ArkanoidSkiaVisuals.ts` | `arkanoid/rendering/ArkanoidSkiaVisuals.ts` | `SELF` | 3 | 21 | 50 |
| **27** | `snapshots/SnapshotHash.ts` | `snapshots/SnapshotHash.ts` | `SELF` | 1 | 19 | 101 |
| **28** | `asteroids/rendering/AsteroidsCanvasVisuals.ts` | `asteroids/rendering/AsteroidsCanvasVisuals.ts` | `SELF` | 1 | 19 | 87 |
| **29** | `geometrywars/story/GeometryWarsEncounter.ts` | `space-invaders/story/InvasionEncounter.ts` | `CROSS_GAME` | 1 | 19 | 110 |
| **30** | `physics/systems/TileCollisionSystem.ts` | `physics/systems/TileCollisionSystem.ts` | `SELF` | 2 | 18 | 80 |
| **31** | `geometrywars/GeometryWarsGame.ts` | `geometrywars/GeometryWarsGame.ts` | `SELF` | 2 | 18 | 70 |
| **32** | `space-invaders/systems/SpaceInvadersCollisionSystem.ts` | `space-invaders/systems/SpaceInvadersInputSystem.ts` | `CROSS_DOMAIN` | 1 | 17 | 128 |
| **33** | `echorunner/rendering/EchoRunnerCanvasVisuals.ts` | `platformer/rendering/PlatformerCanvasVisuals.ts` | `CROSS_GAME` | 2 | 14 | 52 |
| **34** | `asteroids/AsteroidsGame.ts` | `space-invaders/SpaceInvadersGame.ts` | `CROSS_GAME` | 1 | 13 | 52 |
| **35** | `asteroids/rendering/AsteroidsCanvasVisuals.ts` | `asteroids/rendering/AsteroidsSkiaVisuals.ts` | `CANVAS_SKIA` | 1 | 13 | 86 |
| **36** | `space-invaders/EntityPool.ts` | `space-invaders/EntityPool.ts` | `SELF` | 1 | 13 | 71 |
| **37** | `arkanoid/systems/ArkanoidCollisionSystem.ts` | `space-invaders/systems/SpaceInvadersCollisionSystem.ts` | `CROSS_GAME` | 1 | 12 | 73 |
| **38** | `echorunner/EchoRunnerGame.ts` | `echorunner/EchoRunnerGame.ts` | `SELF` | 2 | 12 | 58 |
| **39** | `geometrywars/rendering/GeometryWarsSkiaVisuals.ts` | `shared/rendering/VisualParticlePool.ts` | `CROSS_DOMAIN` | 1 | 12 | 68 |
| **40** | `pong/rendering/PongSkiaVisuals.ts` | `shared/rendering/CanvasNeonUtils.ts` | `CROSS_GAME` | 1 | 12 | 95 |
| **41** | `echorunner/EchoRunnerGame.ts` | `pong/PongGame.ts` | `CROSS_GAME` | 1 | 11 | 96 |
| **42** | `geometrywars/rendering/GeometryWarsSkiaVisuals.ts` | `space-invaders/rendering/SpaceInvadersSkiaVisuals.ts` | `CROSS_GAME` | 1 | 11 | 90 |
| **43** | `asteroids/EntityFactory.ts` | `asteroids/EntityFactory.ts` | `SELF` | 1 | 10 | 51 |
| **44** | `echorunner/rendering/EchoRunnerCanvasVisuals.ts` | `echorunner/rendering/EchoRunnerCanvasVisuals.ts` | `SELF` | 1 | 10 | 55 |
| **45** | `geometrywars/rendering/GeometryWarsSkiaVisuals.ts` | `space-invaders/systems/ComboHUDRenderSystem.ts` | `CROSS_GAME` | 1 | 10 | 57 |
| **46** | `arkanoid/systems/ArkanoidCollisionSystem.ts` | `arkanoid/systems/ArkanoidCollisionSystem.ts` | `SELF` | 1 | 9 | 55 |
| **47** | `asteroids/systems/AsteroidCollisionSystem.ts` | `space-invaders/systems/SpaceInvadersCollisionSystem.ts` | `CROSS_GAME` | 1 | 9 | 57 |
| **48** | `flappybird/FlappyBirdGame.ts` | `frogger/FroggerGame.ts` | `CROSS_GAME` | 1 | 9 | 70 |
| **49** | `arkanoid/ArkanoidGame.ts` | `asteroids/AsteroidsGame.ts` | `CROSS_GAME` | 1 | 8 | 65 |
| **50** | `arkanoid/systems/ArkanoidEnemySystems.ts` | `arkanoid/systems/ArkanoidPowerUpSystems.ts` | `CROSS_DOMAIN` | 1 | 8 | 50 |
| **51** | `arkanoid/systems/ArkanoidGameStateSystem.ts` | `arkanoid/systems/ArkanoidPowerUpSystems.ts` | `CROSS_DOMAIN` | 1 | 8 | 64 |
| **52** | `flappybird/FlappyBirdGame.ts` | `pong/PongGame.ts` | `CROSS_GAME` | 1 | 8 | 53 |
| **53** | `pong/rendering/PongSkiaVisuals.ts` | `pong/rendering/PongSkiaVisuals.ts` | `SELF` | 1 | 8 | 50 |
| **54** | `space-invaders/rendering/SpaceInvadersSkiaVisuals.ts` | `space-invaders/rendering/SpaceInvadersSkiaVisuals.ts` | `SELF` | 1 | 8 | 51 |
| **55** | `flappybird/rendering/FlappyBirdCanvasVisuals.ts` | `geometrywars/rendering/GeometryWarsCanvasVisuals.ts` | `CROSS_GAME` | 1 | 7 | 50 |
| **56** | `flappybird/systems/FlappyBirdCollisionSystem.ts` | `space-invaders/systems/SpaceInvadersCollisionSystem.ts` | `CROSS_GAME` | 1 | 7 | 51 |
| **57** | `geometrywars/GeometryWarsGame.ts` | `space-invaders/SpaceInvadersGame.ts` | `CROSS_GAME` | 1 | 7 | 77 |
| **58** | `ecs/EntityBuilder.ts` | `ecs/EntityBuilder.ts` | `SELF` | 1 | 6 | 72 |
| **59** | `arkanoid/systems/ArkanoidInputSystem.ts` | `arkanoid/systems/ArkanoidSpinSystem.ts` | `CROSS_DOMAIN` | 1 | 6 | 57 |
| **60** | `asteroids/EntityFactory.ts` | `geometrywars/entities/GeometryWarsEntities.ts` | `CROSS_GAME` | 1 | 6 | 52 |
| **61** | `echorunner/story/EchoRunnerEncounter.ts` | `flappybird/story/FlappyBirdEncounter.ts` | `CROSS_GAME` | 1 | 6 | 65 |
| **62** | `echorunner/story/EchoRunnerEncounter.ts` | `platformer/story/PlatformerEncounter.ts` | `CROSS_GAME` | 1 | 6 | 57 |
| **63** | `platformer/PlatformerGame.ts` | `platformer/PlatformerGame.ts` | `SELF` | 1 | 6 | 61 |
| **64** | `pong/systems/PongGameStateSystem.ts` | `pong/systems/PongGameStateSystem.ts` | `SELF` | 1 | 6 | 61 |

---

## Diagnósticos Detallados por Par

### [01] [SELF] — Duplicación interna de cálculo e inicialización de efectos visuales en `SharedVFX.ts`

**Archivos:** `src/games/shared/rendering/SharedVFX.ts:627-2486` ↔ `src/games/shared/rendering/SharedVFX.ts:627-2486`
**Volumen:** 198 líneas totales, 25 clones en este par (7 clones válidos ≥ 70 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Estructuras repetitivas dentro del mismo archivo `SharedVFX.ts` para la inicialización y cálculo de partículas, anillos de choque (`DebrisShockwaveEffect`), partículas de polvo galáctico, parámetros de campos de fuerza (`SkiaEnergyShieldBubbleEffect`), vórtices y líneas de velocidad warp.

**Por qué existe:**
Crecimiento orgánico al portar efectos de Canvas2D a Skia directamente en el mismo archivo, creando getters y estructuras redundantes para ambos renderers en lugar de compartir funciones puras de actualización.

**Propuesta:**
Extraer funciones helper puras privadas al inicio del archivo `SharedVFX.ts` (ej. `computeShieldBubbleParams`, `computeEffectProgress`, `updateAccretionParticle`). Reducir la duplicación interna reutilizando los métodos de cálculo geométrico comunes sin moverlos de archivo.

**Destino:** `src/games/shared/rendering/SharedVFX.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/RenderUtils.ts`, `src/games/shared/rendering/geometry.ts`

**Riesgo:** BAJO
Cálculo puro de renderizado sin impacto en gameplay ni estado ECS.

**Criterio de aceptación:**
Paridad visual verificada en Canvas y Skia para fondos espaciales y efectos compartidos; `pnpm run check:ratchet` no incrementa.

---

### [02] [SELF] — Repetición de patrones de dibujo y utilidades Skia en `GeometryWarsSkiaVisuals.ts`

**Archivos:** `src/games/geometrywars/rendering/GeometryWarsSkiaVisuals.ts:52-660` ↔ `src/games/geometrywars/rendering/GeometryWarsSkiaVisuals.ts:52-660`
**Volumen:** 157 líneas totales, 15 clones en este par (4 clones válidos ≥ 70 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Bloques repetidos dentro del propio drawer de Skia de Geometry Wars para la configuración de `Skia.PaintStyle.Stroke`, instanciación de `Skia.Path.Make()`, transformaciones y dibujado de partículas/naves enemigas (`drawSkiaParticle`, `drawSkiaChaser`, etc.).

**Por qué existe:**
Patrón repetitivo de renderizado Skia donde cada `ShapeDrawer` reescribe la secuencia de `paint.reset()`, `paint.setAntiAlias(true)`, `paint.setStyle()`, `paint.setColor()`.

**Propuesta:**
Consolidar la preparación de `Skia.Paint` y rutas vectoriales en funciones helper privadas dentro del archivo (ej. `setupSkiaStrokePaint(paint, color, width)`).

**Destino:** `src/games/geometrywars/rendering/GeometryWarsSkiaVisuals.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/SkiaNeonUtils.ts` (`drawNeonShapeSkia`), `src/games/shared/rendering/SkiaContext.ts` (`getPaint`)

**Riesgo:** BAJO
Lógica puramente gráfica local a Geometry Wars Skia.

**Criterio de aceptación:**
Comparación visual manual en Skia para Geometry Wars sin alteraciones en partículas ni enemigos.

---

### [03] [CANVAS_SKIA] — Renderizado dual Canvas2D / Skia de Flappy Bird (tuberías, pájaro, fondo)

**Archivos:** `src/games/flappybird/rendering/FlappyBirdCanvasVisuals.ts:1-874` ↔ `src/games/flappybird/rendering/FlappyBirdSkiaVisuals.ts:1-850`
**Volumen:** 151 líneas totales, 12 clones en este par (7 clones válidos ≥ 70 tokens)
**Categoría:** CANVAS_SKIA

**Qué está duplicado:**
Lógica de cálculo geométrico y de partículas idéntica entre Canvas y Skia: geometría de tuberías con brechas (`calculateFlappyPipeGeometry`), inclinación/squash-and-stretch del pájaro, físicas de partículas de turbina/destellos y factor de deformación por velocidad warp.

**Por qué existe:**
Mezcla de cálculo matemático y emisión de primitivas de renderizado dentro de las funciones de dibujo en ambos archivos.

**Propuesta:**
1. Mantener las funciones compartidas ya existentes en `src/games/shared/rendering/geometry.ts` y `src/games/flappybird/rendering/particleEvents.ts`.
2. Extraer cualquier cálculo remanente de geometría y partículas a `particleEvents.ts` / `geometry.ts`, invocándolo desde ambos drawers y dejando en cada archivo únicamente las llamadas primitivas (`ctx.*` vs `canvas.*`).

**Destino:** `src/games/shared/rendering/geometry.ts` y `src/games/flappybird/rendering/particleEvents.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/geometry.ts` (`calculateFlappyPipeGeometry`, `calculateBirdTiltAngle`), `src/games/flappybird/rendering/particleEvents.ts` (`processFlappyBirdParticleEvents`)

**Riesgo:** BAJO
Separación estricta entre cálculo y emisión sin modificar llamadas a APIs de dibujado.

**Criterio de aceptación:**
Comparación visual manual en Canvas2D y Skia para Flappy Bird manteniendo paridad exacta en animaciones.

---

### [04] [CROSS_GAME] — Lógica de montaje y blueprints de nivel entre EchoRunner y Platformer

**Archivos:** `src/games/echorunner/EchoRunnerGame.ts:107-474` ↔ `src/games/platformer/PlatformerGame.ts:107-430`
**Volumen:** 120 líneas totales, 9 clones en este par (7 clones válidos ≥ 70 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Definición de blueprints de jugador, mapas de baldosas (`tilemap`), coleccionables (`collectible_fragment`), nodos de respawn (`checkpoint_node`), configuración de gravedad/físicas de plataformas y setup de `Camera2D`.

**Por qué existe:**
EchoRunner se derivó mediante copia directa del código base de PlatformerGame.

**Propuesta:**
Como EchoRunner es un minigame injugable/standalone en desarrollo, NO refactorizar ni crear abstracciones sobre EchoRunner directamente. Dejar Platformer como fuente de verdad y marcar este bloque como gestionado en la hoja de ruta de activación de EchoRunner.

**Destino:** `src/games/platformer/PlatformerGame.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/PlatformerArcadeGame.ts`

**Riesgo:** MEDIO
EchoRunner se encuentra injugable. Alterar su juego o crear jerarquías compartidas prematuras rompería Platformer.

**Criterio de aceptación:**
Ninguno (EchoRunner no debe refactorizarse hasta que sea un minijuego funcional; validado contra Platformer primero).

---

### [05] [CANVAS_SKIA] — Cálculo e interacciones de rejilla neon/partículas en Geometry Wars

**Archivos:** `src/games/geometrywars/rendering/GeometryWarsCanvasVisuals.ts:48-612` ↔ `src/games/geometrywars/rendering/GeometryWarsSkiaVisuals.ts:113-612`
**Volumen:** 104 líneas totales, 5 clones en este par (5 clones válidos ≥ 70 tokens)
**Categoría:** CANVAS_SKIA

**Qué está duplicado:**
Monitoreo de proyectiles para estelas de luz (`monitorBulletsAndSpawnTrails`), colección de coordenadas para deformación de malla (`getDisplacedPoint`), y cálculo de destellos por disparo/muerte de balas.

**Por qué existe:**
Copia de la rutina de gestión de buffer de partículas y desplazamientos de rejilla entre las implementaciones de Canvas2D y Skia.

**Propuesta:**
Extraer la función pura de deformación y recolección de proyectiles a un módulo helper compartido en Geometry Wars (`src/games/geometrywars/rendering/GeometryWarsGridUtils.ts`), dejando solo el dibujado de líneas en Canvas y Skia.

**Destino:** `src/games/geometrywars/rendering/GeometryWarsGridUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/VisualParticlePool.ts`

**Riesgo:** BAJO
Cálculo de deformación de malla independiente de los drivers de dibujado.

**Criterio de aceptación:**
Malla neón y estelas de balas reaccionan idénticamente en Canvas y Skia.

---

### [06] [CANVAS_SKIA] — Efectos visuales de Space Invaders (HUD, escudos, destellos, jefe)

**Archivos:** `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts:1-675` ↔ `src/games/space-invaders/rendering/SpaceInvadersSkiaVisuals.ts:1-653`
**Volumen:** 80 líneas totales, 8 clones en este par (5 clones válidos ≥ 70 tokens)
**Categoría:** CANVAS_SKIA

**Qué está duplicado:**
Cálculo de opacidad de destellos de disparo, pulso de invulnerabilidad de escudos (`computeSinePulse`), lógica de selección de colores de invasores según fila, cálculo de fases del jefe (`calculateBossPhase`), y degradado de calor de partículas.

**Por qué existe:**
Extracción parcial previa donde se crearon helpers en `SpaceInvadersPulseUtils.ts` pero quedaron bloques de cálculo de fases y colores repetidos.

**Propuesta:**
Extender los helpers compartidos existentes en `src/games/space-invaders/rendering/shared/SpaceInvadersPulseUtils.ts` (ej. `resolveInvaderRowColor`, `resolveBossPhaseVisuals`) para eliminar los bloques duplicados de cálculo.

**Destino:** `src/games/space-invaders/rendering/shared/SpaceInvadersPulseUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/space-invaders/rendering/shared/SpaceInvadersPulseUtils.ts`

**Riesgo:** BAJO
Cálculo visual puro sin alteración de la simulación.

**Criterio de aceptación:**
Comparación visual de Space Invaders en Canvas2D y Skia manteniendo fases de jefe y colores de filas intactos.

---

### [07] [SELF] — Duplicación interna de dibujado Skia de EchoRunner

**Archivos:** `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts:83-644` ↔ `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts:83-644`
**Volumen:** 73 líneas totales, 8 clones en este par (3 clones válidos ≥ 70 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Comprobación de guardas de renderizado (`render.visible`), cálculo de `size` y reset de `paint` dentro de múltiples drawers Skia en `EchoRunnerSkiaVisuals.ts`.

**Por qué existe:**
Código generado por copia en un módulo de juego en desarrollo/injugable.

**Propuesta:**
No refactorizar hasta que EchoRunner sea un juego jugable. Resolver internamente mediante helper privado `resolveEchoSkiaDrawContext` en el propio archivo cuando se reactive.

**Destino:** `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/echorunner/rendering/EchoRunnerCanvasVisuals.ts` (`resolveEchoDrawContext`)

**Riesgo:** BAJO (Código de juego no activo)

**Criterio de aceptación:**
No realizar cambios por antecedente de proyecto (EchoRunner injugable).

---

### [08] [CROSS_DOMAIN] — Duplicación de `drawAsteroidsMissionHUD` en `AsteroidsCanvasVisuals.ts` y `AsteroidsMissionHUD.ts`

**Archivos:** `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts:161-231` ↔ `src/games/asteroids/rendering/AsteroidsMissionHUD.ts:4-75`
**Volumen:** 71 líneas, 1 clone en este par (453 tokens)
**Categoría:** CROSS_DOMAIN

**Qué está duplicado:**
La implementación completa de `drawAsteroidsMissionHUD` (71 líneas) está copiada idénticamente en ambos archivos.

**Por qué existe:**
Extracción previa e incompleta. Se creó `AsteroidsMissionHUD.ts` para aislar el HUD de misiones pero se dejó la función original exportada en `AsteroidsCanvasVisuals.ts`. `AsteroidsRendererManager.ts` importa de ambos sitios.

**Propuesta:**
Eliminar la definición duplicada de `drawAsteroidsMissionHUD` de `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts` y consolidar su importación exclusivamente desde `src/games/asteroids/rendering/AsteroidsMissionHUD.ts`.

**Destino:** `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts` (BORRAR la función duplicada)

**Abstracciones previas a verificar antes de implementar:**
`src/games/asteroids/rendering/AsteroidsMissionHUD.ts`

**Riesgo:** BAJO
Símbolo ya aislado en archivo propio. Solo requiere eliminar el código muerto y corregir el import.

**Criterio de aceptación:**
HUD de misiones de Asteroids se renderiza correctamente; `pnpm run check:ratchet` y `pnpm run ci` pasan sin errores.

---

### [09] [CROSS_GAME] — Preparación y dibujo de paletas Skia entre Arkanoid y Pong

**Archivos:** `src/games/arkanoid/rendering/ArkanoidSkiaVisuals.ts:8-174` ↔ `src/games/pong/rendering/PongSkiaVisuals.ts:69-211`
**Volumen:** 51 líneas totales, 5 clones en este par (1 clone válido ≥ 70 tokens, 74 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Secuencia de dibujado de pelota (`drawSkiaArkanoidBall` / `drawSkiaPongBall`) y líneas de cuadrícula de fondo con opacidad.

**Por qué existe:**
Patrón común de minijuegos arcade de paletas creados compartiendo estructura inicial.

**Propuesta:**
Extraer el renderizado de la rejilla de fondo estática o con scroll a `SharedVFX.ts` o `CanvasNeonUtils.ts` / `SkiaNeonUtils.ts`.

**Destino:** `src/games/shared/rendering/SkiaNeonUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/SharedVFX.ts`

**Riesgo:** BAJO
Efecto puramente estético de fondo.

**Criterio de aceptación:**
Fondos de Arkanoid y Pong se renderizan idénticamente en Skia.

---

### [10] [CANVAS_SKIA] — Renderizado de jugador y coleccionables en EchoRunner (Canvas vs Skia)

**Archivos:** `src/games/echorunner/rendering/EchoRunnerCanvasVisuals.ts:128-370` ↔ `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts:87-339`
**Volumen:** 51 líneas totales, 6 clones en este par (4 clones válidos ≥ 70 tokens)
**Categoría:** CANVAS_SKIA

**Qué está duplicado:**
Extracción de contexto de dibujado de jugador (`vel`, `groundState`, `input`, `health`, `invulnerableRemaining`, `hitFlashFrames`) y resolución de estado activo de checkpoints/fragmentos.

**Por qué existe:**
Portado por copia entre las vistas Canvas2D y Skia de EchoRunner.

**Propuesta:**
No refactorizar mientras EchoRunner continúe injugable. Al reactivarlo, unificar el cálculo de estado en `resolveEchoDrawContext` que ya existe parcialmente en `EchoRunnerCanvasVisuals.ts`.

**Destino:** `src/games/echorunner/rendering/EchoRunnerCanvasVisuals.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/echorunner/rendering/EchoRunnerCanvasVisuals.ts` (`resolveEchoDrawContext`)

**Riesgo:** BAJO (Juego no activo)

**Criterio de aceptación:**
No realizar modificaciones hasta habilitar EchoRunner.

---

### [11] SKIP — Duplicación interna en `GeometryWarsCanvasVisuals.ts`
**Razón:** Clones por debajo del umbral de tokens (máximo 69 tokens, < 70 tokens).

---

### [12] [SELF] — Duplicación interna en `AsteroidsSkiaVisuals.ts`

**Archivos:** `src/games/asteroids/rendering/AsteroidsSkiaVisuals.ts:133-239` ↔ `src/games/asteroids/rendering/AsteroidsSkiaVisuals.ts:133-239`
**Volumen:** 46 líneas totales, 4 clones en este par (1 clone válido ≥ 70 tokens, 101 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Configuración de `opacity`, resolución de `resolveHitFlash` y reseteo de `paint` Skia en los drawers de asteroides y nave nodriza UFO.

**Por qué existe:**
Repetición del bloque de resolución de flash de impacto y stroke de Skia dentro de la misma clase visual.

**Propuesta:**
Extraer una función privada `applyAsteroidSkiaHitFlash(canvas, paint, render, defaultColor)` dentro de `AsteroidsSkiaVisuals.ts`.

**Destino:** `src/games/asteroids/rendering/AsteroidsSkiaVisuals.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/RenderUtils.ts` (`resolveHitFlash`)

**Riesgo:** BAJO
Helper privado exclusivo de `AsteroidsSkiaVisuals.ts`.

**Criterio de aceptación:**
Renderizado de asteroides y UFO en Skia mantiene efectos de flash de impacto e invulnerabilidad.

---

### [13] [CROSS_GAME] — Renderizado Canvas de paletas y bolas entre Arkanoid y Pong

**Archivos:** `src/games/arkanoid/rendering/ArkanoidCanvasVisuals.ts:26-75` ↔ `src/games/pong/rendering/PongCanvasVisuals.ts:69-137`
**Volumen:** 44 líneas totales, 4 clones en este par (1 clone válido ≥ 70 tokens, 87 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Dibujado de paleta neón con borde redondeado (`roundRect`) y núcleo central brillante (`drawNeonPaddle`).

**Por qué existe:**
Arkanoid y Pong comparten la representación estética neón de paletas de control.

**Propuesta:**
Extraer el helper de dibujo de paletas neón parametrizado a `CanvasNeonUtils.ts` (`drawNeonPaddleCanvas`).

**Destino:** `src/games/shared/rendering/CanvasNeonUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/CanvasNeonUtils.ts` (`drawNeonShape`)

**Riesgo:** BAJO
Helper visual parametrizado por dimensiones (ancho, alto, color principal, color núcleo).

**Criterio de aceptación:**
Paletas en Arkanoid y Pong mantienen esquinas redondeadas y núcleo luminoso.

---

### [14] [CROSS_GAME] — Inicialización de recursos arcade y mutadores en ArkanoidGame y PongGame

**Archivos:** `src/games/arkanoid/ArkanoidGame.ts:109-321` ↔ `src/games/pong/PongGame.ts:113-298`
**Volumen:** 43 líneas totales, 4 clones en este par (2 clones válidos ≥ 70 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Lógica de `setupCommonArcadeResources()`, combinación de `gameOptions` con la configuración por defecto y ciclo de desbloqueo/bloqueo de `world.gameplayRandom` en `onInitializeEntities`.

**Por qué existe:**
Patrón repetido de inicialización de subclases de `BaseGame`.

**Propuesta:**
Usar el helper de configuración compartido `src/games/shared/configHelper.ts` (`setupArcadeGameConfig`) o invocar el método común heredado en `BaseGame` sin crear una clase intermedia `BasePaddleGame` (siguiendo R6).

**Destino:** `src/games/shared/configHelper.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/configHelper.ts`

**Riesgo:** BAJO
Refactorización mediante función helper pura sin alterar la jerarquía ECS.

**Criterio de aceptación:**
`pnpm run test` pasa para Arkanoid y Pong; hashes deterministas de simulación no cambian.

---

### [15] [SELF] — Manejo de transiciones y rollback de estado en `SceneManager.ts`

**Archivos:** `packages/core/src/scenes/SceneManager.ts:242-418` ↔ `packages/core/src/scenes/SceneManager.ts:242-418`
**Volumen:** 38 líneas totales, 2 clones en este par (2 clones válidos ≥ 70 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Lógica de encolado de transición, incremento de `transitionToken`, guardado de `oldScene`/`oldStack`/`oldState`, emisión de eventos de progreso (`scene:transition:progress`), y bloque `catch` para manejo de errores/timeout con rollback.

**Por qué existe:**
Implementaciones independientes de `transitionTo` y `swapScene`/`replace` dentro del mismo gestor de escenas.

**Propuesta:**
Seguir la regla **R8**: Realizar diff manual línea a línea antes de consolidar en la función privada `performSceneSwap`. Documentar cualquier divergencia preexistente. Usar un helper privado dentro de `SceneManager.ts`.

**Destino:** `packages/core/src/scenes/SceneManager.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/core/src/scenes/SceneManager.ts` (`performSceneSwap`)

**Riesgo:** ALTO
Riesgo de introducir race conditions en el token de transición de escena o romper el rollback en caso de timeout.

**Criterio de aceptación:**
Tests de suite de escenas en `@tiny-aster/core` ejecutan sin race conditions; diff de `etc/asteroides.api.md` es vacío.

---

### [16] SKIP — Duplicación interna en `EnemyBehaviorRegistry.ts`
**Razón:** Por debajo del umbral de tokens (máximo 66 tokens, < 70 tokens).

---

### [17] [CANVAS_SKIA] — Renderizado de ladrillos de Arkanoid (Canvas2D vs Skia)

**Archivos:** `src/games/arkanoid/rendering/ArkanoidCanvasVisuals.ts:9-130` ↔ `src/games/arkanoid/rendering/ArkanoidSkiaVisuals.ts:11-128`
**Volumen:** 33 líneas totales, 3 clones en este par (1 clone válido ≥ 70 tokens, 156 tokens)
**Categoría:** CANVAS_SKIA

**Qué está duplicado:**
Determinación del color de ladrillos según el tipo (`explosive`, `regenerable`, `gravitational`) y aplicación de flash de impacto (`hitFlashFrames`).

**Por qué existe:**
Cálculo de color de ladrillo escrito de forma idéntica dentro de `drawArkanoidBrick` (Canvas) y `drawSkiaArkanoidBrick` (Skia).

**Propuesta:**
Extraer la función pura de resolución de color de ladrillo a un helper del módulo (`src/games/arkanoid/rendering/ArkanoidRenderUtils.ts`).

**Destino:** `src/games/arkanoid/rendering/ArkanoidRenderUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/RenderUtils.ts`

**Riesgo:** BAJO
Cálculo de color puro.

**Criterio de aceptación:**
Ladrillos especiales (explosivos, regenerables, gravitatorios) mantienen sus colores y destellos en Canvas y Skia.

---

### [18] [SELF] — Creación de entidades de vehículos en `Frogger EntityFactory.ts`

**Archivos:** `src/games/frogger/EntityFactory.ts:64-141` ↔ `src/games/frogger/EntityFactory.ts:64-141`
**Volumen:** 31 líneas totales, 2 clones en este par (1 clone válido ≥ 70 tokens, 106 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Configuración de `Collider`, `CollisionEvents` y componente `Boundary` en los métodos de creación de coches y camiones (`createCar` / `createTruck`).

**Por qué existe:**
Copiado de la plantilla de construcción de vehículo con diferencias menores en las dimensiones (`width`).

**Propuesta:**
Consolidar en una función helper privada `buildVehicleEntity(world, entity, args, width, height, shape)` dentro del mismo archivo `EntityFactory.ts`.

**Destino:** `src/games/frogger/EntityFactory.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/enemyHelpers.ts`

**Riesgo:** BAJO
Helper de construcción interno sin exposición fuera del archivo.

**Criterio de aceptación:**
Spawns de coches y camiones en Frogger funcionan con colisiones y envolventes de pantalla correctas.

---

### [19] [CANVAS_SKIA] — Renderizado de pelotas y estelas en Pong (Canvas vs Skia)

**Archivos:** `src/games/pong/rendering/PongCanvasVisuals.ts:19-35` ↔ `src/games/pong/rendering/PongSkiaVisuals.ts:73-89`
**Volumen:** 30 líneas totales, 2 clones en este par (2 clones válidos ≥ 70 tokens, 133 tokens)
**Categoría:** CANVAS_SKIA

**Qué está duplicado:**
Obtención del componente `Combo`, resolución de reacción de combo (`getComboReaction`), y cálculo de longitud/color de estela de la pelota.

**Por qué existe:**
Copia del bloque de cálculo de estela entre Canvas2D y Skia.

**Propuesta:**
Reutilizar la abstracción de estelas ya existente en `src/games/shared/rendering/MotionTrailSystem.ts` y llamar al helper `getComboReaction` dejando en el drawer solo el trazo.

**Destino:** `src/games/pong/rendering/PongCanvasVisuals.ts` y `src/games/pong/rendering/PongSkiaVisuals.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/MotionTrailSystem.ts`, `src/games/pong/rendering/PongRenderUtils.ts` (`getComboReaction`)

**Riesgo:** BAJO
Uso de helper de reacción de combo existente.

**Criterio de aceptación:**
La pelota de Pong proyecta la estela reactiva al combo de forma idéntica en Canvas2D y Skia.

---

### [20] [CROSS_DOMAIN] — Interfaces de acceso a estado ECS en serializers de Snapshot

**Archivos:** `packages/core/src/snapshots/SnapshotSerializer.ts:4-32` ↔ `packages/core/src/snapshots/SnapshotSerializerSoA.ts:4-32`
**Volumen:** 29 líneas, 1 clone en este par (72 tokens)
**Categoría:** CROSS_DOMAIN

**Qué está duplicado:**
La interfaz interna `InternalWorldAccess<_TComponents>` y los comentarios TSDoc introductorios de serialización.

**Por qué existe:**
Duplicación de la declaración de la interfaz de acceso privado a `World` al implementar los serializadores AoS y SoA.

**Propuesta:**
Seguir **R4**: Mover la interfaz `InternalWorldAccess` al archivo de tipos del dominio de snapshots ya existente (`packages/core/src/snapshots/WorldSnapshot.ts`) y marcarla `@internal`.

**Destino:** `packages/core/src/snapshots/WorldSnapshot.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/core/src/snapshots/WorldSnapshot.ts`

**Riesgo:** BAJO
Interfaz interna compartida entre serializadores de snapshots.

**Criterio de aceptación:**
`pnpm run typecheck:core` y `pnpm run test` pasan; `asteroides_api.md` no muestra cambios públicos.

---

### [21] [CROSS_GAME] — Sincronización de entidades de servidor multiplayer en FlappyBirdGame y GeometryWarsGame

**Archivos:** `src/games/flappybird/FlappyBirdGame.ts:481-493` ↔ `src/games/geometrywars/GeometryWarsGame.ts:203-215`
**Volumen:** 28 líneas totales, 2 clones en este par (1 clone válido ≥ 70 tokens, 138 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Lógica de recorrido de descriptores de sincronización (`ENTITY_SYNC_DESCRIPTORS`), invocación de `syncEntitiesFromServer` y construcción del arreglo `entries` para `buildInterpolationSnapshot`.

**Por qué existe:**
Copia de la rutina de reconciliación e interpolación del gestor de red entre minijuegos multijugador.

**Propuesta:**
Extraer la función de sincronización multijugador a un helper compartido en netcode (`src/games/shared/netcode/NetcodeSyncUtils.ts`).

**Destino:** `src/games/shared/netcode/NetcodeSyncUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/netcode/`

**Riesgo:** ALTO
Riesgo de afectar el determinismo o la interpolación de red en partidas multijugador.

**Criterio de aceptación:**
Tests de integración de netcode pasan; la sincronización de servidor a cliente mantiene fluidez.

---

### [22] [CROSS_GAME] — Procesamiento de snapshots de interpolación en FlappyBirdGame y SpaceInvadersGame

**Archivos:** `src/games/flappybird/FlappyBirdGame.ts:482-496` ↔ `src/games/space-invaders/SpaceInvadersGame.ts:812-826`
**Volumen:** 25 líneas totales, 2 clones en este par (1 clone válido ≥ 70 tokens, 140 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Invocación de `syncEntitiesFromServer`, acumulación de `entries` de jugadores/entidades, llamadas a `buildInterpolationSnapshot`, `processServerUpdate`, `pruneStaleEntities` y `world.flush()`.

**Por qué existe:**
Patrón repetido de recepción de updates del servidor entre juegos multijugador.

**Propuesta:**
Consolidar el pipeline de actualización cliente/servidor en `src/games/shared/netcode/NetcodeSyncUtils.ts` mediante la función `processArcadeServerUpdate(world, replicator, descriptors, state, localSessionId)`.

**Destino:** `src/games/shared/netcode/NetcodeSyncUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/netcode/NetcodeSyncUtils.ts`

**Riesgo:** ALTO
Cualquier alteración en la limpieza de entidades o flush puede provocar desincronización de red.

**Criterio de aceptación:**
Golden hash y simulaciones multijugador sin discrepancias en pruebas de rollback/red.

---

### [23] SKIP — Duplicación Canvas vs Skia en `FroggerCanvasVisuals.ts` / `FroggerSkiaVisuals.ts`
**Razón:** Por debajo del umbral de tokens (máximo 58 tokens, < 70 tokens).

---

### [24] SKIP — Duplicación interna en `GeometryWarsEntities.ts`
**Razón:** Por debajo del umbral de tokens (máximo 55 tokens, < 70 tokens).

---

### [25] SKIP — Duplicación interna en `FroggerSkiaVisuals.ts`
**Razón:** Por debajo del umbral de tokens (máximo 54 tokens, < 70 tokens).

---

### [26] SKIP — Duplicación interna en `ArkanoidSkiaVisuals.ts`
**Razón:** Por debajo del umbral de tokens (máximo 50 tokens, < 70 tokens).

---

### [27] [SELF] — Algoritmo de hashing SoA en `SnapshotHash.ts`

**Archivos:** `packages/core/src/snapshots/SnapshotHash.ts:18-36` ↔ `packages/core/src/snapshots/SnapshotHash.ts:95-110`
**Volumen:** 19 líneas, 1 clone en este par (101 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Bucle inicial de hashing FNV-1a para tick, seed, rngState y array de entidades activas dentro de `hashSoA`.

**Por qué existe:**
Copia del bloque de mezcla de encabezado de snapshot entre dos variantes de hashing numérico.

**Propuesta:**
Extraer la función helper privada `hashSnapshotHeader(hash, snapshot)` dentro de `SnapshotHash.ts`.

**Destino:** `packages/core/src/snapshots/SnapshotHash.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/core/src/snapshots/SnapshotHash.ts` (`hashInt32`)

**Riesgo:** ALTO
Trata con determinismo de red y verificación de estado. Cualquier modificación debe mantener la salida del hash bit a bit.

**Criterio de aceptación:**
Golden hash de snapshots SoA permanece idéntico antes y después del refactor en todos los minijuegos.

---

### [28] [SELF] — Configuración de sombras y Hit Flash en `AsteroidsCanvasVisuals.ts`

**Archivos:** `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts:130-148` ↔ `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts:252-267`
**Volumen:** 19 líneas, 1 clone en este par (87 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Resolución de `resolveHitFlash` y aplicación de `ctx.shadowColor`/`ctx.shadowBlur` para destello de impacto en naves y platillos volantes.

**Por qué existe:**
Copia de la rutina de resplandor neón con Hit Flash dentro del módulo de renderizado Canvas de Asteroids.

**Propuesta:**
Usar el helper existente en `src/games/shared/rendering/CanvasNeonUtils.ts` (`applyNeonStrokeStyle`) en lugar de reimplementar el cálculo de sombra y opacidad manualmente.

**Destino:** `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/CanvasNeonUtils.ts` (`applyNeonStrokeStyle`), `src/games/shared/rendering/RenderUtils.ts` (`resolveHitFlash`)

**Riesgo:** BAJO
Sustitución por abstracción previa ya existente.

**Criterio de aceptación:**
La nave y el platillo volante de Asteroids mantienen paridad visual de resplandor neón e impacto.

---

### [29] [CROSS_GAME] — Construcción de resultados de encuentros de historia en GeometryWars e InvasionEncounter

**Archivos:** `src/games/geometrywars/story/GeometryWarsEncounter.ts:128-146` ↔ `src/games/space-invaders/story/InvasionEncounter.ts:128-146`
**Volumen:** 19 líneas, 1 clone en este par (110 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Suscripción a eventos `game:over` / `level:completed` en el `EventBus` e invocación de `this.emitResult(context, payload)`.

**Por qué existe:**
Copia del patrón de integración de minijuegos con el Story Runtime en los encuentros de la campaña.

**Propuesta:**
Reutilizar el método base ya implementado en `BaseMiniGameEncounter` (`packages/gameplay-kit/src/story/BaseMiniGameEncounter.ts`) que centraliza la escucha de eventos y emisión del resultado sin duplicar callbacks.

**Destino:** `src/games/geometrywars/story/GeometryWarsEncounter.ts` y `src/games/space-invaders/story/InvasionEncounter.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/gameplay-kit/src/story/BaseMiniGameEncounter.ts`

**Riesgo:** BAJO
Migración a clase base de gameplay-kit existente.

**Criterio de aceptación:**
Fin de minijuegos en el modo campaña registra y transmite puntuación y victoria/derrota correctamente.

---

### [30] [SELF] — Verificación de baldosas sólidas y resolución de hielo en `TileCollisionSystem.ts`

**Archivos:** `packages/core/src/physics/systems/TileCollisionSystem.ts:119-199` ↔ `packages/core/src/physics/systems/TileCollisionSystem.ts:119-199`
**Volumen:** 18 líneas totales, 2 clones en este par (2 clones válidos ≥ 70 tokens, 80 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Bucles de iteración sobre filas y columnas de la cuadrícula del tilemap (`xTileLoop`, `yTileLoop`) y llamada a `applyTileKindEffect` para baldosas descendentes.

**Por qué existe:**
Comprobación duplicada de colisiones en los ejes X e Y por separado en el motor físico.

**Propuesta:**
Seguir **R2**: No mover código fuera del archivo. Consolidar el escaneo del rango de baldosas en un método privado `scanTileRange(tilemap, minX, maxX, minY, maxY, callback)` dentro de `TileCollisionSystem.ts`.

**Destino:** `packages/core/src/physics/systems/TileCollisionSystem.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/core/src/physics/systems/TileCollisionSystem.ts` (`applyTileKindEffect`)

**Riesgo:** MEDIO
Lógica del motor de física de baldosas. Debe cuidarse la gestión de rendimiento sin asignar closures en hot loops de física.

**Criterio de aceptación:**
Suite de tests de física de baldosas (`TileCollisionSystem.test.ts`) pasa sin regresiones.

---

### [31] [SELF] — Mapeo de Render en sincronización de GeometryWarsGame

**Archivos:** `src/games/geometrywars/GeometryWarsGame.ts:165-190` ↔ `src/games/geometrywars/GeometryWarsGame.ts:165-190`
**Volumen:** 18 líneas totales, 2 clones en este par (1 clone válido ≥ 70 tokens, 70 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Construcción del componente `Render` para entidades replicadas de enemigos y buscadores (`gw_seeker`) con propiedades por defecto.

**Por qué existe:**
Copia del descriptor de sincronización para diferentes tipos de enemigos en el netcode de Geometry Wars.

**Propuesta:**
Extraer la función helper privada `createDefaultRenderComponent(shape, size, color)` en `GeometryWarsGame.ts`.

**Destino:** `src/games/geometrywars/GeometryWarsGame.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/componentBuilders.ts`

**Riesgo:** BAJO
Helper de construcción de objetos de componente para netcode.

**Criterio de aceptación:**
Replicación multijugador de Geometry Wars asigna propiedades `Render` idénticas a los enemigos.

---

### [32] [CROSS_DOMAIN] — Método helper `removeBulletSafely` en Space Invaders Systems

**Archivos:** `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts:506-522` ↔ `src/games/space-invaders/systems/SpaceInvadersInputSystem.ts:8-24`
**Volumen:** 17 líneas, 1 clone en este par (128 tokens)
**Categoría:** CROSS_DOMAIN

**Qué está duplicado:**
El método `removeBulletSafely` que verifica `WorldUtils.isAliveAndTracked`, desencadena `reclaimable.onReclaim` / `pool.release` y remueve la entidad vía `WorldCommandBuffer`.

**Por qué existe:**
Duplicación de la rutina de devolución segura de proyectiles a sus pools entre los sistemas de colisión e input de Space Invaders.

**Propuesta:**
Mover `removeBulletSafely` a un archivo de utilidades compartido del módulo (`src/games/space-invaders/systems/SpaceInvadersUtils.ts`) e importarlo en ambos sistemas.

**Destino:** `src/games/space-invaders/systems/SpaceInvadersUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/enemyHelpers.ts`

**Riesgo:** BAJO
Función helper estática para eliminación limpia de proyectiles.

**Criterio de aceptación:**
Balas destruidas por colisión o límite de pantalla se devuelven correctamente a sus pools sin memory leaks.

---

### [33] SKIP — Duplicación entre EchoRunnerCanvasVisuals y PlatformerCanvasVisuals
**Razón:** Por debajo del umbral de tokens (máximo 52 tokens, < 70 tokens).

---

### [34] SKIP — Duplicación entre AsteroidsGame y SpaceInvadersGame
**Razón:** Por debajo del umbral de tokens (máximo 52 tokens, < 70 tokens).

---

### [35] [CANVAS_SKIA] — Renderizado de naves enemigas en Asteroids (Canvas vs Skia)

**Archivos:** `src/games/asteroids/rendering/AsteroidsCanvasVisuals.ts:240-252` ↔ `src/games/asteroids/rendering/AsteroidsSkiaVisuals.ts:212-223`
**Volumen:** 13 líneas, 1 clone en este par (86 tokens)
**Categoría:** CANVAS_SKIA

**Qué está duplicado:**
Obtención del radio del platillo volante desde el componente `Collider` (tipo `CircleShape`) o `Render.size`.

**Por qué existe:**
Comprobación idéntica de dimensiones de entidad entre Canvas2D y Skia.

**Propuesta:**
Extraer la función matemática de resolución de radio a `src/games/shared/rendering/asteroidsMath.ts` (`resolveEntityRadius`).

**Destino:** `src/games/shared/rendering/asteroidsMath.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/asteroidsMath.ts`

**Riesgo:** BAJO
Cálculo puro de geometría de colisionadores/render.

**Criterio de aceptación:**
Platillo volante y asteroides obtienen su radio exacto en Canvas y Skia.

---

### [36] [SELF] — Métodos `acquireInvaderBullet` en `EntityPool.ts` de Space Invaders

**Archivos:** `src/games/space-invaders/EntityPool.ts:66-78` ↔ `src/games/space-invaders/EntityPool.ts:88-99`
**Volumen:** 13 líneas, 1 clone en este par (71 tokens)
**Categoría:** SELF

**Qué está duplicado:**
El método `acquireInvaderBullet` está declarado idénticamente en las clases `PlayerBulletPool` y `EnemyBulletPool`.

**Por qué existe:**
Ambas clases heredan de `ProjectilePool` y copian la firma para adquirir balas de invasor.

**Propuesta:**
Mover el método `acquireInvaderBullet` a la clase base `ProjectilePool` en `@tiny-aster/core` o proveerlo mediante una extensión/método en la clase base de pools de proyectiles.

**Destino:** `packages/core/src/pooling/ProjectilePool.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/core/src/pooling/ProjectilePool.ts`

**Riesgo:** BAJO
Método conveniente en la clase base de pool.

**Criterio de aceptación:**
Adquisición de balas en Space Invaders funciona sin duplicación de código; API pública intacta.

---

### [37] [CROSS_GAME] — Suscripción a eventos de combate en CollisionSystems de Arkanoid y Space Invaders

**Archivos:** `src/games/arkanoid/systems/ArkanoidCollisionSystem.ts:20-31` ↔ `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts:52-63`
**Volumen:** 12 líneas, 1 clone en este par (73 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Suscripción en `EventBus` a los eventos `"combat:hit"` y `"combat:death"` para invocar controladores internos.

**Por qué existe:**
Patrón común de vinculación de eventos de combate en los sistemas de colisión de minijuegos.

**Propuesta:**
Usar la utilidad de vinculación de eventos del sistema de combate de `@tiny-aster/gameplay-kit` (`registerCombatEventListeners`) si ya existe, o mantener el binding local dado el volumen de 12 líneas.

**Destino:** `src/games/arkanoid/systems/ArkanoidCollisionSystem.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/gameplay-kit/src/combat/systems/`

**Riesgo:** BAJO

**Criterio de aceptación:**
Hit y death en combate se procesan sin alteraciones.

---

### [38] SKIP — Duplicación interna en `EchoRunnerGame.ts`
**Razón:** Por debajo del umbral de tokens (máximo 58 tokens, < 70 tokens).

---

### [39] SKIP — Duplicación entre `GeometryWarsSkiaVisuals.ts` y `VisualParticlePool.ts`
**Razón:** Por debajo del umbral de tokens (68 tokens, < 70 tokens).

---

### [40] [CROSS_GAME] — Renderizado de estelas de luz en PongSkiaVisuals y CanvasNeonUtils

**Archivos:** `src/games/pong/rendering/PongSkiaVisuals.ts:27-38` ↔ `src/games/shared/rendering/CanvasNeonUtils.ts:76-87`
**Volumen:** 12 líneas, 1 clone en este par (95 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Bucle de desvanecimiento y reducción progresiva de tamaño de puntos de estela (`ratio = 1 - (i / drawLength)`).

**Por qué existe:**
Copia del algoritmo de degradado de estela de movimiento.

**Propuesta:**
Sustituir la iteración local en `PongSkiaVisuals.ts` por la llamada al helper unificado en `src/games/shared/rendering/MotionTrailSystem.ts` / `SkiaNeonUtils.ts`.

**Destino:** `src/games/pong/rendering/PongSkiaVisuals.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/MotionTrailSystem.ts`, `src/games/shared/rendering/SkiaNeonUtils.ts`

**Riesgo:** BAJO
Reutilización de abstracción de estelas ya existente.

**Criterio de aceptación:**
Estelas de pelotas en Pong Skia se desvanecen suavemente.

---

### [41] [CROSS_GAME] — Registro de sistemas de presentación en EchoRunnerGame y PongGame

**Archivos:** `src/games/echorunner/EchoRunnerGame.ts:363-373` ↔ `src/games/pong/PongGame.ts:263-274`
**Volumen:** 11 líneas, 1 clone en este par (96 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Adición de `JuiceSystem`, `ScreenShakeSystem` y `RenderUpdateSystem` en la fase `SystemPhase.Presentation`.

**Por qué existe:**
Secuencia estándar de registro de sistemas visuales al final del montaje del `World`.

**Propuesta:**
Aprovechar el método heredado en `BaseGame` o el helper `registerCommonPresentationSystems(world)` en `src/games/shared/configHelper.ts`.

**Destino:** `src/games/shared/configHelper.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/configHelper.ts`

**Riesgo:** BAJO
Helper de registro de sistemas estándar.

**Criterio de aceptación:**
Juice, ScreenShake y RenderUpdate se registran en el orden y fase correcta.

---

### [42] [CROSS_GAME] — Preparación de `Skia.Paint` en GeometryWars y SpaceInvaders Skia Visuals

**Archivos:** `src/games/geometrywars/rendering/GeometryWarsSkiaVisuals.ts:102-112` ↔ `src/games/space-invaders/rendering/SpaceInvadersSkiaVisuals.ts:32-41`
**Volumen:** 11 líneas, 1 clone en este par (90 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Secuencia `paint.reset()`, `paint.setAntiAlias(true)`, `paint.setStyle(Skia.PaintStyle.Fill)`, `paint.setColor()`, `paint.setAlphaf(ratio)` para dibujado de partículas cuadradas.

**Por qué existe:**
Invocación directa de la API de Skia para renderizado de partículas en ambos juegos.

**Propuesta:**
Utilizar la función compartida de dibujado de partículas en `src/games/shared/rendering/SkiaNeonUtils.ts`.

**Destino:** `src/games/shared/rendering/SkiaNeonUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/rendering/SkiaNeonUtils.ts`

**Riesgo:** BAJO

**Criterio de aceptación:**
Partículas en Geometry Wars y Space Invaders Skia se dibujan sin distorsión.

---

### [43] SKIP — Duplicación interna en `EntityFactory.ts` de Asteroids
**Razón:** Por debajo del umbral de tokens (51 tokens, < 70 tokens).

---

### [44] SKIP — Duplicación interna en `EchoRunnerCanvasVisuals.ts`
**Razón:** Por debajo del umbral de tokens (55 tokens, < 70 tokens).

---

### [45] SKIP — Duplicación entre `GeometryWarsSkiaVisuals.ts` y `ComboHUDRenderSystem.ts`
**Razón:** Por debajo del umbral de tokens (57 tokens, < 70 tokens).

---

### [46] SKIP — Duplicación interna en `ArkanoidCollisionSystem.ts`
**Razón:** Por debajo del umbral de tokens (55 tokens, < 70 tokens).

---

### [47] SKIP — Duplicación entre `AsteroidCollisionSystem.ts` y `SpaceInvadersCollisionSystem.ts`
**Razón:** Por debajo del umbral de tokens (57 tokens, < 70 tokens).

---

### [48] [CROSS_GAME] — Inicialización de mutadores y configuración en FlappyBirdGame y FroggerGame

**Archivos:** `src/games/flappybird/FlappyBirdGame.ts:79-87` ↔ `src/games/frogger/FroggerGame.ts:81-88`
**Volumen:** 9 líneas, 1 clone en este par (70 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Asignación de `this.isMultiplayer`, aplicación de mutadores sobre `baseConfig` e inyección de `GameConfig` en los recursos del mundo.

**Por qué existe:**
Patrón común de arranque en el método `onRegisterSystems` de minijuegos arcade.

**Propuesta:**
Centralizar la asignación inicial mediante `setupArcadeGameConfig` en `src/games/shared/configHelper.ts`.

**Destino:** `src/games/shared/configHelper.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/configHelper.ts`

**Riesgo:** BAJO

**Criterio de aceptación:**
FlappyBird y Frogger inician con sus mutadores y configuraciones de juego correctamente cargados.

---

### [49] SKIP — Duplicación entre ArkanoidGame y AsteroidsGame
**Razón:** Por debajo del umbral de tokens (65 tokens, < 70 tokens).

---

### [50] SKIP — Duplicación entre ArkanoidEnemySystems y ArkanoidPowerUpSystems
**Razón:** Por debajo del umbral de tokens (50 tokens, < 70 tokens).

---

### [51] SKIP — Duplicación entre ArkanoidGameStateSystem y ArkanoidPowerUpSystems
**Razón:** Por debajo del umbral de tokens (64 tokens, < 70 tokens).

---

### [52] SKIP — Duplicación entre FlappyBirdGame y PongGame
**Razón:** Por debajo del umbral de tokens (53 tokens, < 70 tokens).

---

### [53] SKIP — Duplicación interna en `PongSkiaVisuals.ts`
**Razón:** Por debajo del umbral de tokens (50 tokens, < 70 tokens).

---

### [54] SKIP — Duplicación interna en `SpaceInvadersSkiaVisuals.ts`
**Razón:** Por debajo del umbral de tokens (51 tokens, < 70 tokens).

---

### [55] SKIP — Duplicación entre FlappyBirdCanvasVisuals y GeometryWarsCanvasVisuals
**Razón:** Por debajo del umbral de tokens (50 tokens, < 70 tokens).

---

### [56] SKIP — Duplicación entre FlappyBirdCollisionSystem y SpaceInvadersCollisionSystem
**Razón:** Por debajo del umbral de tokens (51 tokens, < 70 tokens).

---

### [57] [CROSS_GAME] — Recolección de posiciones de jugadores en GeometryWarsGame y SpaceInvadersGame

**Archivos:** `src/games/geometrywars/GeometryWarsGame.ts:221-227` ↔ `src/games/space-invaders/SpaceInvadersGame.ts:830-836`
**Volumen:** 7 líneas, 1 clone en este par (77 tokens)
**Categoría:** CROSS_GAME

**Qué está duplicado:**
Recorrido de mapa/récord de proyectiles para poblar el arreglo de entradas de interpolación `entries.push({ entityId, x: p.x, y: p.y, rotation: p.angle })`.

**Por qué existe:**
Mapeo de objetos de estado de red a estructuras de interpolación en minijuegos multijugador.

**Propuesta:**
Utilizar la función de mapeo de entidades de red de `src/games/shared/netcode/NetcodeSyncUtils.ts`.

**Destino:** `src/games/shared/netcode/NetcodeSyncUtils.ts`

**Abstracciones previas a verificar antes de implementar:**
`src/games/shared/netcode/NetcodeSyncUtils.ts`

**Riesgo:** BAJO

**Criterio de aceptación:**
Interpolación multijugador registra coordenadas de proyectiles correctamente.

---

### [58] [SELF] — Instanciación de builder en `EntityBuilder.ts`

**Archivos:** `packages/core/src/ecs/EntityBuilder.ts:38-43` ↔ `packages/core/src/ecs/EntityBuilder.ts:60-65`
**Volumen:** 6 líneas, 1 clone en este par (72 tokens)
**Categoría:** SELF

**Qué está duplicado:**
Llamada genérica a `createBuilderInstance((w, e, cb) => new EntityBuilder(w, e, cb), world, undefined, false)` en métodos estáticos de fábrica.

**Por qué existe:**
Sobrecargas estáticas de `EntityBuilder.create` y `EntityBuilder.createDeferred`.

**Propuesta:**
Mantener el patrón actual. La pequeña repetición en sobrecargas genéricas de TypeScript con inferencia de tipos estática es ruido estructural que preserva el type-checking de ECS.

**Destino:** `packages/core/src/ecs/EntityBuilder.ts`

**Abstracciones previas a verificar antes de implementar:**
`packages/core/src/ecs/EntityBuilder.ts`

**Riesgo:** BAJO

**Criterio de aceptación:**
No se aplican cambios; inferencia de tipos de `EntityBuilder` se mantiene 100% tipada.

---

### [59] SKIP — Duplicación entre ArkanoidInputSystem y ArkanoidSpinSystem
**Razón:** Por debajo del umbral de tokens (57 tokens, < 70 tokens).

---

### [60] SKIP — Duplicación entre EntityFactory (Asteroids) y GeometryWarsEntities
**Razón:** Por debajo del umbral de tokens (52 tokens, < 70 tokens).

---

### [61] SKIP — Duplicación entre EchoRunnerEncounter y FlappyBirdEncounter
**Razón:** Por debajo del umbral de tokens (65 tokens, < 70 tokens).

---

### [62] SKIP — Duplicación entre EchoRunnerEncounter y PlatformerEncounter
**Razón:** Por debajo del umbral de tokens (57 tokens, < 70 tokens).

---

### [63] SKIP — Duplicación interna en `PlatformerGame.ts`
**Razón:** Por debajo del umbral de tokens (61 tokens, < 70 tokens).

---

### [64] SKIP — Duplicación interna en `PongGameStateSystem.ts`
**Razón:** Por debajo del umbral de tokens (61 tokens, < 70 tokens).

---

## Verificación Final de las Propuestas

- **Validación del motor y límites:** `pnpm run check:core-boundaries` y `pnpm run check:gameplay-kit-boundaries` pasados.
- **Auditoría de API pública:** Ningún símbolo exportado internamente en las propuestas se promoverá en `index.ts` ni modificará `etc/asteroides.api.md`. Todos los nuevos tipos/helpers serán anotados con `@internal`.
- **Ratchets de Calidad:** `pnpm run check:ratchet` y `pnpm run check:duplication` verificados.
