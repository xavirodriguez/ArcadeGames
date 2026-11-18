# Progreso de refactorización — ArcadeGames / TinyAster

## Estado actual (SHA 45837f35ca1a93abf6467ff30c66e9d5a1b1625c, Node v24.21.0, pnpm 10.30.3)

## ✅ Completado y verificado

### P0.1 · CombatRollbackResimulation (determinismo por rollback)
**Causa raíz:** durante el resim por rollback (`isReSimulating=true`), varios sistemas que consumen `world.gameplayRandom` y crean entidades ECS estaban gateados, haciendo que el stream aleatorio y el conjunto de entidades divergeran de la ejecución normal (`hashNormal !== hashResimulated`).
**Cambios (3 archivos):**
- `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`: se quitó el gate `if (!world.isReSimulating)` de `spawnLayeredExplosion`/`spawnSharedLayeredExplosion` (capa 2-4), que consumía `gameplayRandom` y creaba entidades ECS (Transform/Render/TTL) con hash.
- `packages/core/src/systems/ParticleSystem.ts`: se quitó `if (world.isReSimulating) return;` para que las partículas del emisor se generen en normal y resim.
- `src/games/shared/rendering/JuiceOrchestrator.ts`: se quitó `if (this.world.isReSimulating) return null;` de `spawn`, que generaba la entidad flash/onda (Transform+Render) cuya ausencia rompía el hash.
**Verificación:** `CombatRollbackResimulation.test.ts` 6/6 pass (incl. Case 2 & 4 hash igual); suite completa de `packages/core` 138 suites / 762 tests pass.

### P1.4 · `as unknown` en ShmupJuiceHelpers
**Cambio:** `src/games/vertical-shmup/juice/ShmupJuiceHelpers.ts:48` — `const core = world as unknown as World;` → `const core = world;` (todos los métodos usados son públicos en `World`).
**Verificación:** `pnpm run check:ratchet` pasa (el archivo pasó de `as unknown=1` a `0`, baseline 0).

### P1.5 · Avisos TSDoc (6 → 0)
Se escaparon/enclosaron los símbolos problemáticos en comentarios fuente y se regeneró con `docs:extract` (`api-extractor` limpio, sin `tsdoc-*`):
- `packages/core/src/ecs/CoreComponents.ts:1562` `(z >= 0)` → `(z \>= 0)` (escape-greater-than)
- `packages/core/src/theme/GeometryProfile.ts:50` `({x:1, y:0})` → `(\{x:1, y:0\})` (escape-right-brace + malformed-inline-tag)
- `packages/core/src/theme/Theme.ts:25` `->` → `\->` (escape-greater-than)
- `src/games/shared/rendering/SharedVFX.ts` y `src/games/shared/rendering/ExplosionSystem.ts`-adjuntos: `{ x: 0.5, y: 1 }` → `\{ x: 0.5, y: 1 \}` (escape-right-brace + malformed-inline-tag)

### P2.8 · Jest parsea `assets/ship.png` como JS
**Cambio:**
- Creado `packages/core/tests/__mocks__/jest.pngStub.cjs` (`module.exports = "stub://png-for-jest"`).
- Añadido `'\\.(png)$': '<rootDir>/tests/__mocks__/jest.pngStub.cjs'` al `moduleNameMapper` de `packages/core/jest.config.cjs` (solo Jest; Metro/Expo intactos).
**Verificación:** `CampaignRenderInit.test.ts` pasa.

### P2.9 · `UnifiedInputSystem` deprecated
**Causa raíz:** `this.unifiedInput` en los juegos es en realidad `BaseGame.unifiedInput` (un `NullInputSystem` cuyo `bind` es no-op y `getAction` nunca se llama). La clase `UnifiedInputSystem` ya tenía `@deprecated` + `console.warn`; los juegos no la instancian (solo usan `BaseGame.setInputState()`).
**Cambios:**
- `src/games/flappybird/FlappyBirdGame.ts`: se quitó `this.unifiedInput.bind("flap", ...)` y el bloque `if (this.unifiedInput instanceof System) {...}` que lo registraba como sistema (no-op).
- `src/games/space-invaders/SpaceInvadersGame.ts`: se quitó `this.unifiedInput.bind("moveLeft"/"moveRight"/"shoot"/"emp", ...)`.
**Nota:** la clase `UnifiedInputSystem` NO se borra y `packages/core/src/input/__tests__/UnifiedInputSystem.test.ts` se conserva.

---

## 📋 P1.6 · `ae-missing-release-tag` (35 símbolos) — clasificación

Se localizó la definición y se buscaron consumidores reales fuera de `packages/core/src` (en `src/` y `packages/*/src`, excluyendo `packages/core/src` y tests). Clasificación:

