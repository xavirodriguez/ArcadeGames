# Juice Consolidation Ledger

| Fecha | Fase/Área | Archivo y símbolo | Estado | Qué se hizo / por qué |
| --- | --- | --- | --- | --- |
| 2026-10-26 | Fase 0 (auditoría) | `src/games/shared/rendering/HitStopSystem.ts` (`HitStopSystem`, `requestHitStop`, `isHitStopActive`) | shared | Audited single route. Priority-based hit-stop timer in VFX state (ms input converted to seconds, priority matrix, 50ms cooldown). Disconnected from core `Schedule.ts` which checks `GameplayFreeze` resource. No code modified. |
| 2026-10-26 | Fase 0 (auditoría) | `packages/core/src/utils/Juice.ts` (`Juice.shake`) | shared | Audited single route. 3-tier fallback cascade: 1) `ScreenShake` singleton/component (driven by `ScreenShakeSystem`), 2) `ScreenShake` world resource, 3) `GameState.screenShake` legacy singleton (converts ms > 10 to seconds). No code modified. |
| 2026-10-26 | Fase 0 (auditoría) | `src/games/shared/rendering/JuiceOrchestrator.ts` (`JuiceOrchestrator`, `JUICE_CATALOG`, `triggerEvent`, `spawn`) | shared | Audited single route. High-level Game Feel Orchestrator mapping `GameJuiceEventMap` to `JUICE_CATALOG`. `triggerEvent` calls `spawn`, which delegates hit-stop via `requestHitStop` (VFX state timer disconnected from core `GameplayFreeze`) and screen shake via `Juice.shake` (3-tier fallback). Safely uses `world.getCommandBuffer()` when `isUpdating`. No code modified. |
| 2026-10-31 | Fase 0 (auditoría) | `src/games/hitandrun/systems/HitRunFeedbackSystem.ts` (`HitRunFeedbackSystem`, `isSimulationFrozen`, `applyHitStop`, `applyScreenShake`) | duplicate | Audited single route. Canonical hit-stop using `enterGameplayFreeze`/`getGameplayFreezeRemaining` on core `GameplayFreeze`. Double-channel screen shake writes to both local resource `HitRunScreenShake` and camera `ScreenShake` component; grep confirms 0 renderers read `HitRunScreenShake` (orphan consumer path). Respects `world.isReSimulating` for shake and hit flash. No code modified. |
| 2026-11-01 | Fase 0 (auditoría) | `src/games/hitandrun/weapons/HitRunWeaponSystem.ts` (`HitRunWeaponSystem`, recoil/shake, `isSimulationFrozen`) | duplicate | Audited single route. Guards simulation via `isSimulationFrozen(world)`. Direct recoil via `applyRecoil`. Double-channel screen shake on fire: writes to local resource `HitRunScreenShake` AND camera `ScreenShake` component when `!world.isReSimulating`. Duplicate write to orphan resource `HitRunScreenShake` (0 readers). No code modified. |
| 2026-11-03 | Fase 0 (auditoría) | `src/games/pong/systems/PongCollisionSystem.ts` (`PongCollisionSystem.update`, paddle hit feedback) | legacy at audit time; migrated 2026-11-05 | Audited single route. Paddle collision directly writes `world.setResource("GameplayFreeze", { remaining: 0.06 })` bypassing priority/cooldown matrix, calls `Juice.shake(world, 4, 150)`, performs multiple `Juice.squash`/`Juice.add` tweens, spawns inline `createEmitter` (`type: "hit"`), and emits `PlaySFX`. This audit finding was superseded by the 2026-11-05 migration row below: the catalog now owns the 60 ms freeze, and inline particles/SFX are guarded during rollback. |
| 2026-11-04 | Fase 0 (auditoría) | `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts` (`SpaceInvadersCollisionSystem`, `onPlayerCombatHit`, `onBossCombatHit`, `onInvaderCombatHit`, `onInvaderCombatDeath`, `damageShield`) | legacy | Audited single route. Direct `GameplayFreeze` writes: boss hit (50ms) and invader hit (30ms) bypass `requestHitStop` and priority hierarchy. Direct `Juice.shake` (player hit: 10/300ms; invader kill: 2.5-5.5/100-180ms) and direct `Juice.squash` (player, boss, invader). Transient `new JuiceOrchestrator(world)` instantiated on each boss hit, invader death, and shield degradation. Discrepancy: `onBossCombatHit` emits `ufo:destroyed` instead of a dedicated boss hit profile; `SpaceInvadersGameScene` registers `HitStopSystem` in Simulation phase, but collision handlers bypass it completely via raw `GameplayFreeze` resource writes. Rollback guards (`!world.isReSimulating`) present on SFX and orchestrator triggers. No code modified. |
| 2026-11-05 | Fase 0 (auditoría) | `src/games/arkanoid/systems/ArkanoidCollisionSystem.ts` (`ArkanoidCollisionSystem`, `onCombatHit`, `onCombatDeath`, `update`) | legacy | Audited single route. Discrepancy with `JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md` Section 3.2: does NOT write `GameplayFreeze` directly (0 references). Instead, it calls `this.getOrchestrator(world).triggerEvent("arkanoid", "brick:hit")` in `onCombatHit` and `triggerEvent("arkanoid", "brick:shatter")` in `onCombatDeath` (guarded by `!world.isReSimulating`), which request hit-stop via `requestHitStop` in VFX state. `ArkanoidGame` registers `HitStopSystem` in Simulation phase (priority 100). Mixed feedback: still uses inline `Juice.squash` (paddle, brick), manual `createEmitter` (sparks, explosions with TTL), and `PlaySFX` deferred emissions. `onCombatHit` triggers orchestrator even during re-simulation (missing `!world.isReSimulating` guard present in `onCombatDeath`). No code modified. |
| 2026-11-07 | Fase 0 (auditoría) | `src/games/asteroids/systems/AsteroidCollisionSystem.ts` (`AsteroidCollisionSystem`, `onCombatDeath`, `resolveShipAsteroidCollision`, `combat:hit` listener) | duplicate | Audited single route. Mixed orchestrator + direct channels. On rock destruction (`onCombatDeath`), invokes `triggerEvent("asteroids", "rock:destroyed")` (catalog requests 40ms hit-stop NORMAL priority, 2.5 shake for 80ms) and simultaneously triggers redundant direct `Juice.shake(world, size === "large" ? 3.0 : 1.5, 80)`. On player hit/death (`resolveShipAsteroidCollision`), triggers `triggerEvent("asteroids", "ship:damage")` (catalog requests 150ms hit-stop CRITICAL priority, 5.0 shake for 150ms) and simultaneously triggers direct `Juice.playDeathJuice(world, ship, { shakeIntensity: 6.0, shakeDuration: 180 })`. Caches member instance `this.juice ??= new JuiceOrchestrator(world)` avoiding per-collision allocations. `combat:hit` listener guards rollback with `world.isReSimulating`, but `onCombatDeath` and `resolveShipAsteroidCollision` lack `!world.isReSimulating` guards around `this.juice.triggerEvent`, `Juice.shake`, and `spawnExplosionParticles`. No code modified. |
| 2026-11-08 | Fase 0 (auditoría) | `src/games/geometrywars/systems/KineticAccumulatorSystem.ts` (`KineticAccumulatorSystem.triggerBurstShockwave`) | duplicate | Audited single route. Dual screen shake channel: on bomb burst under `!world.isReSimulating`, invokes direct `Juice.shake(world, 10, 0.3)` (duration in seconds: 0.3s) and simultaneously creates transient `new JuiceOrchestrator(world)` invoking `triggerEvent("geometry-wars", "bomb:trigger")` whose catalog entry specifies `shakeIntensity: 6.0, shakeDurationMs: 300` (duration in ms: 300ms). Manual visual entity construction (`shockwave` with Transform, Render, TTL) bypasses `juice.spawn("shockwave")`. Direct particle emission through `GWParticlePool` with manual `gameplayRandom` lock/unlock. Correctly guards shake, SFX, and orchestrator triggers with `!world.isReSimulating`. No code modified. |
| 2026-11-09 | Fase 0 (auditoría) | `src/games/frogger/systems/FroggerInputSystem.ts` (`FroggerInputSystem.update`, `frog:hop`), `FroggerGameStateSystem.ts` | legacy | Audited single route. `FroggerInputSystem` triggers `this.juice.triggerEvent("frogger", "frog:hop")` caching member instance `this.juice ??= new JuiceOrchestrator(world)` and guards with `!world.isReSimulating`. Discrepancy with `JUICE_CATALOG` (`JuiceOrchestrator.ts:140`): catalog defines `goal:reached` (shield_bubble, 80ms hit-stop HIGH priority) and `frog:splat` (shockwave, 150ms hit-stop CRITICAL priority, 4.0 shake for 120ms), but `FroggerGameStateSystem` emits only raw EventBus events (`frogger:died`, `frogger:goal_reached`) without invoking `JuiceOrchestrator.triggerEvent` or writing to `GameplayFreeze` / `ScreenShake`. Furthermore, `FroggerGame.ts` does not register `HitStopSystem` in Simulation phase. No code modified. |
| 2026-11-10 | Fase 0 (auditoría) | `src/games/flappybird/systems/FlappyBirdCollisionSystem.ts` (`handleNearMissLogic`, `triggerGameOver`), `FlappyBirdInputSystem.ts`, `FlappyBirdGameStateSystem.ts`, `FlappyBirdGame.ts` | legacy | Audited single route. `FlappyBirdInputSystem` triggers `this.juice.triggerEvent("flappybird", "bird:flap")` caching member instance `this.juice ??= new JuiceOrchestrator(world)` and guards with `!world.isReSimulating`, along with inline `Juice.squash(world, entity, 1.2, 0.8, 50)`. Discrepancies with `JUICE_CATALOG` (`JuiceOrchestrator.ts:134-138`): catalog defines `bird:crash` (`shockwave`, 150ms hit-stop CRITICAL priority, 5.0 shake for 150ms), but `FlappyBirdCollisionSystem.triggerGameOver` does not invoke `triggerEvent`; instead it executes inline `Juice.add` tweens on `scaleX`/`scaleY` with elastic easing and sets `render.hitFlashFrames = 8`. In `handleNearMissLogic`, direct `Juice.shake(world, 2, 100)` is triggered without rollback guard or catalog profile representation. In `FlappyBirdGameStateSystem`, passing a pipe emits EventBus event `"pipe:passed"` but never invokes catalog profile `pipe:passed` (`floating_text`). Furthermore, `FlappyBirdGame.ts` registers `JuiceSystem` in Presentation but does not register `HitStopSystem` in Simulation. No code modified. |

