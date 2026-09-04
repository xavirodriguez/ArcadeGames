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
- **Líneas duplicadas**: Extracción parcial de cálculos puros (~51 líneas de duplicación eliminadas en FlappyBird)
- **Prioridad**: Media
- **Estado**: Parcialmente resuelto
- **Solución / Decisión**: Se extrajeron las funciones de cálculo matemático/geométrico puro (generación de starfield, squash and stretch, geometría de pipes y megainfraestructura) a `src/games/shared/rendering/geometry.ts`. Las primitivas de dibujo específicas de Canvas/Skia se mantuvieron intencionalmente duplicadas para evitar abstracciones pesadas en el hot path de renderizado.

---

## [DUP-05] Entity Pool Internal Resets (`EntityPool.ts`)
- **Archivos**:
  - `src/games/space-invaders/EntityPool.ts`
- **Líneas duplicadas**: 36 líneas
- **Prioridad**: Baja
- **Estado**: Refactorizado
- **Solución**: Se creó la factory parametrizada `createBulletPoolConfig` en `EntityPool.ts` consolidando las configuraciones de `factory`, `reset` e `initializer` para `PlayerBulletPool` y `EnemyBulletPool` preservando la API pública intacta.

---

## [DUP-06] NarrowPhase Collision Manifold Calculation
- **Archivos**:
  - `packages/core/src/physics/collision/NarrowPhase.ts:89-121`
  - `packages/core/src/physics/collision/NarrowPhase.ts:438-470`
- **Líneas duplicadas**: 33 líneas
- **Prioridad**: Baja
- **Estado**: Bloqueado con evidencia (Hot path medido)
- **Evidencia / Decisión**: Se ejecutó benchmark con 1,000,000 iteraciones sobre pares de geometrías. La versión inline registró un promedio de 2813.57 ms, mientras que la versión extraída a función auxiliar registró 2915.18 ms, representando un aumento de tiempo del ~3.6% por sobrecoste de callstack en el hot path. Se decidió mantener el código inline a propósito y documentar el motivo.

---

## [DUP-07] SceneManager Transition Promise Handlers
- **Archivos**:
  - `packages/core/src/scenes/SceneManager.ts:376-423`
  - `packages/core/src/scenes/SceneManager.ts:552-599`
- **Líneas duplicadas**: 48 líneas
- **Prioridad**: Media
- **Estado**: Refactorizado
- **Solución**: Se extrajo el helper privado `createTimeoutPromise` en `SceneManager.ts`.

---

## [DUP-08] HitDetectionSystem Trigger vs Collision Overlap Logic
- **Archivos**:
  - `packages/core/src/systems/HitDetectionSystem.ts:30-59` ↔ `packages/core/src/systems/HitDetectionSystem.ts:65-94`
- **Líneas duplicadas**: 30 líneas
- **Prioridad**: Media
- **Estado**: Refactorizado
- **Solución**: Se extrajo el método privado `processHitOverlap` en `HitDetectionSystem.ts`.

---

## [DUP-09] Camera2D Screen and World Coordinate Transformation Info Resolution
- **Archivos**:
  - `packages/core/src/rendering/Camera2D.ts:124-147` ↔ `packages/core/src/rendering/Camera2D.ts:162-185`
- **Líneas duplicadas**: 24 líneas
- **Prioridad**: Media
- **Estado**: Refactorizado
- **Solución**: Se extrajo el método privado estático `getMainCameraInfo` en `Camera2DSystem.ts`.