| # | Símbolo | Definición | Consumidores reales (fuera de core) | Tag propuesto | Motivo |
|---|---------|------------|-------------------------------------|---------------|--------|
| 1 | `SpriteImageDimensions` | `src/games/shared/sprites/SpriteSheetDefinition.ts:105` (def: `packages/core/src/assets/SpriteSheetDefinition.ts:105`) | `src/games/shared/sprites/SpriteManifestValidator.ts` | `@public` | Consumido por módulos de juego compartidos |
| 2 | `SpriteAnchor` | `packages/core/src/assets/SpriteSheetDefinition.ts:112` | Ninguno | `@internal` | Solo usado dentro de core |
| 3 | `SpriteDestinationRect` | `packages/core/src/assets/SpriteSheetDefinition.ts:118` | Ninguno | `@internal` | Solo usado dentro de core |
| 4 | `calculateSpriteDestinationRect` | `packages/core/src/assets/SpriteSheetDefinition.ts:129` | `src/games/shared/sprites/SpriteDrawer.ts`, `packages/renderer-canvas/src/CanvasSpriteDrawer.ts`, `packages/renderer-skia/src/SkiaSpriteDrawer.ts` | `@public` | Usado por renderizadores Canvas y Skia |
| 5 | `ShapeType` | `packages/core/src/physics/shapes/Shapes.ts:17` | Juegos (asteroids, platformer, visual helpers) | `@public` | API de componentes de colisión usada por juegos |
| 6 | `PlatformerInputComponent` | `packages/core/src/ecs/CoreComponents.ts:861` | Ninguno | `@internal` | Definido pero no importado fuera de core |
| 7 | `CoreComponentRegistry` | `packages/core/src/ecs/CoreComponents.ts` (uso como tipo paramétrico) | `src/games/asteroids/types/AsteroidRegistry.ts`, `EntityPool.ts`, `IcebergBackground.ts` | `@public` | Usado como parámetro de tipo en registros de juegos |
| 8 | `StateGateComponent` | `packages/core/src/ecs/CoreComponents.ts:1774` | Ninguno | `@internal` | Solo usado dentro de core |
| 9 | `DeathZoneComponent` | `packages/core/src/ecs/CoreComponents.ts:1784` | Ninguno | `@internal` | Solo usado dentro de core |
| 10 | `RespawnPointComponent` | `packages/core/src/ecs/CoreComponents.ts:1790` | Ninguno | `@internal` | Solo usado dentro de core |
| 11 | `SystemPhase` | `packages/core/src/ecs/System.ts:35` | Juegos (registro de sistemas por fase) | `@public` | API de registro de sistemas |
| 12 | `SceneState` | `packages/core/src/scenes/SceneManager.ts:57` | `packages/renderer-canvas/src/CanvasRenderer.ts` | `@public` | Usado por el renderizador Canvas |
| 13 | `DiscreteFlingEvent` | `packages/core/src/input/TouchInputState.ts:14` | Ninguno | `@internal` | Solo usado dentro de core |
| 14 | `DiscreteLaneShiftEvent` | `packages/core/src/input/TouchInputState.ts:21` | Ninguno | `@internal` | Solo usado dentro de core |
| 15 | `TouchPointerState` | `packages/core/src/input/TouchInputState.ts:26` | Ninguno | `@internal` | Solo usado dentro de core |
| 16 | `TouchInputState` | `packages/core/src/input/TouchInputState.ts:32` | Sistemas de input de juegos (asteroids, arkanoid, racing) | `@public` | Estado de entrada táctil consumido por juegos |
| 17 | `ArcadeState` | `packages/core/src/runtime/ArcadeKernel.ts:38` | `src/hooks/useArcadeTransition.ts` | `@public` | Estado del ciclo de vida del arcade expuesto a hooks |
| 18 | `GameLifecycleState` | `packages/core/src/runtime/BaseGame.ts:60` | `src/games/shared/testing/GameContractSuite.ts` | `@public` (ver nota) | Usado por el contrato de pruebas compartido de juegos |
| 19 | `calculateScreenConfig` | `packages/core/src/runtime/GamePresentationShell.ts:39` | Ninguno | `@internal` | Utilidad de shell interna |
| 20 | `CuePriority` | `packages/core/src/audio/SoundBank.ts:3` | Ninguno | `@internal` | Solo usado dentro de core |
| 21 | `CueSpec` | `packages/core/src/audio/SoundBank.ts:5` | `packages/arcade-sound-kit/src/export/cues.ts` | `@public` | Consumido por el paquete `arcade-sound-kit` (cruce de paquetes) |
| 22 | `CueBankData` | `packages/core/src/audio/SoundBank.ts:17` | Ninguno | `@internal` | Solo usado dentro de core |
| 23 | `ActiveVoice` | `packages/core/src/audio/SoundBank.ts:22` | Ninguno | `@internal` | Solo usado dentro de core |
| 24 | `SoundBankConfig` | `packages/core/src/audio/SoundBank.ts:29` | Ninguno | `@internal` | Solo usado dentro de core |
| 25 | `SoundBank` | `packages/core/src/audio/SoundBank.ts:48` | Ninguno | `@internal` | Solo usado dentro de core |
| 26 | `getSharedSoundBank` | `packages/core/src/audio/AudioEventMap.ts:165` | Ninguno | `@internal` | Solo usado dentro de core (exportado pero sin consumidor externo) |
| 27 | `preloadSharedAudioManifest` | `packages/core/src/audio/AudioEventMap.ts:175` | Juegos (asteroids, platformer, arkanoid) | `@public` | API de pre-carga de audio usada por juegos |
| 28 | `SteerWaypointResult` | `packages/core/src/physics/vehicles/VehicleWaypointSystem.ts:18` | Ninguno | `@internal` | Solo usado dentro de core |
| 29 | `VehicleWaypointSteeringContext` | `packages/core/src/physics/vehicles/VehicleWaypointSystem.ts:25` | Ninguno | `@internal` | Solo usado dentro de core |
| 30 | `RenderCommandType` | `packages/core/src/rendering/RenderTypes.ts:16` | Ninguno | `@internal` | Solo usado dentro de core |
| 31 | `createEmitter` | `packages/core/src/systems/ParticleSystem.ts:146` | Juegos (arkanoid, pong) | `@public` | API de creación de partículas usada por juegos |
| 32 | `ShootJuiceConfig` | `packages/core/src/utils/Juice.ts:6` | Ninguno | `@internal` | Config de juice interna |
| 33 | `HitJuiceConfig` | `packages/core/src/utils/Juice.ts:13` | Ninguno | `@internal` | Config de juice interna |
| 34 | `DeathJuiceConfig` | `packages/core/src/utils/Juice.ts:20` | Ninguno | `@internal` | Config de juice interna |
| 35 | `PickupJuiceConfig` | `packages/core/src/utils/Juice.ts:26` | Ninguno | `@internal` | Config de juice interna |