| 2026-11-05 | Fase 0 (auditoría actualizada) | `docs/audit/2026-11-05-juice-game-feel-phase-0-audit.md` | documented | Re-verified the split `VFXWorldState.hitStopTimer` / core `GameplayFreeze` ownership, scheduler expiry ordering, pause and TimeScale countdown behavior, the three `Juice.shake` destinations and their unit mismatch, system registrations, game-level direct writes, and known rollback producer gaps. Corrected stale Arkanoid and HitStopSystem statements from earlier audit docs. No runtime code changed; tests/typecheck/build not run. |
| 2026-11-05 | PR1 / Core freeze tick semantics | `packages/core/src/ecs/Schedule.ts`, `packages/core/tests/GameplayFreeze.test.ts` | implemented on branch | Latched freeze eligibility at tick start; a finite freeze that reaches zero during the tick continues to suppress gameplay phases until the tick completes, then the exact observed resource is removed. Zero-duration freezes are inactive at tick start. Added regression coverage for expiry-tick resumption and zero-duration resources. Tests have been authored but not executed in this environment. Hit-stop request routing remains deliberately deferred until authoritative rollback/resimulation semantics are specified; no second timer was removed or bridged in this slice. |

| 2026-11-05 | Fase 1 / Contrato rollback de hit-stop | `packages/core/src/snapshots/WorldSnapshot.ts`, `SnapshotSerializer.ts`, `SnapshotSerializerSoA.ts`, `SnapshotRestore.ts`, `SnapshotRestoreSoA.ts`, `src/games/shared/rendering/HitStopSystem.ts` | blocked by verified architecture boundary | Confirmed that AoS and SoA snapshots serialize components and RNG metadata but omit `World.resources`. Both restore paths therefore leave `GameplayFreeze` and VFX policy state outside rollback. `RollbackSimulation.processRollback()` also executes the corrected-input step before setting `world.isReSimulating` for later replay. Decision: do not bridge hit-stop yet; first define a minimal snapshot-safe deterministic policy representation and test AoS/SoA restore, corrected-frame replay, expiry and presentation deduplication. No runtime code changed in this documentation slice. |

