# Plan de corrección CI (pnpm test:ci)

Fuente: `ci-output.log` (run completo, exit code 1) y `ci-rerun.log` (re-ejecución solo de suites fallidas).

## 0. Resumen de la ejecución

- Comando: `NODE_OPTIONS="--max-old-space-size=4096" pnpm exec jest --runInBand`
- Run completo: se completó con código 1 tras un fallo no capturado en `GeometryWarsMultiplayer.test.ts` (ver sección "Lo que no sabemos").
- Re-ejecución de los 27 suites fallidos: **33 tests fallidos, 159 pasados, 192 total** en 38.48s. Mismo número de fallos → no se observaron flaky en esta muestra.
- Suites que no llegaron a ejecutar: **5** (fallo de compilación TS).
- Suites fallidas totales: **27** (3 `packages/core`, 2 `server`, 22 en `src/games`).

### Inventario por paquete (suites fallidas)

| Paquete/área | Suites fallidas |
|---|---:|
| `packages/core/tests` | 3 |
| `server/src/__tests__` | 2 |
| `src/games/vertical-shmup` | 5 |
| `src/games/outrun` | 3 |
| `src/games/hitandrun` | 3 |
| `src/games/shared` | 3 |
| `src/games/galaxian` | 2 |
| `src/games/space-invaders` | 1 |
| `src/games/centipede` | 1 |
| `src/games/echorunner` | 1 |
| `src/games/platformer` | 1 |
| `src/games/racing` | 1 |
| `src/games/tower-defense` | 1 |

### Inventario por tipo

- Errores de compilación/tipos (TS): **62 ocurrencias** en el rerun (`6 × TS2305`, `56 × TS2339`), concentradas en un único origen (ver grupo 1).
- Tests unitarios/integración fallidos: **33**.
- E2E: no hay suite E2E separada en este run; `CampaignEndToEnd.test.ts` es integración y falla (1 test).
- Lint / warnings que rompen build: no se capturaron en este run (no se ejecutó `check:agent-guardrails` ni lint).

## 1. Grupos por causa raíz

### Grupo A — `SharedVFX.ts` sustituido por stub (`export {}`)

- Causa confirmada: `src/games/shared/rendering/SharedVFX.ts` contiene solo un import y `export {};`. El workflow `.github/workflows/restore-shared-vfx.yml` documenta la restauración desde el commit `31cd1f71c894649743503befbb27aa53314b8600` con un ajuste `gameplayRandom → renderRandom`.
- Evidencia: TS2305 sobre `createSharedParticle`, `EXPLOSION_PROFILES`, `spawnLayeredExplosion` (línea 19 de `SpaceInvadersCollisionSystem.ts`); TS2339 sobre `registerSharedVFX` (línea 610 de `SpaceInvadersGame.ts`); runtime `SharedVFX_1.spawnLayeredExplosion is not a function` y `SharedVFX.registerSharedVFX is not a function`.
- Archivos implicados: `SharedVFX.ts`, consumidores en `space-invaders`, `vertical-shmup`, `echorunner`, `tower-defense`, `platformer`, `hitandrun` (?), y tests.
- Errores que produce: 5 suites que no compilan (34 tests no ejecutados: `CombatRollbackResimulation` 6, `NewGameAdaptersAndEncounters` 6, `SpaceInvadersRoom` 18, `ReplicationSurfaceAudit` 3, `CampaignRenderInit` 1) + al menos 8 tests runtime (EchoRunner ×3, TowerDefense ×1, Platformer ×1, VerticalShmup ×5: simulation contracts, bomb ×2, particle pool, graze).
- Riesgo: restaurar un archivo de ~94KB; validar que el ajuste `renderRandom` no rompa otros consumidores.

### Grupo B — Galaxian: mutación estructural directa durante `World.update`

