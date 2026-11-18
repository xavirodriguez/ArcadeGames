# CI Fix Log

Rama: `fix/ci-plan`. Baseline: `ci-output.log` / `ci-rerun.log`.

## Paso 0 — Baseline

- Fallos antes: 33 tests + 5 suites que no compilan.
- Notas: ejecución completa abortada en `GeometryWarsMultiplayer.test.ts` (error no capturado).

## Paso 1 — SharedVFX (Grupo A)

- Causa real: confirmada. `SharedVFX.ts` era stub; restaurado desde commit 31cd1f71... y aplicado `gameplayRandom → renderRandom` (patrón encontrado una vez).
- Archivos tocados: `src/games/shared/rendering/SharedVFX.ts`.
- Verificación targeted: `pnpm exec jest --runInBand src/games/vertical-shmup src/games/echorunner src/games/tower-defense src/games/platformer packages/core/tests/CombatRollbackResimulation.test.ts packages/core/tests/NewGameAdaptersAndEncounters.test.ts packages/core/tests/CampaignRenderInit.test.ts server/src/__tests__/SpaceInvadersRoom.test.ts server/src/__tests__/ReplicationSurfaceAudit.test.ts` → 4 failed, 232 passed, 236 total; 4 suites fallidas (antes 5 que no compilaban + más).
- Fallos restantes en el conjunto targeted:
  - `Combat Death Rollback Determinism...` hash mismatch (776167a8 vs 7c763ffa).
  - Vertical Shmup bomb contract: enemy bullet no se limpia (1 vs 0).
  - Vertical Shmup simulation contracts: velocidad no se anula tras Game Over.
  - VerticalShmup Gameplay: invulnerableRemaining 1.5 vs 1.0.
- Typecheck: `pnpm run typecheck:app` OK.
- Queda sin resolver: los 4 anteriores (se abordan en pasos posteriores / Grupo G y CombatRollback).

## Paso 2 — Galaxian (Grupo B)

- Causa real worldX/shotsFired: worldX stale por liberación de bala tras colisión (release no sincronizaba worldX/worldY); test mantenía referencia stale al componente GalaxianEnemy tras clone-on-write del motor.
- Cambios: EnemyFactory.createEnemy ahora reserva ID y usa world.commands durante update; EntityPool.release sincroniza worldX/worldY y marca dirty=false; test re-consulta componente tras update.
- Verificación: `pnpm exec jest --runInBand src/games/galaxian` → 1 failed, 7 passed, 8 total; 39 passed tests. Fallo restante: `galaxian-determinism-snapshot` (SoA snapshots=true) hash 9915ba12 vs 9915ba12? esperado fb9a5458.
- Estado: parcial/bloqueado. Causa del hash SoA no resuelta; requiere investigar snapshot SoA en core. No se tocó el hash esperado.

## Paso 3 — Hit & Run (Grupo C)

- Causa real frontera: confirmada (imports prohibidos en ai/). Solución: eliminados imports de JuiceOrchestrator y colors; el cue VFX ahora se crea directamente con componentes core (Transform/Render/TTL), preservando la aserción del test.
- Causa real FSM: la transición no ocurría porque HitReaction se agrega de forma diferida durante el update y la IA ya había corrido en la misma fase; además los clones del motor impedían ver el flag. Solución: el hurt system transiciona la FSM a "Recovery" directamente al aplicar el golpe (solo si estaba en "Anticipation"), invocando onEnter de Recovery.
- Verificación: `pnpm exec jest --runInBand src/games/hitandrun/ai src/games/hitandrun/rendering/__tests__/HitRunThemeBoundary.test.ts` → 4 passed, 4 total; 12 tests passed.
- Typecheck OK.

## Paso 4 — Racing LapSystem (Grupo D)

- Causa real EventBus undefined: el test creaba el World sin registrar el recurso "EventBus" (en producción lo crea BaseGame). Corrección en setup del test: `world.setResource("EventBus", new EventBus<RacingEventRegistry>())`.
- Causa real phase readonly: el test mutaba un componente obtenido con getSingleton (congelado en dev). Corrección: usar getMutableComponent.
- Causa test "advances two cars independently": setup inconsistente (carB en cp1 pero lastCheckpoint -1). Corregido a lastCheckpoint 0.
- Verificación: `pnpm exec jest --runInBand src/games/racing` → 17 passed, 17 total; 67 tests.
- Typecheck OK.

## Paso 5 — Out Run (Grupo E)

- OutrunGameplay: mock de Skia incompleto (faltaban Shader.MakeLinearGradient, Point, TileMode, setShader en mockPaint). Corregido el mock; aserción de tráfico Skia cambiada de drawRRect a drawRect (el drawer usa drawRect).
- Verificación: `pnpm exec jest --runInBand src/games/outrun/__tests__/OutrunGameplay.test.ts` → 1 passed, 1 total; 22 tests.
- Bloqueados: OutrunScenery (midPeak 77.33 vs min 80 por grit desert en endpoints) y OutrunVehicleArtwork (indices 0/1/2 no corresponden a coupe/van/truck y bodyColor/paletteIndex inconsistentes). Requieren decisión de diseño; no se tocaron.

## Resumen final

| Paso | Fallos antes | Fallos después | Estado |
|---|---:|---:|---|
| 0 Baseline | 33 tests + 5 suites | — | — |
| 1 SharedVFX | 33 tests + 5 suites | 4 tests (targeted) | parcial |
| 2 Galaxian | 3 tests | 1 test (SoA snapshot) | parcial/bloqueado |
| 3 Hit & Run | 3 tests | 0 (targeted) | resuelto (frontera + FSM) |
| 4 Racing | 4 tests | 0 | resuelto |
| 5 Out Run | 5 tests | 3 tests (scenery + vehicle artwork ×2) | parcial |
| 6 Resto | — | SpaceInvaders 1, VerticalShmup 3 sin resolver; Centipede/Campaign/VFX resueltos | parcial |
| Segunda ronda (ci-final) | — | 11 tests + 13 suites | bloqueado (entorno/diseño) |

### Bloqueados / información faltante

- Galaxian SoA snapshot hash: falta investigar snapshot SoA en core.
- Space Invaders shield supercharge: falta investigar por qué el invader no se destruye (CombatSystem no emite combat:death o suscripción falla).
- Vertical Shmup invulnerabilidad: clone-on-write hace que el tick lea 0; falta causa raíz.
- Vertical Shmup bomb: bala enemiga no se limpia.
- Vertical Shmup simulation contracts: velocidad no se anula tras Game Over.
- Out Run scenery: grit desert en endpoints hace el blend no monótono.
- Out Run vehicle artwork: indices y bodyColor inconsistentes con la distribución ponderada.
- Hit & Run rendering suites: fallo de parse de @shopify/react-native-skia (entorno).
- useStoryRuntime: suite sin tests (config/ts-node).
- ProofOfConceptStoryGraph: expectativa de act3 gameplay tras completeObjective; auto-avance de nodos.
- CombatRollbackResimulation: hash mismatch (posible efecto de SharedVFX renderRandom).