| 2026-11-05 | Fase 1 / Snapshot-safe World resources | `packages/core/src/ecs/World.ts` (`registerSnapshotResource`), `SnapshotResourceState.ts`, `SnapshotSerializer*`, `SnapshotRestore*`, `SnapshotHash.ts` | implemented on branch | Added explicit opt-in resource capture shared by AoS and SoA snapshots, exact registration/value restoration (including removing resources absent at the snapshot), deep-clone isolation, deterministic hashing and full registered-resource payloads in delta snapshots. Rejects functions, symbols, cycles, weak collections, promises and class instances; unregistered service/presentation resources remain untouched. Regression tests authored for AoS/SoA restore, absence, exclusions, validation, hashes and deltas; not executed in this environment. At this foundation commit, `GameplayFreeze` had not yet been registered or bridged; the later canonical hit-stop row supersedes this status. |

| 2026-11-05 | Fase 1 / Snapshot-safe World resources | `packages/core/src/ecs/World.ts` (`registerSnapshotResource`), `SnapshotResourceState.ts`, `SnapshotSerializer*`, `SnapshotRestore*`, `SnapshotHash.ts`, `NetworkManager.ts` (`NetworkReplicationUtils.applyDelta`) | implemented on branch | Added explicit opt-in resource capture shared by AoS and SoA snapshots, exact registration/value restoration (including removing resources absent at the snapshot), deep-clone isolation, deterministic hashing, full registered-resource payloads in delta snapshots, and network delta application. Rejects functions, symbols, cycles, weak collections, promises and class instances; unregistered service/presentation resources remain untouched. Regression tests authored for AoS/SoA restore, binary roundtrip, absence, exclusions, validation, hashes and delta application; not executed in this environment. At this foundation commit, `GameplayFreeze` had not yet been registered or bridged; superseded by the canonical hit-stop implementation row below. |

| 2026-11-05 | Fase 1 / Canonical rollback-safe hit-stop | `packages/core/src/ecs/World.ts` (`GameplayFreeze` registration), `src/games/shared/rendering/HitStopSystem.ts`, `JuiceOrchestrator.ts`, `SharedVFXInternal.ts` | implemented on branch | Replaced the VFX-owned hit-stop timer with the canonical scheduler `GameplayFreeze` countdown. Snapshot-registered `JuiceHitStopPolicy` owns only priority, active ownership and 50 ms cooldown. `HitStopSystem` runs while frozen; external/indefinite freezes cannot be overridden. `RollbackSimulation.processRollback()` now marks the corrected frame as resimulation, `resimulateFromTick()` marks subsequent frames, and `JuiceOrchestrator.spawn()` replays authoritative hit-stop requests before suppressing orchestrator-managed presentation output. Duration is no longer scaled by local accessibility settings. Removed hit-stop fields from `VFXWorldState`; adjusted Arkanoid and Space Invaders catalog producers so hit-stop events are replayed. Tests authored for priority, cooldown, owner protection, expiry tick, replay hash and corrected-frame presentation suppression; not executed yet. |

| 2026-11-05 | Fase 2 / Pong canonical hit-stop migration | `src/games/pong/PongGame.ts`, `PongCollisionSystem.ts`, `JuiceOrchestrator.ts` (`pong.paddle:hit`) | implemented on branch | Removed the direct `GameplayFreeze` mutation from paddle collisions. The catalog event now owns a 60 ms LOW-priority Juice freeze, and Pong registers `HitStopSystem` in Simulation. The event is replayed on corrected/resimulated frames; inline shake, squash/recoil, particle burst and SFX are suppressed during replay but preserved during normal play. Added a catalog replay regression test; not executed in this environment. |
| 2026-11-06 | Fase 1 / Cierre y verificación canónica | `packages/core/src/ecs/Schedule.ts`, `src/games/shared/rendering/HitStopSystem.ts`, `packages/core/tests/GameplayFreeze.test.ts` | completada | Corregido decremento de cooldown en `HitStopSystem.ts` con tolerancia epsilon (reseteo exacto a 0 de cooldown y prioridad). En `Schedule.ts`, la pausa explícita (`IsPaused === true`) suspende el reloj de `GameplayFreeze` en lugar de consumirlo. Añadida cobertura completa en `GameplayFreeze.test.ts` para suspensión en pausa, `TimeScale=0` independiente, freeze indefinido y freeze externo finito. Verificados tests `GameplayFreeze.test.ts` (9/9), `JuiceOrchestrator.test.ts` (22/22) y `SnapshotResources.test.ts` (18/18). |
| 2026-11-08 | Fase 2 / Consolidación de Shake y Unidades | `packages/core/src/utils/Juice.ts`, `packages/core/tests/JuiceShake.test.ts`, `HitRunFeedbackSystem.ts`, `HitRunWeaponSystem.ts`, `registerHitRunFeedback.ts` | completada | Normalizada la frontera de unidades de `Juice.shake` (entrada pública en ms convertida inequívocamente a segundos para almacenamiento ECS en `ScreenShakeComponent`, resource `ScreenShake` y `GameState.screenShake`), eliminando la heurística condicional `> 10`. Actualizadas llamadas directas en `GeometryWarsGameStateSystem` y `KineticAccumulatorSystem` para pasar ms. Retirado el canal duplicado y huérfano `HitRunScreenShake` en Hit & Run, consolidando el screen-shake exclusivamente en el componente core `ScreenShake` de la cámara principal. Tests verificados: `JuiceShake.test.ts` (8/8) y `HitRunFeedbackSystem.test.ts` (11/11). |
| 2026-11-09 | Fase 3 / Contrato tipado de catálogo y diagnósticos | `src/games/shared/rendering/JuiceOrchestrator.ts`, `src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts` | completada | `JUICE_CATALOG` definido con `as const satisfies Record<SupportedGameId, Record<string, JuiceProfile>>`, preservando claves literales exactas. `GameJuiceEventMap` derivado canónicamente de `keyof (typeof JUICE_CATALOG)[G]`. `triggerEvent` diagnostica perfiles no mapeados o catálogo faltante con `console.warn` en entorno no-producción (`process.env.NODE_ENV !== "production"`). Añadidos tests unitarios y de tipos negativos (`@ts-expect-error` para eventos cruzados o inexistentes) en `JuiceOrchestrator.test.ts` (24/24 pasan). |
| 2026-11-10 | Fase 4 / Arkanoid piloto vertical y rollback guards | `src/games/arkanoid/systems/ArkanoidCollisionSystem.ts`, `src/games/arkanoid/__tests__/ArkanoidGameplay.test.ts`, `src/games/arkanoid/__tests__/arkanoid.test.ts` | completada | Distingue `brick:hit` (hit-stop 30ms LOW) de `brick:shatter` (hit-stop 30ms NORMAL) a través de `JuiceOrchestrator.triggerEvent`. Añadidas guardas `!world.isReSimulating` en `onCombatHit` y `onCombatDeath` para suprimir mutaciones visuales (`hitFlashFrames`, `Juice.squash`, `createEmitter`, `spawnScorePopup`) durante replay sin suprimir la emisión del hit-stop autoritativo. `ArkanoidGame` registra `HitStopSystem` en `Simulation`. Actualizado `ArkanoidGameplay.test.ts` para verificar la expiración completa del freeze autoritativo y la reanudación de `GameRules`. Test de rollback añadido en `arkanoid.test.ts`. Todos los tests de Arkanoid (6/6 suites, 32/32 tests) pasan. |