- Causa confirmada: stack en `galaxian-gameplay-regression.test.ts:457` → `WaveSystem.update` → `spawnEnemyWave` → `EnemyFactory` → `EntityBuilder.create` → `World.createEntity` durante update (prohibido).
- Evidencia: `Direct structural mutation (createEntity) during World update is forbidden. Use world.commands instead.`
- Archivos: `src/games/galaxian/systems/WaveSystem.ts`, `src/games/galaxian/EntityFactory.ts`, `EnemyFactory.ts`.
- Errores: 1 test (`clears a complete wave...`).
- Relacionado: `worldX/worldY` no sincronizados (`worldX` esperado `-9999`? recibido `200`) y `shotsFiredInDive` 0 vs 1. Causa no confirmada (hipótesis: falta asignación en Transform o en factory de balas enemigas).
- Determinismo: `galaxian-determinism-snapshot.test.ts` hash `fb9a5458` vs `9915ba12` — probablemente consecuencia de los anteriores; hipótesis.

### Grupo C — Hit & Run: violación de frontera de módulos + FSM de ataque

- Causa confirmada (frontera): `ai/telegraphedAttackHelpers.ts` importa `JuiceOrchestrator` (rendering) y `colors` (theme). Test `HitRunThemeBoundary` lo detecta.
- Causa no confirmada (FSM): `ChargerEnemyAttack` y `PatrolEnemyAttack` esperan transición a `"Recovery"` tras golpe del jugador, reciben `"Anticipation"`. Hipótesis: el manejador de daño no dispara el evento/interrupt o la FSM no consume el flag.
- Archivos: `src/games/hitandrun/ai/telegraphedAttackHelpers.ts`, AI attack systems/state machines, `HitRunHurtSystem`.
- Errores: 3 tests (boundary + 2 FSM).

### Grupo D — Racing `LapSystem`: `EventBus` indefinido y `RacingState.phase` de solo lectura

- Causa confirmada parcial: `world.getEventBus()` devuelve `undefined` en el test (4 fallos). Hipótesis: el mundo de prueba no registra el `EventRegistry` de racing o el sistema se instancia sin el registry correcto.
- Evidencia: `Cannot read properties of undefined (reading 'emitDeferred')` en `LapSystem.ts:139` y en el test `:118/:152`.
- Segundo error: `Cannot assign to read only property 'phase'` (`:182`) — el componente `RacingState` está sellado/congelado o el setter no existe.
- Archivos: `src/games/racing/systems/LapSystem.ts`, tests, tipos de registry.
- Errores: 4 tests.

### Grupo E — Out Run: canvas mock y umbrales numéricos

- `OutrunGameplay`: `ctx.createLinearGradient is not a function` (línea 628 de `OutrunCanvasVisuals.ts`) → el mock de canvas del test no implementa gradientes. Hipótesis: falta en el mock o el código debería tolerarlo.
- `OutrunGameplay`: `skiaTraffic.drawRRect` no llamado (línea 475) — hipótesis: rama de código no alcanzada o nombre de método distinto.
- `OutrunScenery`: `midPeak` 79.669 no > 80 (línea 101) — hipótesis: precisión/umbral demasiado estricto o fórmula de blend.
- `OutrunVehicleArtwork`: shape `"coupe"` vs `"truck"` (línea 37) y `lightBarWidth` 57.672 vs 53.4 (línea 61) — hipótesis: asignación de silueta o fórmula de ancho.
- Archivos: `src/games/outrun/rendering/OutrunCanvasVisuals.ts`, tests de scenery/vehicle artwork.
- Errores: 5 tests.

### Grupo F — SharedVFX derivados (numéricos / modelo de lab)

- `VFXVisualLabModel`: array de samples tiene un elemento extra `0.28` (línea 131).
- `vfx-procedural-core`: `0.33333333333333337` vs `1/3` (línea 90) — error de punto flotante; test usa `toEqual`.
- Errores: 2 tests.

### Grupo G — Vertical Shmup restante (tras Grupo A)

- `VerticalShmupGameplay`: `invulnerableRemaining` 1.5 vs 1.0 (línea 80) — hipótesis: doble aplicación de invulnerabilidad o duración base distinta.
- Errores: 1 test.

### Grupo H — Space Invaders combate

- `SpaceInvadersCombat`: score 0 vs 100 (línea 181); escudo supercarga no consume/destruye como se espera (línea 285).
- Hipótesis: `SpaceInvadersCollisionSystem` no otorga score o el sistema de combate no emite el evento; dependiente del Grupo A para partículas pero no necesariamente para score.
- Errores: 2 tests.

