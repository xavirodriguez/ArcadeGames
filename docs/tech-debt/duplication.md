# Technical Debt: Code Duplication Tracking

Documentación de bloques de código duplicados identificados mediante `jscpd`, sus niveles de impacto, planes de refactorización y bloqueos conocidos.

---

## [DUP-01] Enemy Blueprints in Platformer & EchoRunner
- **Archivos**:
  - `src/games/echorunner/EchoRunnerGame.ts:201-271`
  - `src/games/platformer/PlatformerGame.ts:201-271`
- **Líneas duplicadas**: ~70 líneas
- **Prioridad**: Alta
- **Estado**: Refactorizado
- **Solución**: Se extrajo la función `registerPlatformerEnemyBlueprints` en `src/games/shared/arcade/blueprints/enemyBlueprints.ts`.

---

## [DUP-02] Player Input Handling (`setInputState`) in Platformer & EchoRunner
- **Archivos**:
  - `src/games/echorunner/EchoRunnerGame.ts:350-370`
  - `src/games/platformer/PlatformerGame.ts:350-370`
- **Líneas duplicadas**: ~20 líneas
- **Prioridad**: Alta
- **Estado**: Refactorizado
- **Solución**: Se extrajo la función `mutatePlatformerInputState` en `src/games/shared/arcade/helpers/inputHelpers.ts`.

---

## [DUP-03] Encounter Navigation Assist Modifiers Across Games
- **Archivos**:
  - `src/games/asteroids/story/EscapeRouteEncounter.ts:131-157`
  - `src/games/flappybird/story/FlappyBirdEncounter.ts:133-158`
  - `src/games/geometrywars/story/GeometryWarsEncounter.ts:132-157`
  - `src/games/platformer/story/PlatformerEncounter.ts:132-157`
  - `src/games/space-invaders/story/InvasionEncounter.ts:132-158`
  - `src/games/echorunner/story/EchoRunnerEncounter.ts:134-158`
- **Líneas duplicadas**: ~160 líneas totales (~27 líneas × 6 archivos)
- **Prioridad**: Alta
- **Estado**: Refactorizado
- **Solución**: Se extrajo la aplicación de modificadores con `applyStandardEncounterModifiers` en `src/games/shared/story/encounterHelpers.ts`.

---

## [DUP-04] Canvas2D vs Skia Renderer Visual Drawers
- **Archivos**:
  - `src/games/flappybird/rendering/FlappyBirdCanvasVisuals.ts` ↔ `FlappyBirdSkiaVisuals.ts`
  - `src/games/echorunner/rendering/EchoRunnerCanvasVisuals.ts` ↔ `EchoRunnerSkiaVisuals.ts`
  - `src/games/space-invaders/rendering/SpaceInvadersCanvasVisuals.ts` ↔ `SpaceInvadersSkiaVisuals.ts`
  - `src/games/geometrywars/rendering/GeometryWarsCanvasVisuals.ts` ↔ `GeometryWarsSkiaVisuals.ts`
- **Líneas duplicadas**: >500 líneas
- **Prioridad**: Media
- **Estado**: Bloqueado
- **Sugerencia**: Mantener estructuras similares para paridad visual.
- **Bloqueo**: Canvas2D (HTML5 Canvas context `CanvasRenderingContext2D`) y Skia (`Skia` Canvas API) utilizan primitivas de dibujo divergentes. Mantener paridad de firmas y cálculo de geometría garantiza equivalencia en ambas plataformas sin introducir abstracciones de renderizado pesadas en hot paths.

---

## [DUP-05] Entity Pool Internal Resets (`EntityPool.ts`)
- **Archivos**:
  - `src/games/space-invaders/EntityPool.ts:49-84` ↔ `EntityPool.ts:120-155`
- **Líneas duplicadas**: 36 líneas
- **Prioridad**: Baja
- **Estado**: Detectado
- **Sugerencia**: Consolidar métodos de reseteo interno en `EntityPool`.

---

## [DUP-06] NarrowPhase Collision Manifold Calculation
- **Archivos**:
  - `packages/core/src/physics/collision/NarrowPhase.ts:89-121`
  - `packages/core/src/physics/collision/NarrowPhase.ts:438-470`
- **Líneas duplicadas**: 33 líneas
- **Prioridad**: Baja
- **Estado**: Bloqueado (Hotpath)
- **Sugerencia**: Dejar inline.
- **Bloqueo**: `NarrowPhase.ts` es el núcleo de detección de colisiones de bajo nivel ejecutado cada tick para miles de pares de geometrías. Extraer a funciones auxiliares añade sobrecoste de llamadas en el callstack dentro del bucle crítico de físicas.

---

## [DUP-07] SceneManager Transition Promise Handlers
- **Archivos**:
  - `packages/core/src/scenes/SceneManager.ts:376-423`
  - `packages/core/src/scenes/SceneManager.ts:552-599`
- **Líneas duplicadas**: 48 líneas
- **Prioridad**: Media
- **Estado**: Refactorizado
- **Solución**: Se extrajo el helper privado `createTimeoutPromise` en `SceneManager.ts`.