## Estado real por fase (auditoría exhaustiva 2026-11-10)

| Fase | Estado | Evidencia en código real y tests | Observaciones |
|---|---|---|---|
| **F0** (Auditoría e inventario) | **PARCIAL** | Matrices en `docs/audit/2026-10-27-game-feel-audit-inventory.md` y `docs/audit/2026-11-05-juice-game-feel-phase-0-audit.md`. Decisiones en ADR 001. | Primera pasada amplia completada, pero no inventario transversal exhaustivo: audio conserva consumidores directos, rutas fuera de `PlaySFX`, aliases/inyección y guardas de resimulación por revalidar. |
| **F1** (Hit-stop canónico en Scheduler) | **HECHA** | `HitStopSystem.ts:92` actualiza `GameplayFreeze`; `hitStopTimer` retirado; `Schedule.ts:173` latched freeze; epsilon en `HitStopSystem.ts:139`; pausa suspende freeze en `Schedule.ts:182`. Tests: `GameplayFreeze.test.ts` (9/9), `JuiceOrchestrator.test.ts` (24/24), `SnapshotResources.test.ts` (18/18). | Una sola autoridad de freeze (`GameplayFreeze`); prioridad y cooldown 50ms en `JuiceHitStopPolicy`; freeze indefinido, externo, `IsPaused` y `TimeScale=0` verificados. |
| **F2** (Auditoría de shake y frontera de unidades) | **HECHA** | `Juice.ts:60` convierte `durationMs / 1000`; heurística `> 10` eliminada; llamadas de Geometry Wars normalizadas a ms; `HitRunScreenShake` eliminado en `HitRunFeedbackSystem.ts` y `HitRunWeaponSystem.ts`. Tests: `JuiceShake.test.ts` (8/8) y `HitRunFeedbackSystem.test.ts` (11/11). | Unidades coherentes en la frontera: ms público, segundos en ECS. Un único canal efectivo en cámara principal. |
| **F3** (Contrato tipado de catálogo) | **HECHA** | `JuiceOrchestrator.ts:119-173` deriva `GameJuiceEventMap` de `JUICE_CATALOG`; diagnósticos en L309, 319. Tests: `JuiceOrchestrator.test.ts:226-258` (24/24 pasan). | Tipado estricto contra catálogo; rechazo en tiempo de compilación (@ts-expect-error); diagnóstico de advertencia en desarrollo ante eventos dinámicos desconocidos. |
| **F4** (Piloto vertical Arkanoid) | **HECHA** | `ArkanoidCollisionSystem.ts:71, 83, 149, 160` con guardas `!world.isReSimulating` y separación semántica `brick:hit` / `brick:shatter`; `HitStopSystem` en `ArkanoidGame.ts:287`. Tests: `ArkanoidGameplay.test.ts` y `arkanoid.test.ts:131`. | Un solo hit-stop y una sola ruta de shake por evento; score y combo preservados; rollback seguro probado. |
| **F5** (Migración Pong y Space Invaders) | **PARCIAL** | Pong migrado (`pong.paddle:hit`). Space Invaders escribe directamente `GameplayFreeze` y usa `ufo:destroyed` en boss hit. | Space Invaders pendiente de normalizar a eventos canónicos (`boss:hit`) y retirar escrituras directas. |
| **F6** (Corrección Hit & Run) | **IMPLEMENTADA; integración Scheduler no demostrada por el test citado** | `HitRunFeedbackSystem.ts` y `HitRunWeaponSystem.ts` escriben al componente core `ScreenShake` de la cámara; `HitRunScreenShake` no tiene escritores en esos caminos. `HitRunFeedbackSystem.test.ts` cubre feedback/resimulación, pero no registra `Schedule` ni prueba su integración real. | No mantener la afirmación de doble canal como deuda vigente. Verificar por separado el freeze con Scheduler; no presentar el test unitario actual como prueba de integración. |
| **F7** (Juegos adicionales con beneficio) | **PENDIENTE** | Ningún juego adicional migrado. | Solo migrar bajo beneficio comprobado. |
| **F8** (Reevaluación de pipeline de combate) | **APLAZADA** | Aplazada formalmente hasta concluir F0-F7. | Condición de parada respetada. |


## Revalidación de afirmaciones históricas (2026-11-27)
Esta sección prevalece sobre los resúmenes de fase y las filas históricas anteriores cuando describen el estado actual. Las filas fechadas se conservan como registro de lo observado entonces.

### F0 — inventario

**Estado corregido: parcial; no declarar inventario exhaustivo.** Las auditorías de Juice identifican rutas principales y varios consumidores, pero el inventario transversal de Game Feel sigue incompleto. En particular, el ledger de Game Feel mantiene el audio como `partial`: existen consumidores directos, rutas que no pasan por `PlaySFX`, aliases/interfaces inyectadas y guardas de resimulación no uniformes. La auditoría de audio del 8 de noviembre se describe expresamente como inventario dirigido de alta cobertura, no como prueba exhaustiva. La etiqueta anterior `HECHA` para F0 solo puede entenderse como cierre de una primera pasada, no como cierre del inventario completo.

### Hit & Run — shake

**Estado corregido: canal duplicado retirado del runtime observado.** Las filas del 31 de octubre y 1 de noviembre describen correctamente el hallazgo histórico, pero ya no describen el código actual. La migración del 8 de noviembre indica que `HitRunFeedbackSystem` y `HitRunWeaponSystem` escriben al componente core `ScreenShake` de la cámara principal y que `HitRunScreenShake` fue retirado de esos caminos. El tipo/compatibilidad deprecated puede seguir existiendo; su mera definición no demuestra un escritor ni un consumidor activo.