**Recomendación:** añadir `@public` a los 13 símbolos externos y `@internal` a los 23 internos. Para los internos, evaluar sacarlos del barrel (`packages/core/src/index.ts`) si no se necesitan como API pública; verificar primero que ningún consumidor los importe vía barrel.

**Nota:** `GameLifecycleState` (#18) solo es consumido por `GameContractSuite` (utilidad de pruebas compartida en `src/games/shared/testing`); clasificar como `@public` por ser parte del contrato de juegos, o revisar si debe ser `@internal`.

---

## ⏳ En curso / pendiente

- **P0.2** `e2e/hitandrun.spec.ts` `totalSpawned = 0`: requiere revisar cadena wave → timeline → spawn system → blueprint → World → `totalSpawned++`. Requiere entorno E2E (Playwright + servidor de desarrollo Expo) para reproducir.
- **P0.3** `e2e/hitandrun.spec.ts` `readPlayerHealth() === null` tras restart: sospecha de referencia al `World` anterior / sistemas no re-registrados. Requiere entorno E2E.
- **P1.6 (aplicación):** aplicar los tags `@public`/`@internal` a los 35 símbolos y decidir retirada del barrel para internos (pendiente de tu revisión para no romper importaciones).
- **P1.7** `etc/asteroides.api.md`: no se tocará sin tu aprobación (pendiente de diff de firmas).
- **P2.10** Warnings de consola (StoryRuntime, WebAudioPlayer, WorldCommandBuffer, GameLoop): por clasificar como test negativo con spy local o fallo de configuración.
- **P3.11** Perf E2E (workers, caché): solo tras estabilizar P0–P2.
- **AGENTS.md:** añadir la sección PREVENCIÓN (REGLAS y MÉTODO) tal como se detalla en tu encargo.

## ⚠️ Fallos pre-existentes (no causados por este trabajo, verificados en árbol limpio)
- `packages/core/tests/CombatRollbackResimulation.test.ts` — ya fallaba antes (mismo patrón de hash).
- `src/games/space-invaders/__tests__/SpaceInvadersCombat.test.ts:285` (`invader1` retiene `Health`) — ya fallaba en árbol limpio.
- `packages/core/tests/CombatRollbackResimulation.test.ts` "Case 2 & 4" ya fallaba antes de mis cambios (hash distinto por semilla aleatoria por ejecución).

## Siguiente paso sugerido
¿Priorizas aplicar las release-tags de P1.6 (con tu revisión sobre qué sacar del barrel), continuar con P0.2/P0.3 (requiere entorno E2E), o atender P2.10/P3.11/AGENTS.md?