### Grupo I — Centipede respawn de setas

- `CentipedeGameplay`: `partialMushroomEntity`/`poisonedMushroomEntity`/`untouchedMushroomEntity` undefined tras respawn (línea 245).
- Hipótesis: la lógica de restauración de setas no recrea/encuentra las entidades o el filtro por componente falla.
- Errores: 1 test.

### Grupo J — Campaign End-to-End (story graph)

- `CampaignEndToEnd`: esperaba `act2_spaceinvaders_gameplay`, recibió `ending_pyrrhic` (línea 77).
- Hipótesis: condición de transición/elección en el grafo de campaña o resultado de gameplay simulado.
- Errores: 1 test.

### Grupo K — Hit & Run AI ya incluido en C

### Grupo L — Otros no explicados

- `ChargerEnemyAttack` / `PatrolEnemyAttack` incluidos en C.

## 2. Priorización (errores resueltos por esfuerzo)

1. **Grupo A (SharedVFX)** — mayor impacto (~42 tests potenciales) / esfuerzo medio. Desbloquea 5 suites que hoy no compilan y ~8 tests runtime. Debe ir primero: otros grupos dependen de que el código compile.
2. **Grupo B (Galaxian)** — 4 tests + hash de determinismo / esfuerzo alto (cambio de mutación estructural + sync de coordenadas).
3. **Grupo C (Hit & Run)** — 3 tests + frontera arquitectónica / esfuerzo medio-alto (decisión de diseño: cómo inyectar juice/colores en simulación).
4. **Grupo D (LapSystem)** — 4 tests / esfuerzo medio.
5. **Grupo E (Out Run)** — 5 tests / esfuerzo medio (mezcla de mock y lógica).
6. **Grupo H (Space Invaders)** — 2 tests / esfuerzo medio.
7. **Grupo I (Centipede)** — 1 test / esfuerzo bajo-medio.
8. **Grupo J (Campaign)** — 1 test / esfuerzo medio (requiere entender story graph).
9. **Grupo F (VFX numérico)** — 2 tests / esfuerzo bajo.
10. **Grupo G (VerticalShmup invulnerabilidad)** — 1 test / esfuerzo bajo.

## 3. Plan paso a paso

### Paso 1 — Restaurar `SharedVFX.ts`
- Cambiar: `src/games/shared/rendering/SharedVFX.ts` (restaurar desde `31cd1f71...` y aplicar `gameplayRandom → renderRandom` según workflow).
- Errores esperados resueltos: 5 suites que no compilan + ≥8 tests runtime (~42 tests potenciales).
- Verificación: `pnpm exec jest --runInBand src/games/vertical-shmup src/games/echorunner src/games/tower-defense src/games/platformer packages/core/tests/CombatRollbackResimulation.test.ts packages/core/tests/NewGameAdaptersAndEncounters.test.ts packages/core/tests/CampaignRenderInit.test.ts server/src/__tests__/SpaceInvadersRoom.test.ts server/src/__tests__/ReplicationSurfaceAudit.test.ts`
- Riesgo: cambios masivos; puede exponer nuevos fallos en consumidores (space-invaders, hitandrun).

### Paso 2 — Galaxian: mutación estructural y sync de coordenadas
- Cambiar: `src/games/galaxian/systems/WaveSystem.ts`, `EntityFactory.ts`, `EnemyFactory.ts`; y el código que asigna `worldX/worldY` en Transform (hipótesis: buscar `worldX` en galaxian).
- Errores esperados: 1 (wave spawn) + 2 (worldX/shotsFired) + posiblemente determinismo.
- Verificación: `pnpm exec jest --runInBand src/games/galaxian`
- Riesgo: rollback netcode / determinismo; requiere revisar `hash()`.

### Paso 3 — Hit & Run: frontera + FSM
- Cambiar: `src/games/hitandrun/ai/telegraphedAttackHelpers.ts` (eliminar imports de rendering/theme; inyectar o mover); sistemas de ataque para consumir interrupt.
- Decisión de diseño requerida: cómo pasar juice/colores a simulación sin violar frontera.
- Verificación: `pnpm exec jest --runInBand src/games/hitandrun`
- Riesgo: romper renderizado de telegraphs.