**Límite de verificación:** `src/games/hitandrun/systems/__tests__/HitRunFeedbackSystem.test.ts` prueba el feedback y la supresión durante resimulación, pero el test inspeccionado no registra `Schedule` ni demuestra la integración del freeze con el scheduler real; decrementa `GameplayFreeze` manualmente. No presentar esa suite como prueba E2E del scheduler.

### Asteroids — doble explosión y shake

**Estado corregido: hallazgo histórico consolidado.** La fila de VFX del 9 de noviembre y la prueba `src/games/asteroids/systems/__tests__/AsteroidCollisionSystem.test.ts` respaldan que la ruta de muerte ya no solicita dos veces `pixelfx_explosion` y que se retiró el shake directo redundante. Las filas del 7 y 8 de noviembre en este ledger son hallazgos previos a esa consolidación; deben leerse como histórico, no como deuda vigente. No volver a etiquetar el piloto como duplicado sin una nueva reproducción en el código actual.

### Space Invaders y límites de la consolidación

Las escrituras directas a `GameplayFreeze`, el shake/squash directo y la creación transitoria de `JuiceOrchestrator` descritos en la auditoría del 4 de noviembre siguen siendo deuda parcial hasta que una revalidación de los call sites demuestre lo contrario. No inferir que la migración de Pong o Arkanoid se extiende a Space Invaders.

### Estados de fase corregidos

| Fase | Estado de evidencia actual | Interpretación |
|---|---|---|
| F0 | `partial` | Primera pasada amplia completada; inventario transversal no exhaustivo, especialmente audio y rutas inyectadas |
| F1 | `implemented / verified historically` | Hit-stop canónico basado en `GameplayFreeze` y scheduler respaldado por tests registrados; esta actualización no vuelve a ejecutar las suites |
| F2 | `implemented / verified historically` | Unidades de shake normalizadas y canal Hit & Run consolidado; la prueba citada no sustituye validación de scheduler |
| F3 | `implemented / verified historically` | Catálogo tipado y diagnósticos respaldados por la fila del 9 de noviembre |
| F4 | `implemented / verified historically` | Piloto Arkanoid respaldado por la fila del 10 de noviembre |
| F5 | `partial` | Space Invaders conserva los bypasses descritos en la auditoría hasta nueva evidencia |
| F6 | `implemented; scheduler integration not proven by cited test` | No mantener la afirmación de doble canal Hit & Run |
| F7 | `pending / unverified` | No generalizar la consolidación a otros juegos |
| F8 | `deferred` | Pipeline de combate aplazado; no presentar como implementado |

**Ejecución de esta revalidación:** inspección documental y de código referenciada; no se ejecutaron Jest, typecheck ni CI en esta actualización.


---

## Anexo — Reconciliación de autoridad temporal (Unidad 1, 2026-11-27)

### Alcance y método

- **Repositorio:** `xavirodriguez/ArcadeGames`
- **Ref inspeccionada:** `master`
- **Commit exacto:** `3c0cb4e8ef4f74e8e1585063a35e687d02b26b1e`
- **Método:** lectura de archivos en ese SHA y búsquedas de call sites. Las rutas y líneas de este anexo corresponden a ese commit.
- **Ejecución:** no se ejecutaron Jest, typecheck, builds ni CI en esta unidad. Los resultados históricos anotados en el ledger se conservan como antecedentes, no como ejecuciones repetidas ahora.
- **Limitación documental:** no se encontró `docs/audits/cross-system-consolidation-audit.md` ni un documento con ese nombre en el árbol inspeccionado. Existe `docs/audit/2026-11-05-juice-game-feel-phase-0-audit.md` (singular `audit`), además de este ledger y `docs/specs/adr-002-rollback-safe-gameplay-freeze.md`. El documento literal solicitado debe considerarse ausente o renombrado hasta que se localice su historial.
- **ADR:** el documento encontrado es `docs/specs/adr-002-rollback-safe-gameplay-freeze.md`; no se ha modificado.

### 1.1 — Reconstrucción F1–F5

La tabla distingue el estado histórico consignado de la evidencia de código que se volvió a inspeccionar en este commit.

| Fase | Decisión / propósito | Implementación actual observada | Consumidores / juegos | Snapshot | Tests | Estado |
|---|---|---|---|---|---|---|
| F1 — Hit-stop canónico | Sustituir el temporizador VFX por `GameplayFreeze`, mantener arbitraje de Juice y replay autoritativo | `HitStopSystem` delega el tiempo efectivo en `GameplayFreeze`; `requestHitStop` escribe ese recurso y el scheduler lo consume. La política conserva prioridad, propietario/active y cooldown. | Consumido donde los productores llaman `requestHitStop` y el juego registra `HitStopSystem`. Space Invaders registra el sistema, pero sus dos productores principales inspeccionados lo eluden. Hit & Run no lo registra en la composición localizada. | `GameplayFreeze` se registra por defecto en `World`; `JuiceHitStopPolicy` se registra bajo demanda desde `ensureHitStopPolicy`. No se verificó aquí un snapshot round-trip ejecutado. | Ledger histórico cita `GameplayFreeze.test.ts` 9/9, `JuiceOrchestrator.test.ts` 22/24 y `SnapshotResources.test.ts` 18/18 en ejecuciones previas (la propia fila posterior corrige el recuento Juice a 24/24). No ejecutados en esta unidad. | `partial` a escala transversal; mecanismo core integrado, adopción por juego desigual |
| F2 — Shake y unidades | Unificar la entrada pública en ms y almacenamiento ECS en segundos; retirar canal duplicado Hit & Run | Ledger histórico registra conversión en `Juice.shake` y eliminación del canal `HitRunScreenShake`. El código actual de `JuiceOrchestrator` pasa `shakeDurationMs` directamente a `Juice.shake`. | Geometry Wars y Hit & Run son consumidores relevantes. Falta cerrar en esta unidad la cadena completa del valor directo y el perfil en Geometry Wars. | Screen shake es presentación y no debe asumirse snapshot-backed sin revisar sus componentes/consumidores. | Historial cita `JuiceShake.test.ts` 8/8 y `HitRunFeedbackSystem.test.ts` 11/11; no ejecutados ahora. | `partial` para el alcance de esta autoridad temporal; consolidación histórica de unidades anotada |
| F3 — Catálogo tipado | Derivar el mapa de eventos del catálogo y detectar eventos no mapeados | Ledger histórico identifica `JUICE_CATALOG` tipado en `JuiceOrchestrator.ts`; la fuente actual contiene perfiles y los campos `hitStopMs`, `shakeDurationMs`. | Consumidores que instancian/llaman `JuiceOrchestrator`; la presencia de perfiles no demuestra que todos se emitan. | El catálogo es configuración estática, no estado snapshot. | Historial cita 24/24 tests tipados del orquestador; no ejecutados ahora. | `implemented / verified historically`, no re-ejecutado |
| F4 — Arkanoid | Piloto vertical de hit-stop canónico y supresión de presentación en replay | Ledger registra `brick:hit`/`brick:shatter` y registro de `HitStopSystem` en Simulation. | Arkanoid; la evidencia actual recuperada en esta inspección no incluyó una relectura completa de cada call site ni de la composición del juego. | Depende de F1 y recursos registrados. No se repitió round-trip. | Historial cita 6 suites/32 tests pasando; no ejecutados ahora. | `implemented / historical evidence`; revalidación incompleta en esta unidad |
| F5 — Pong / Space Invaders | Migrar Pong y Space Invaders al contrato canónico | Pong: ledger registra migración de 60 ms y registro del sistema. Space Invaders: `SpaceInvadersGameScene.ts:180` registra `HitStopSystem`, pero `SpaceInvadersCollisionSystem.ts:125,151` escribe directamente `GameplayFreeze` con 50/30 ms. | Pong aparentemente migrado; Space Invaders tiene registro sin consumo canónico en esos call sites. | `GameplayFreeze` está registrado por defecto; `JuiceHitStopPolicy` solo se activa si pasa por `requestHitStop`. Las escrituras directas no actualizan necesariamente esa política. | El ledger conserva tests históricos de replay, pero no se ejecutaron ni se inspeccionó una prueba que cubra estos dos escritores directos. | `partial`; Space Invaders no cerrado |

**Conclusión F5:** la fase no está completa. El registro de `HitStopSystem` en `SpaceInvadersGameScene.ts:180` no demuestra que los impactos usen el arbitraje. Los escritores directos observados en `SpaceInvadersCollisionSystem.ts:125,151` bypassan prioridad, propietario y cooldown de `JuiceHitStopPolicy`. Las líneas 97–103, 140–142, 186–188 y 265–267 muestran guards de resimulación para algunos SFX/efectos, pero no corrigen el bypass del freeze.

### Estado específico de Hit & Run

- `registerHitRunFeedback.ts:26-35` registra defensa, feedback y `ScreenShakeSystem`; en ese archivo no aparece registro de `HitStopSystem`.
- `HitRunFeedbackSystem.ts:4-8,20-24,69-90` importa helpers de `GameplayFreeze`, documenta el freeze core y llama `enterGameplayFreeze`. El feedback sí consume la API de freeze, pero no el arbitraje de `requestHitStop`/política compartida de Juice.
- El ledger histórico de F6 indica que `HitRunFeedbackSystem.test.ts` no integra el `Schedule` real y decrementa el freeze manualmente. Esta limitación sigue sin ser refutada por la inspección actual.
- Por tanto, Hit & Run tiene freeze efectivo core, pero no se ha demostrado paridad con el contrato de `HitStopSystem`. D-5 permanece abierta.

### 1.2 — Game loop, acumulador y fixed timestep

Evidencia directa:

- `packages/core/src/loop/GameLoop.ts:98-102`: `accumulator` es privado de `GameLoop`; `step` y `maxDelta` también son propiedades privadas.
- `GameLoop.ts:120-123`: defaults `step = 1/60` y `maxDelta = 0.25) segundos.
- `GameLoop.ts:269-281`: delta de frame clamped a `maxDelta`, añadido sin escala al acumulador; se ejecutan tantos ticks como permita `while (accumulator >= step)`, sin límite adicional visible en ese bucle; cada callback recibe exactamente `step`; se resta `step`.
- `GameLoop.ts:284-286`: alpha de render es el resto dividido por step.
- `packages/core/src/ecs/Schedule.ts:155-168,179-186`: lee `TimeScale`, descuenta `remainingDuration` con delta sin escalar y calcula `scaledDeltaTime = deltaTime * effectiveTimeScale`. La escala se aplica al delta que reciben sistemas, no a la acumulación del `GameLoop`.

Implicaciones observadas:

1. El paso entregado por GameLoop es fijo, pero los sistemas pueden recibir delta escalado y por tanto variable respecto al step nominal.
2. El acumulador no tiene un límite explícito de ticks por frame en el bucle inspeccionado. El clamp limita tiempo de entrada a 250 ms, lo que a 60 Hz permite hasta 15 ticks en ese frame si el acumulador previo es pequeño; no es un cap de ticks.
3. No se encontró una asociación explícita input→tick en `GameLoop` en el recorrido inspeccionado; los inputs dependen de los sistemas/juegos. No afirmar política universal de input para múltiples ticks sin rastrear cada adaptador de entrada.
4. El acumulador no aparece entre los recursos registrados en `World` ni como campo serializado de `SnapshotResourceState`; pertenece a `GameLoop`, fuera del snapshot de World.
5. La pausa/freeze se decide en `Schedule`, después de que GameLoop haya acumulado y llamado el callback. No hay integración visible que detenga la acumulación del GameLoop.
6. `TimeScale=0` hace `isFrozen` en Schedule, pero el GameLoop continúa consumiendo ticks fijos. El scheduler sigue siendo invocado.
7. `GameplayFreeze` suprime fases de gameplay por el latcheo del scheduler, no detiene la acumulación del GameLoop.
8. No se observó un límite explícito de ticks por frame ni un tratamiento de inputs por tick centralizado en GameLoop.

**Estado:** comportamiento actual verificado por inspección estática; no se ejecutó una prueba temporal de frame/tick. La propuesta ADR v2 de escalar acumulación y preservar fixed timestep es un cambio de comportamiento respecto al estado actual, no una descripción de lo ya implementado.

### 1.3 — Snapshot y rollback

| Estado | Registro | Captura/restauración | Observación de rollback | Estado |
|---|---|---|---|---|
| Acumulador GameLoop | No es World resource | No aparece en `SnapshotResourceState`; no se vio serialización del GameLoop | No hay evidencia de restauración del remainder | `verified absent` en el snapshot World inspeccionado |
| `TimeScale` | No se encontró registro por defecto; no se confirmó registro en juegos | No aparece en el listado de recursos temporales registrado en los call sites inspeccionados | Schedule muta su instancia directamente; snapshot no se deduce de su tipo | `partial`: no snapshot probado |
| `GameplayFreeze` | Sí: `World.ts:160-162`; además no puede desregistrarse, `World.ts:833-837` | El contrato de recursos captura claves registradas y clona valores (`SnapshotResourceState.ts:68-78)); restore valida y reconcilia claves (`86-96`). No se ejecutó round-trip ahora | Rollback marca `world.isReSimulating = true` durante las rutas inspeccionadas (`RollbackSimulation.ts:48-55,117-130`) | Registro verificado; captura/restauración por código verificada estáticamente, ejecución no verificada |
| `IsPaused` | No se encontró registro por defecto en `World` | No hay evidencia de snapshot | Scheduler lee el recurso directamente (`Schedule.ts:175,181-183`) | `partial / not demonstrated` |
| `JuiceHitStopPolicy` | Sí, condicionalmente: `HitStopSystem.ts:29-31` registra `JUICE_HIT_STOP_POLICY_RESOURCE` | El tipo de estado contiene números/booleanos y source owner, compatible en principio con recurso plano; no se ejecutó captura/restauración | La política se lee y actualiza durante peticiones y update del sistema | Registro verificado por código; snapshot round-trip no ejecutado |
| Otros temporizadores de HitStopSystem | Cooldown en política; duración efectiva en GameplayFreeze | No se identificó un segundo timer de duración en el sistema inspeccionado | La expiración efectiva queda en Scheduler | Sin evidencia de reloj paralelo en HitStopSystem actual |