### Paso 4 — Racing LapSystem
- Cambiar: `src/games/racing/systems/LapSystem.ts` y setup de tests/registry.
- Verificación: `pnpm exec jest --runInBand src/games/racing`
- Riesgo: eventos de carrera no emitidos en multiplayer.

### Paso 5 — Out Run
- Cambiar: mocks de canvas en tests o guardas en `OutrunCanvasVisuals.ts`; lógica de scenery/vehicle artwork.
- Verificación: `pnpm exec jest --runInBand src/games/outrun`
- Riesgo: cambios visuales/regresión de rendering.

### Paso 6 — Resto de fallos pequeños
- Centipede, Campaign, Space Invaders combat, VerticalShmup invulnerabilidad, VFX numéricos.
- Verificación por paquete.

## 4. Tabla de progreso esperada

| Paso | Errores resueltos (est.) | Errores restantes (est.) | Esfuerzo |
|---|---:|---:|---|
| 0 (baseline) | 0 | 33 tests + 5 suites | — |
| 1 SharedVFX | ~42 potenciales | ~? | medio |
| 2 Galaxian | ~4 | ~? | alto |
| 3 Hit & Run | ~3 | ~? | medio-alto |
| 4 Racing | ~4 | ~? | medio |
| 5 Out Run | ~5 | ~? | medio |
| 6 Resto | ~7 | 0 | bajo-medio |

(Los "restantes" son estimaciones; los números exactos requieren re-ejecutar tras cada paso.)

## 5. Lo que no sabemos

- El run completo se abortó con un error no capturado en `GeometryWarsMultiplayer.test.ts` (`SceneManager... transitionTo... GeometryWarsGame.onRegisterSystems`). No sabemos si hay más suites no ejecutadas después de ese punto ni si es determinista. Falta: re-ejecutar solo `server/src/__tests__/GeometryWarsMultiplayer.test.ts` y revisar logs de memoria (posible OOM con 4GB).
- No sabemos si `pnpm run check:agent-guardrails` pasa; no se ejecutó. Falta ejecutarlo.
- No se verificó el estado de `SharedVFX.ts` contra el commit restaurado más allá del workflow; la restauración real no se aplicó (no se modificó código). Falta confirmar que el commit `31cd...` compila limpio.
- Causas no confirmadas (hipótesis) para: `worldX/worldY` en Galaxian, `shotsFiredInDive`, `invulnerableRemaining` 1.5, mocks de canvas en Out Run, `EventBus` undefined en LapSystem, FSM de hitandrun, respawn de setas en Centipede, transición de campaña. Requieren abrir el código correspondiente.
- No hay cifra exacta de tests dentro de las 5 suites que no compilan que pasarían tras restaurar SharedVFX; se listaron conteos de `it/test` pero no garantizan que todos pasen.

## 6. Orden de ataque de los tres primeros pasos

1. **Paso 1 (SharedVFX)**: mayor número de errores resueltos por esfuerzo y desbloquea compilación del resto.
2. **Paso 2 (Galaxian)**: incluye un error de arquitectura (mutación directa) que afecta determinismo y rollback; debe resolverse antes de tocar netcode.
3. **Paso 3 (Hit & Run)**: combina una violación de frontera detectada por test automatizado con lógica de FSM; requiere decisión de diseño, por eso va después de los mecánicos.

## Segunda ronda (descubierta en ci-final.log)

- Run completo tras los pasos: `Test Suites: 19 failed, 459 passed, 478 total`; `Tests: 7 failed, 2499 passed, 2506 total`. Jest no terminó (open handles) pero el resumen se emitió.
- Suites que no llegaron a ejecutar (13): hitandrun rendering (skia native module parse) + useStoryRuntime ("must contain at least one test").
- Fallos de tests (7): CombatRollbackResimulation (hash), galaxian-determinism-snapshot (SoA), OutrunScenery, OutrunVehicleArtwork (×2), ProofOfConceptStoryGraph (×2). (SpaceInvadersCombat y VerticalShmup resueltos.)

Estos fallos no se arreglaron en esta ronda; requieren decisión de diseño / investigación adicional (ver CI_FIX_LOG.md).