El serializador de recursos usa `snapshotResourceKeys` y `snapshotResources`, clona los valores y valida que sean serializables. La existencia de `registerSnapshotResource` no registra automáticamente todos los recursos: en este commit se verifica por defecto `GameplayFreeze`; la política Juice se registra cuando se asegura su uso.

### 1.4 — Productores y consumidores: Hit & Run / Space Invaders

| Juego / call site | Registro | Productor / API | Escritura directa | Prioridad/owner/cooldown | Duración efectiva | Snapshot |
|---|---|---|---|---|---|---|
| Space Invaders | `SpaceInvadersGameScene.ts:180` registra HitStopSystem en Simulation, priority 100 | Los call sites inspeccionados de boss/invader no llaman `requestHitStop` | Sí: `SpaceInvadersCollisionSystem.ts:125` 50 ms; `:151` 30 ms | Se omiten para esas escrituras directas | Scheduler consume `GameplayFreeze`; los valores directos son 0.05/0.03 s | `GameplayFreeze` registrado; la política de Juice no se arbitra para esos eventos |
| Hit & Run | `registerHitRunFeedback.ts:26-35` registra defensa/feedback y ScreenShakeSystem, no HitStopSystem en esa composición | `HitRunFeedbackSystem.ts:83-90` llama `enterGameplayFreeze` | No llama `requestHitStop` en ese camino | No se aplica arbitraje de Juice por prioridad/owner/cooldown | Configura freeze core limitado por `maxHitStopSeconds`; el scheduler lo consume | `GameplayFreeze` registrado; no se demostró snapshot de estado adicional de feedback |

**Conclusión:** no hay paridad demostrada. Space Invaders tiene el sistema registrado pero bypassado por dos productores; Hit & Run tiene productores de freeze core pero sin el sistema compartido en la composición localizada. No se debe afirmar que ambos utilizan la política canónica completa.

### 1.5 — Geometry Wars: discrepancia 7/200 vs 6.0/300

- La fuente actual de `JUICE_CATALOG` inspeccionada en `JuiceOrchestrator.ts:183-186` define para `geometry-wars`:
  - `enemy:destroyed`: hit-stop 50 ms, shake 3.0, duración 80 ms.
  - `bomb:trigger`: hit-stop 200 ms, shake 7.0, duración 200 ms.
  - `player:death`: hit-stop 250 ms, shake 8.0, duración 250 ms.
- La misma fuente pasa `shakeDurationMs` a `Juice.shake` (`JuiceOrchestrator.ts:264-270`).
- El ledger histórico de 8 de noviembre describe `bomb:trigger` como 6.0/300 ms, y una llamada directa `Juice.shake(world, 10, 0.3)`. Esa afirmación no coincide con el catálogo actual leído en este commit.
- La discrepancia 7/200 vs 6.0/300 no se resuelve mezclando el valor de catálogo con la llamada directa. El código actual de catálogo es 7.0/200 ms. La llamada directa histórica debe volver a rastrearse desde el productor y el valor que finalmente llega al consumidor para afirmar si sigue activa o fue eliminada.
- La cifra 7/200 del catálogo no es equivalente a 6.0/300 del ledger; se conservan como evidencia de versiones/estados distintos hasta que el historial por ruta determine el commit exacto de transición.

**Estado:** catálogo actual verificado por lectura; escritor directo y valor efectivo final de Geometry Wars quedan `partial`, no ejecutar ni atribuir valor de runtime sin inspeccionar el productor completo y el sistema consumidor.

### 1.6 — Resimulación y duplicación de efectos

La política canónica implementada en `JuiceOrchestrator.ts:244-253` solicita hit-stop antes de suprimir la presentación genérica durante replay. Esto separa explícitamente el efecto autoritativo (freeze) de la presentación. No todos los productores usan el orquestador.

| Juego / productor | Efecto emitido | Guard en productor | Supresión posterior | Clasificación |
|---|---|---|---|---|
| Asteroids `onCombatDeath` | En historial: `rock:destroyed`, shake directo y partículas | La auditoría histórica de 7-nov dice que faltaba guard. La actualización posterior de 27-nov no se pudo contrastar con una lectura completa de la implementación actual del método | `JuiceOrchestrator.spawn` suprime presentación genérica durante replay; la partícula directa requiere su propio guard o consumidor con deduplicación. No hay evidencia suficiente de gate posterior universal | `partial`; confirmar método y emisión actual antes de llamar bug |
| Asteroids colisión nave-asteroide | Historial: `ship:damage` y `playDeathJuice` | Auditoría histórica dice sin guard en ese camino | El orquestador suprime su presentación interna, pero `playDeathJuice` es ruta separada; no se probó supresión posterior | `partial` |
| Flappy Bird `handleNearMissLogic` | Historial: `Juice.shake(world, 2, 100)` | Ledger dice sin `!world.isReSimulating` | No se identificó gate posterior del shake directo; no se ejecutó replay para demostrar duplicación | `partial`; riesgo de duplicación, no reproducción verificada |
| Flappy Bird `triggerGameOver` | Tweens inline y `hitFlashFrames` | Ledger indica que el método no invoca perfil de catálogo; el análisis completo de guard actual queda pendiente | No se verificó supresión posterior de tween/render | `partial` |
| Flappy Bird `pipe:passed` | EventBus `pipe:passed`, catálogo tiene perfil `floating_text` | El ledger indica que no se llama a JuiceOrchestrator para ese evento | El EventBus por sí mismo no demuestra emisión visual del perfil | `partial`; catálogo no consumido no equivale a efecto duplicado |

No se corrigió ningún productor. No se afirma duplicación reproducida en ejecución: solo rutas con ausencia histórica de guard y falta de evidencia de suppression gate posterior.

### 1.7 — Audio

Evidencia obtenida:

- `IAudioPlayer.ts:47` expone `playSFX`; `:85` expone `pauseBGM`. La interfaz también contiene controles de volumen separados para SFX/BGM.
- La interfaz no define una política temporal global para SFX ya iniciados ni para nuevas reproducciones durante pausa/hit-stop.
- Space Invaders protege varios `emitDeferred("PlaySFX", ...)` con `!world.isReSimulating` (`SpaceInvadersCollisionSystem.ts:97-103,140-142,186-188,265-267,494-501`).
- `JuiceOrchestrator` suprime su propia presentación genérica durante replay, pero eso no demuestra que todos los productores directos de audio estén protegidos.

**No verificado en esta unidad:** comportamiento del backend concreto para BGM ya iniciado durante pausa; SFX ya iniciados; nuevos SFX durante pausa; BGM/SFX durante hit-stop; política de duck/mute/pausa por sonido; comportamiento de sonidos ya iniciados durante rollback. La interfaz por sí sola no responde a estas preguntas. Es necesario seguir el adaptador de audio y los consumidores de `PlaySFX`/BGM en los juegos antes de decidir comportamiento. No se propone un tercer reloj de audio.

### Inventario de escritores y consumidores temporales (alcance inspeccionado)

| Recurso / API | Escritores o propietarios localizados | Consumidores / lectura | Estado |
|---|---|---|---|
| `GameLoop.accumulator` | `GameLoop.tick` | condición de tick fijo y alpha de render | privado; fuera de snapshot World |
| `TimeScale.scale / remainingDuration` | `TimeScale.setScale` y cualquier consumidor que muta el resource | `Schedule.update` | Schedule decrementa duración y escala delta de sistemas |
| `GameplayFreeze` | World/core freeze helpers; `requestHitStop`; legacy direct writes como Space Invaders; Hit & Run usa `enterGameplayFreeze` | `Schedule` y helpers de consulta | recurso snapshot registrado por defecto |
| `JuiceHitStopPolicy` | `ensureHitStopPolicy`, `requestHitStop`, `HitStopSystem.update` | `HitStopSystem` / arbitraje de request | snapshot registrado condicionalmente |
| `IsPaused` | productores de pausa de juego/runtime no inventariados exhaustivamente | `Schedule`, juegos como Space Invaders también consultan directamente | registro/snapshot no demostrado |
| `ScreenShake` / `ScreenShakeComponent` | `Juice.shake`, feedback por juego | `ScreenShakeSystem` y cámara | presentación; snapshot no demostrado |
| Audio | `EventBus PlaySFX`, `IAudioPlayer.playSFX`, BGM APIs | adaptadores de audio y buses | inventario incompleto; requiere seguir backend |

### Preguntas abiertas para ADR v2

1. ¿Dónde se debe ubicar el estado serializable del acumulador sin crear un segundo acumulador ni romper la propiedad actual de GameLoop?
2. ¿Cómo asociar los inputs con cada tick cuando un frame ejecuta cero, uno o varios ticks? No hay política global demostrada.
3. ¿Debe migrarse primero Hit & Run a `requestHitStop`/HitStopSystem o integrar explícitamente la política compartida en su composición? La inspección confirma que la ruta actual no es la misma que Space Invaders.
4. ¿Qué identidad estable de fuente se usará en el arbitraje ampliado sin timestamps ni IDs aleatorios?
5. ¿Cómo tratar snapshots antiguos que no incluyen TimeScale, IsPaused, política de hit-stop o acumulador?
6. ¿Qué adaptador de audio controla BGM y SFX en cada plataforma, y qué política se aplica a sonidos ya iniciados?
7. ¿Qué guardas de Asteroids/Flappy Bird faltan realmente en el código actual y cuáles tienen una supresión posterior? Falta cerrar con lectura completa y test/replay.
8. ¿Qué commit introdujo la diferencia Geometry Wars 6.0/300 → 7.0/200 y qué valor directo queda activo en el consumidor?
9. ¿Cuál es la ruta documental correcta para `cross-system-consolidation-audit.md`, que no aparece en el árbol inspeccionado?
10. ¿Cuáles son los límites de ticks por frame y la política de input de cada integración de GameLoop? El bucle observado no contiene un max-ticks explícito.

### Estado de verificación de esta unidad

- **Verificado por inspección en SHA fijado:** GameLoop accumulator/step/clamp; TimeScale aplicado a delta de Schedule; freeze/pausa/TimeScale=0; registro de GameplayFreeze; registro condicional de JuiceHitStopPolicy; HitStopSystem registrado en Space Invaders; escritores directos Space Invaders; ruta de freeze Hit & Run; catálogo actual de Geometry Wars; guard de replay de JuiceOrchestrator.
- **Parcial:** snapshot round-trip (código estático, sin ejecución); F4/Arkanoid; F5/Pong; productores Asteroids/Flappy Bird actuales; Geometry Wars productor directo y consumidor; inventario global de escritores; audio.
- **Hipótesis / no demostrado:** duplicación real de presentación en replay para las rutas sin guard; comportamiento de audio durante pausa/hit-stop/rollback; paridad temporal Hit & Run / Space Invaders; restauración del acumulador.
- **Tests ejecutados en esta unidad:** ninguno.
- **Cambios de producción/tests:** ninguno.
- **ADR modificado:** no.
- **PR creada:** no.
- **Siguiente paso permitido:** revisión del anexo y autorización explícita antes de Unidad 2. La Unidad 1 no debe declararse exhaustivamente cerrada mientras sigan abiertas las verificaciones parciales enumeradas.
