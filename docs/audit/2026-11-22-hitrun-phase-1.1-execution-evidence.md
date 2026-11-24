# Hit & Run — Fase 1.1: evidencia de ejecución

Fecha real de ejecución: **2026-11-22** (`date +%F`).
Base auditada: `0e336039bf16d5a7f68b2826acc98826bb95e28a` (merge PR #1215, HEAD de `master`).
Rama de trabajo: `chore/hitrun-1-1-validation` (creada desde `master` en `0e336039b`).
Los registros del 2026-11-06 que este documento sustituía se retiraron; ver `docs/HISTORICAL_RECORD.md` §5.

Este documento sustituye a los documentos del 6 de noviembre en cuanto a **evidencia de
ejecución**: allí se razonaba sobre el código; aquí se registra lo que se ejecutó, con el
comando, el SHA y las últimas líneas de la salida.

---

## 0. Entorno

| Dato | Comando | Resultado |
| --- | --- | --- |
| SHA base | `git rev-parse HEAD` | `0e336039bf16d5a7f68b2826acc98826bb95e28a` |
| Rama inicial | `git branch --show-current` | `game/hitandrun00` (se crea `chore/hitrun-1-1-validation` desde `master`) |
| Node | `node -v` | `v24.21.0` |
| pnpm | `pnpm -v` | `10.30.3` |
| Dependencias | `pnpm install --frozen-lockfile` | `Done in 10.5s using pnpm v10.30.3` |
| Memoria del host | `sysctl -n hw.memsize` | `8 GB` (relevante para la tarea 3) |
| `gh` | `gh auth status` | `Logged in to github.com account xavirodriguez` (`repo`, `workflow`) |

---

## 1. Criterio 1 — CI remoto (`gh` disponible y autenticado)

Comando: `gh run list --branch master -L 10`

```
completed	failure	Merge pull request #1215 ...	.github/workflows/restore-space-invaders.yml	master	push	44928296998	0s	2026-11-21T17:07:24Z
in_progress		Merge pull request #1215 ...	E2E	master	push	44928298036	2m20s	2026-11-21T17:07:24Z
in_progress		Merge pull request #1215 ...	CI	master	push	44928298005	2m20s	2026-11-21T17:07:24Z
completed	success	Merge pull request #1215 ...	Documentation CI	master	push	44928298031	50s	2026-11-21T17:07:24Z
completed	failure	Merge pull request #1214 ...	E2E	master	push	44907986804	12m42s	2026-11-21T13:15:56Z
completed	failure	Merge pull request #1214 ...	CI	master	push	44907986770	3m38s	2026-11-21T13:15:56Z
completed	failure	Merge pull request #1214 ...	.github/workflows/restore-space-invaders.yml	master	push	44907985848	0s	2026-11-21T13:15:55Z
```

Conclusión por workflow sobre el HEAD de `master` (`0e336039b`):

| Workflow | Run | Conclusión | Primer error real |
| --- | --- | --- | --- |
| CI (`ci.yml`) | `44928298005` | **failure** | `##[error]asteroides-server#test: command (/home/runner/work/ArcadeGames/ArcadeGames/server) ... pnpm run test exited (1)` → `FAIL src/__tests__/AsteroidsRoom.test.ts` (`Test Suites: 1 failed, 8 passed, 9 total` / `Tests: 1 failed, 39 passed, 40 total`). Segundo paso rojo: `Typecheck application and game routes` → `e2e/tmp-asset.spec.ts(25,30): error TS2339`, `(26,28): error TS2339`, `(27,23): error TS2339` y `src/games/hitandrun/melee/__tests__/HitRunMeleeSystemWorldUpdate.test.ts(6,25): error TS2345` (`Process completed with exit code 2`). |
| E2E (`e2e.yml`) | `44928298036` | **failure** | `Running 40 tests using 1 worker` … `16 failed` / `24 passed (12.0m)`. Único fallo de Hit & Run: `hitandrun.spec.ts:158:7 › keeps spawned enemies combat-capable after the wave spawn timeline completes` → `- Timeout 22000ms exceeded while waiting on the predicate` con `spawnComplete: false` (3 intentos: original, retry #1, retry #2). Además `[WebServer] FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory` (17:18:00Z), que dejó sin servidor el resto de specs (`net::ERR_CONNECTION_REFUSED`): `tmp-asset`, `tmp-capture`, `tmp-diag`, `tmp-fireheld`, `tmp-img`, `tmp-init`, `tmp-vitals`, `tmp-wave`, `vfx-lab` (×3) y `outrun-baseline.spec.ts:189`. Fallos ajenos a Hit & Run: `frogger-baseline.spec.ts:38` (×3, `expect(metrics.hudOverlaps).toBe(false)`). |
| Documentation CI (`docs.yml`) | `44928298031` | **success** (50 s) | — |
| `restore-space-invaders.yml` | `44928296998` | **failure** (0 s) | `This run likely failed because of a workflow file issue.` El workflow solo declara `on: workflow_dispatch` con `inputs.confirm == 'RESTORE'`, pero se agenda en cada `push` a `master`. No pertenece a Hit & Run ni a `ci.yml`/`e2e.yml`/`docs.yml`. |

### 1.1 Historial del job E2E (raíz del rojo histórico)

Comandos: `gh run list --workflow=e2e.yml -L 200 --json conclusion,createdAt,headSha`

- `197 failure`, `1 success`, `2 cancelled` en los últimos 200 runs.
- El **único** run verde es `2026-11-06T18:53:41Z` (`140b49dab`), **anterior** a los escenarios de
  Fase 1.1 (`c9975d272`, 2026-11-06 21:30, y `547879cc1`, 21:36).
- El primer run rojo posterior (`42285475092`, commit `c542ad3b0`, cabeza de PR6) ya falla por
  Hit & Run: `1) hitandrun.spec.ts:21:7 › Player moves right in ECS world when ArrowRight key is pressed` (`22 passed (3.2m)`).
- El run de la cabeza de PR9 (`42289789504`, `547879cc1`) falla con
  `hitandrun.spec.ts:103:7 › keeps melee and ranged fire independent…` y
  `hitandrun.spec.ts:157:7 › runs death slow motion once…` (`23 passed (3.7m)`).

**Conclusión de la tarea 1**: el job `E2E` de `master` está rojo de forma ininterrumpida desde que
entraron los escenarios de Fase 1.1; nunca ha estado verde con el `hitandrun.spec.ts` actual.
El rojo del `CI` de `master` tiene dos causas, una de ellas de Hit & Run (los 4 errores de
`typecheck:app`).

---

## 2. Criterio 3 — Suites locales

Todos los comandos se ejecutan en `chore/hitrun-1-1-validation` con base `0e336039b`.

| # | Comando | Resultado | Duración |
| --- | --- | --- | --- |
| 2.1 | `pnpm exec jest --runInBand src/games/hitandrun/__tests__` | **PASS** — `Test Suites: 23 passed, 23 total` / `Tests: 81 passed, 81 total` (antes de los cambios). Re-verificado **después** de los commits: `Test Suites: 24 passed, 24 total` / `Tests: 83 passed, 83 total`, con la nueva guarda de regresión incluida. | 63.9 s / 19.2 s |
| 2.2 | `pnpm run typecheck:core` | **PASS** (sin salida de error) | 33.5 s |
| 2.2 | `pnpm run typecheck:app` | **FAIL** antes del commit `6be99be08` (4 errores TS, los mismos que la CI) → **PASS** después (`exit 0`, sin salida de error; re-verificado sobre la rama final) | 591 s / 103 s |
| 2.3 | `pnpm run test:games:ci` | **PASS** — `Test Suites: 303 passed, 303 total` / `Tests: 1624 passed, 1624 total` | 373.3 s |
| 2.4 | `pnpm run check:core-boundaries` | **PASS** — `✅ Boundaries check passed! @tiny-aster/core is clean.` | — |
| 2.4 | `pnpm run check:input-contract` | **PASS** — 4 `PASS` (`CanonicalInputState.actions…`) | — |
| 2.4 | `pnpm run check:game-patterns` | **PASS** — `🎉 All automated pattern checks passed successfully!` | — |

### 2.1 Errores de `typecheck:app` (reproducidos en local)

```
e2e/tmp-asset.spec.ts(25,30): error TS2339: Property 'downloaded' does not exist on type '{}'.
e2e/tmp-asset.spec.ts(26,28): error TS2339: Property 'localUri' does not exist on type '{}'.
e2e/tmp-asset.spec.ts(27,23): error TS2339: Property 'uri' does not exist on type '{}'.
src/games/hitandrun/melee/__tests__/HitRunMeleeSystemWorldUpdate.test.ts(6,25): error TS2345:
  Argument of type '{ type: "Transform"; x: number; ...; dirty: true; }' is not assignable to
  parameter of type 'TransformComponent & { type: "Transform"; }'.
  Type '{ ... }' is missing the following properties from type 'TransformComponent': worldScaleX, worldScaleY
```

Causa raíz de cada uno:

- `HitRunMeleeSystemWorldUpdate.test.ts` construye a mano un `TransformComponent` sin
  `worldScaleX`/`worldScaleY`, campos que `TransformComponent` declara como obligatorios desde
  que `packages/core/src/ecs/CoreComponents.ts:55-57` los añadió. El test se introdujo en
  `1269334d2` (2026-11-21) sin actualizar el literal.
- `e2e/tmp-asset.spec.ts` lee `Object.values(AssetClass.byUri)[0]`, cuyo tipo inferido es `{}`
  (el registro de `expo-asset` no está tipado), por lo que `a?.downloaded`, `a?.localUri` y
  `a?.uri` no compilan.

### 2.2 Pasos de `.github/workflows/ci.yml`

Se ejecutan en el mismo orden que el workflow. **Todos** los pasos se ejecutaron; ninguno
necesita secretos.

| Paso del workflow | Comando | Exit | Duración |
| --- | --- | --- | --- |
| Verify generated sprite artifacts | `pnpm run sprites:build -- --check` | 0 | 11 s |
| Validate sprite atlases and metadata | `pnpm run sprites:validate` | 0 | 9 s |
| Test sprite metadata validator and animator | `pnpm exec jest --config src/games/shared/jest.config.cjs --runInBand --runTestsByPath …` | 0 | 60 s |
| Test shared sprite destination geometry | `pnpm --filter=@tiny-aster/core exec jest --runInBand --runTestsByPath tests/SpriteSheetDefinition.test.ts` | 0 | 52 s |
| Lint sprite metadata and animation files | `pnpm exec eslint <los 28 ficheros de ci.yml>` | 0 | 38 s |
| Build through Turborepo | `pnpm exec turbo run build` | 0 | 1349 s |
| Lint through Turborepo | `pnpm exec turbo run lint` | 0 | 332 s |
| Typecheck through Turborepo | `pnpm exec turbo run typecheck` | 0 | 1408 s |
| Run tests through Turborepo | `pnpm exec turbo run test` | **1** | 545 s |
| Enforce repository agent and architecture guardrails | `pnpm run check:agent-guardrails` | 0 | 167 s |
| Validate README and quality-gate documentation | `pnpm run docs:check` | **1** | 2 s |
| Measure input-path performance baseline | `pnpm exec tsx packages/core/src/__benchmarks__/inputPathBenchmark.ts` | 0 | 4 s |
| Run all game unit and regression tests | `pnpm run test:games:ci` | 0 | 373 s (ver 2.3) |
| Typecheck application and game routes | `pnpm run typecheck:app` | **0** | 103 s (tras el arreglo del commit 1) |
| `pnpm run ci` | build:core + gameplay-kit build + check:agent-guardrails + docs:check + typecheck:app | **1** | 429 s (antes del rebase) / tras el rebase: **1**, mismo punto de parada (`check:ratchet`) |

Los exits en rojo y su causa:

1. **`pnpm exec turbo run test` (exit 1)** — dos fallos, **ninguno de Hit & Run**:
   - `@tiny-aster/core:test: FAIL src/tests/BoltPerformance.test.ts` → `expect(duration).toBeLessThan(250)`
     recibió `420.77197999999044` (`packages/core/src/tests/BoltPerformance.test.ts:529`). Es una
     aserción de **rendimiento en tiempo de pared**; en este host (8 GB, con swap) el bucle de
     comprobación de impactos tarda 420 ms. En CI el mismo paso es verde.
   - `asteroides-server:test: FAIL src/__tests__/AsteroidsRoom.test.ts` → `AsteroidsRoom authoritative
     input › processes the real spawned Ship input and attributes bullets to its session`
     (`server/src/__tests__/AsteroidsRoom.test.ts:65`). Es **exactamente el mismo fallo que falla en la
     CI remota** de `master` (run `44928298005`), está en `server/` y queda explícitamente fuera del
     alcance de esta misión.
2. **`pnpm run docs:check`** — falla **mientras la rama arrastraba commits ajenos**:
   `Documentation consistency check failed: Technical-debt policy is stale: duplication baseline /
   color literal baseline / duplication reduction target / color-literal reduction target`.
   Lo provocan los commits de *frogger* que otra sesión confirmó sobre esta rama
   (`7939e30f8 frogger(T3): refresh duplication baseline after render refactor` y
   `1ddb4cec3 frogger(T4): refresh color-literal baseline after token migration`): actualizan los
   baselines sin actualizar el documento de deuda técnica. **No toca nada de Hit & Run.** Tras
   rebasar la rama sobre `master` el paso pasa: `Documentation consistency check passed: 16 game
   modules, 8 workspace packages, and CI quality-gate references verified.` (exit 0).
3. **`pnpm run ci` (exit 1)** — encadena `build:core`, `gameplay-kit build`, `check:agent-guardrails`,
   `docs:check` y `typecheck:app`. Con la rama rebasada, `docs:check` y `typecheck:app` pasan, pero
   `check:agent-guardrails` → `check:ratchet` falla:

   ```
   🤖 Typecast Ratchet Linter Results ('as any' / 'as unknown')
   ❌ TYPECAST REGRESSION: 1 file(s) exceeded an individual category baseline:
     - src/games/frogger/rendering/__tests__/FroggerSkiaPaints.test.tsx: as any=2 (baseline 0, +2); as unknown=0 (baseline 0, +0)
   ```

   Es un fallo **preexistente en el HEAD de `master`**: `git show master:src/games/frogger/rendering/
   __tests__/FroggerSkiaPaints.test.tsx | grep -c "as any"` → `2`, y `scripts/typecast-baseline.json`
   no tiene entrada para ese fichero. Ni el fichero ni el baseline están entre los ficheros que
   cambia esta misión (`git diff master --name-only` → 6 ficheros, ninguno de ellos es del juego
   *frogger*). En la CI remota de `master` el job muere antes, en `turbo run test`, y por eso el
   ratchet no aparece en el log del run `44928298005`.

---

## 3. Criterios 1 y 3 — E2E

### 3.1 Inventario de specs

Comando: `pnpm exec playwright test --list` → `Total: 40 tests in 13 files`

| Spec | Tests | Notas |
| --- | --- | --- |
| `e2e/frogger-baseline.spec.ts` | 3 | ajeno a Hit & Run; falla en CI por `hudOverlaps` |
| `e2e/games.spec.ts` | 20 | incluye `Can open, render, and interact with Hit and Run (/hitandrun)` |
| `e2e/hitandrun.spec.ts` | 4 | los cuatro escenarios de Fase 1.1 |
| `e2e/outrun-baseline.spec.ts` | 2 | ajeno a Hit & Run |
| `e2e/tmp-*.spec.ts` (8 ficheros) | 8 | `tmp-asset`, `tmp-capture`, `tmp-diag`, `tmp-fireheld`, `tmp-img`, `tmp-init`, `tmp-vitals`, `tmp-wave`. **Medido**: los 8 contienen **0** llamadas a `expect(` (`grep -c "expect(" e2e/tmp-*.spec.ts` → `0` en los 8). Son diagnósticos de consola, no aserciones. |
| `e2e/vfx-lab.spec.ts` | 3 | ajeno a Hit & Run |

Total: 3 + 20 + 4 + 2 + 8 + 3 = **40** tests en 13 ficheros, que coincide con la salida del
runner (`Total: 40 tests in 13 files`) y con la del job remoto (`Running 40 tests using 1 worker`).

### 3.2 Los cuatro escenarios de Hit & Run (`--repeat-each=3`)

Comando: `pnpm exec playwright test e2e/hitandrun.spec.ts --repeat-each=3 --trace on --reporter=list`

**Adaptaciones locales (no tocan el repositorio)**: el host tiene 8 GB y sirve el bundle de
desarrollo de Expo web (~21 MB sin minificar). Medido en este host: `page.goto("/hitandrun")`
tarda **31,8 s** (línea base de `diag3.mjs`: `GOTO_DONE>>>31790<<<`) y el hook queda instalado a
los **40,5 s** (`HOOK_READY>>>40484<<<`), por encima del timeout de navegación por defecto de
Playwright (30 s). Por eso se usa un `playwright.local.config.ts` **fuera del control de versiones**
(`navigationTimeout: 240000`, `timeout: 180000`, `webServer: undefined` porque el servidor Expo se
arranca por fuera). Los escenarios, el build de la app y las aserciones son los del repositorio.
Ese fichero se ha borrado al terminar y **no** forma parte de ningún commit.

Además, el servidor Expo de desarrollo crece hasta **2,2 GB de RSS** tras servir ~10 páginas
(`ps -Ao pid,pmem,rss,etime,comm` → `node 26.2 2196604 01:00:59`): a partir de ahí el host
entra en swap (7 GB de swap en uso) y la tasa de fotogramas del navegador cae, lo que hace
fallar los escenarios sensibles al tiempo por motivos de entorno.

### 3.2.1 Ejecución A — servidor recién arrancado, los 4 escenarios × 3 (16,3 min)

```
✓  1 hitandrun.spec.ts:94:7 › loads the route and moves the player … (36.6s)
✘  2 hitandrun.spec.ts:122:7 › keeps melee and ranged fire independent … (58.3s)
✓  3 hitandrun.spec.ts:158:7 › keeps spawned enemies combat-capable … (1.0m)
✘  4 hitandrun.spec.ts:210:7 › runs death slow motion once … (54.1s)
✓  5 hitandrun.spec.ts:94:7 › loads the route and moves the player … (1.1m)
✘  6 hitandrun.spec.ts:122:7 › keeps melee and ranged fire independent … (1.4m)
✓  7 hitandrun.spec.ts:158:7 › keeps spawned enemies combat-capable … (1.3m)
✘  8 hitandrun.spec.ts:210:7 › runs death slow motion once … (1.1m)
✓  9 hitandrun.spec.ts:94:7 › loads the route and moves the player … (1.3m)
✘ 10 hitandrun.spec.ts:122:7 › keeps melee and ranged fire independent … (1.7m)
✓ 11 hitandrun.spec.ts:158:7 › keeps spawned enemies combat-capable … (2.0m)
✘ 12 hitandrun.spec.ts:210:7 › runs death slow motion once … (1.2m)
7 passed / 5 failed (16.3m)
```

Ejecución A **anterior** al arreglo de la carrera del escenario de muerte (ver 6.5).

### 3.2.2 Ejecución B — escenario de muerte en isolation, servidor recién arrancado (tras el arreglo)

```
✓ 1 hitandrun.spec.ts:210:7 › runs death slow motion once and restores a playable world after restart (36.6s)
✓ 2 hitandrun.spec.ts:210:7 › runs death slow motion once and restores a playable world after restart (37.2s)
✓ 3 hitandrun.spec.ts:210:7 › runs death slow motion once and restores a playable world after restart (47.6s)
3 passed (2.6m)
```

### 3.2.3 Ejecución C — escenarios de melee/fire y de muerte en isolation, servidor recién arrancado

```
✓ 1 hitandrun.spec.ts:122:7 › keeps melee and ranged fire independent … (18.7s)
✓ 2 hitandrun.spec.ts:210:7 › runs death slow motion once … (52.4s)
✓ 3 hitandrun.spec.ts:122:7 › keeps melee and ranged fire independent … (30.7s)
✓ 4 hitandrun.spec.ts:210:7 › runs death slow motion once … (49.5s)
✓ 5 hitandrun.spec.ts:122:7 › keeps melee and ranged fire independent … (42.3s)
✓ 6 hitandrun.spec.ts:210:7 › runs death slow motion once … (1.2m)
6 passed (5.1m)
```

### 3.2.4 Ejecución D — los 4 escenarios × 3 con el arreglo de la carrera aplicado

```
✓  1 hitandrun.spec.ts:100:7 › loads the route and moves the player … (34.8s)
✘  2 hitandrun.spec.ts:128:7 › keeps melee and ranged fire independent … (56.1s)
✓  3 hitandrun.spec.ts:164:7 › keeps spawned enemies combat-capable … (57.3s)
✓  4 hitandrun.spec.ts:216:7 › runs death slow motion once … (1.4m)
✘  5 hitandrun.spec.ts:100:7 › loads the route and moves the player … (1.2m)
✘  6 hitandrun.spec.ts:128:7 › keeps melee and ranged fire independent … (3.0m)
✘  7 hitandrun.spec.ts:164:7 › keeps spawned enemies combat-capable … (3.2m)
```

A partir del test 5 el servidor ya había served 4 páginas más y el host entra en swap: los
tiempos se triplican (1,2 m → 3,0 m) y los escenarios empiezan a fallar por entorno. La
ejecución se abortó por esa causa (el servidor Expo recibe `SIGABRT`).

### 3.2.5 Resumen por escenario (las 3 repeticiones de cada uno)

| Escenario | Ejecución A | Ejecución B | Ejecución C | Ejecución D | CI remoto (`44928298036`) |
| --- | --- | --- | --- | --- | --- |
| 1 carga y movimiento | ✓ ✓ ✓ | — | — | ✓ ✘ ✘ | ✓ (no aparece en la lista de fallos) |
| 2 melee y fuego independientes | ✓ ✘ ✘ | — | ✓ ✓ ✓ | ✘ (y abortada) | ✓ (no aparece en la lista de fallos) |
| 3 enemigos con collider tras el timeline | ✓ ✓ ✓ | — | — | ✓ (y abortada) | **✘ 3/3** (el fallo que se corrige aquí) |
| 4 dos ciclos de muerte / slow-motion / restart | ✘ ✘ ✘ | ✓ ✓ ✓ | ✓ ✓ ✓ | ✓ | ✓ (no aparece en la lista de fallos) |

**Lectura**: el escenario 3 pasa **3/3** en local una vez aplicado el arreglo, y el escenario 4
pasa **3/3** en local una vez eliminado su carrera. Los fallos locales de los escenarios 1 y 2
sólo aparecen cuando el servidor de desarrollo ya ha served muchas páginas y el host está
intercambiando memoria; con el servidor recién arrancado (ejecuciones B y C) ambos pasan.

### 3.2.6 Causa de los fallos locales de los escenarios 1 y 2

- Escenario 2 (`keeps melee and ranged fire independent`): `expect.poll(() => readComboStep(page),
  { timeout: 8000 })` recibe `"idle"` durante los 8 s mientras `attackHeld` sí es `true`. En el
  juego, `ComboMeleeSystem` descarta el borde de pulsación de ataque si el jugador está bajo
  control bloqueado (`isPlayerControlLocked` → `src/games/hitandrun/melee/ComboMeleeSystem.ts:85`)
  y el búfer de ataque (`attackBufferSeconds: 0.2`, `src/games/hitandrun/melee/ComboMeleeTypes.ts:34`)
  se consume en **un solo fotograma** si el delta del bucle llega a `maxDelta` (0,25 s,
  `packages/core/src/loop/GameLoop.ts:122`). Con el host degradado el navegador baja de ~21 fps
  (medido en `diag6.mjs`: `PAGE_1_FPS>>>20.9<<<`, `PAGE_4_FPS>>>21.9<<<` con el servidor recién
  arrancado) y el delta se acerca al límite. **No se ha tocado el escenario**: relajarlo sería
  exactly el atajo prohibido, y en CI el escenario pasa.
- Escenario 1 (`loads the route and moves the player`): falla cuando la carga de la página y el
  `expect.poll` del movimiento (2 s) se ejecutan con el host en swap; el `expect.poll` de `X` con
  `timeout: 2000` no llega a ver el desplazamiento.

### 3.3 `pnpm test:e2e` completo

#### 3.3.1 Job remoto `e2e.yml` (referencia autoritativa)

Run `44928298036` sobre el HEAD de `master` (`0e336039b`):

```
Running 40 tests using 1 worker
...
16 failed
24 passed (12.0m)
```

Fallo del servidor Expo web a mitad del job (17:18:00Z):

```
[WebServer] FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

A partir de ahí los specs restantes fallan con `net::ERR_CONNECTION_REFUSED` / `net::ERR_EMPTY_RESPONSE`.

Reparto por spec (16 fallos / 24 pases):

| Spec | Tests | Resultado | Causa |
| --- | --- | --- | --- |
| `frogger-baseline.spec.ts` | 3 | ✘ ✘ ✘ | `expect(metrics.hudOverlaps).toBe(false)` (ajeno a Hit & Run) |
| `games.spec.ts` | 20 | ✓ | — |
| `hitandrun.spec.ts` | 4 | ✓ ✓ ✓ **✘** | el escenario de oleada: `spawnComplete: false` (corregido en esta misión) |
| `outrun-baseline.spec.ts` | 2 | ✓ ✘ | `net::ERR_EMPTY_RESPONSE` (servidor caído) |
| `tmp-asset`, `tmp-capture`, `tmp-diag`, `tmp-fireheld`, `tmp-img`, `tmp-init`, `tmp-vitals`, `tmp-wave` | 8 | ✘ ✘ ✘ ✘ ✘ ✘ ✘ ✘ | `net::ERR_CONNECTION_REFUSED` (servidor caído) |
| `vfx-lab.spec.ts` | 3 | ✘ ✘ ✘ | `net::ERR_CONNECTION_REFUSED` (servidor caído) |

**Aportación de los `tmp-*.spec.ts`**: 8 de los 40 tests (20 %), ninguno con aserciones
(`grep -c "expect(" e2e/tmp-*.spec.ts` → `0` en los 8). No aportan ninguna verificación: son
diagnósticos de consola. Su coste es el de 8 cargas de página más, y en el job remoto caen
precisamente en la ventana en la que el servidor Expo se queda sin memoria. Aun así, **no hacen
fallar el job por sí mismos** (no tienen `expect`, luego no pueden fallar) y **no agotan su timeout
de 20 min**: el job tardó 12,0 min de los 20 disponibles. Por eso **no** se añade
`testIgnore: "**/tmp-*.spec.ts"` a `playwright.config.ts` (la tarea 3.5 sólo lo pide si los `tmp-*`
hacen fallar el job o superan su timeout, y ninguna de las dos cosas ocurre).

#### 3.3.2 Ejecución local completa

Comando: `pnpm exec playwright test --config=playwright.local.config.ts --reporter=list`
(servidor Expo externo recién arrancado; 40 tests, 1 worker).

```
Running 40 tests using 1 worker
...
11 failed
13 passed (1.0h)
16 did not run
2 errors were not a part of any test
```

**La suite completa no se puede terminar en este host.** Datos medidos:

- El bundle de desarrollo tardó **546 532 ms** (9 min) en una de las peticiones
  (`Web Bundled 546532ms … expo-router/entry.js`), y el propio Expo quedó sirviendo con 2,2 GB de
  RSS.
- A partir del test 12 la mayoría de los tests agotan el timeout de 180 s del config local
  (`✘ … (3.0m)`): el host entra en swap (7–8 GB de swap en uso) y el navegador deja de renderizar
  con flujo normal.
- El run termina en el test 24 (el primero de `hitandrun.spec.ts`, que falla con
  `net::ERR_EMPTY_RESPONSE` en `page.goto`) y los **16 tests restantes no se ejecutan**.
- Reparto de los 24 ejecutados: `frogger-baseline` 2 ✓ / 1 ✘; `games.spec.ts` 13 ✓ / 7 ✘;
  `hitandrun.spec.ts` 0 ✓ / 1 ✘ (`ERR_EMPTY_RESPONSE`). Los 8 `tmp-*.spec.ts`, los 2 de
  `outrun-baseline` y los 3 de `vfx-lab` no llegaron a ejecutarse.

Conclusión: **la medición autoritativa de la suite completa es el job remoto** (sección 3.3.1). La
ejecución local sirve para los escenarios de Hit & Run (medidos en 3.2 con el servidor recién
arrancado), no para la suite completa.

Lo que **no** se ha hecho y por qué (tarea 3.5): no se añade `testIgnore: "**/tmp-*.spec.ts"` a
`playwright.config.ts`. Los `tmp-*` no hacen fallar el job por sí mismos (no tienen `expect`) y el
job remoto tardó 12,0 min de los 20 disponibles, así que no superan su timeout. Cómo seguir
ejecutándolos a mano, si hiciera falta:

```bash
pnpm exec playwright test e2e/tmp-wave.spec.ts --reporter=list
pnpm exec playwright test e2e/tmp-vitals.spec.ts --reporter=list
# (o cualquier otro e2e/tmp-*.spec.ts)
```

---

## 4. Criterio 2 — Vercel

Comandos usados:

```bash
gh api repos/xavirodriguez/ArcadeGames/commits/<sha>/status
gh api repos/xavirodriguez/ArcadeGames/deployments
CI=1 npx --yes vercel@latest inspect dpl_EgJvEyrT4dDi9VDmoBU1z792YepT --logs
```

### 4.1 Estado del despliegue por commit

| Commit | Descripción | Estado Vercel |
| --- | --- | --- |
| `0e336039b` | **HEAD de `master`** (PR #1215) | **success** — `Deployment has completed` → `https://vercel.com/javis-projects-0a2bd667/asteroides-server/FabzFs6kB1HENzhDgwxKVy324jLW` (despliegue `Production`, `2026-11-21T17:16:19Z`) |
| `135d33017` | `frogger(T1): add frogger E2E debug hook and baseline spec` | success |
| `f03f1de66` | `outrun(T0.3): cover the runtime seed switch of the E2E debug API` | success |
| `a51d8ae5b` | PR #1214 (asteroids multiplayer, **ajeno a Hit & Run**) | success |
| `f2e6f398e` | PR #1133 merge (PR6) | success |
| `522c9e28a` | PR #1136 merge (PR9) | success |
| `9dd38e752` | PR #1137 merge (PR10) | success |
| `9df61def8` | PR #1196 merge (`fix/hitrun-wave-spawn-e2e`) | success |
| `547879cc1` | cabeza de PR9 (el despliegue citado en el ledger) | **failure** — `Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_EgJvEyrT4dDi9VDmoBU1z792YepT --logs` |
| `9c0de085f` | PR #1200 merge (`fix/hitrun-wave-spawn-timeline-diagnostics`) | **failure** — `dpl_3AzyEPwXWWu2oiCbRRDv4yyV3AFh` |
| `0797786ad` | PR #1205 merge (`fix/hitandrun-cancel-interrupted-melee`) | `Canceled from the Vercel Dashboard` (cancelación manual, no fallo de build) |

### 4.2 Log del despliegue: no legible desde este entorno

`npx vercel inspect dpl_EgJvEyrT4dDi9VDmoBU1z792YepT --logs` responde:

```
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```

No hay `~/.vercel` ni `VERCEL_TOKEN` en el entorno. **No se puede leer el log de Vercel desde
aquí, así que no se clasifica el fallo histórico de build/configuración/entorno**: no se afirma
ninguna conclusión sobre la causa.

Lo que sí es medible con la API de GitHub:

- El despliegue del **HEAD de `master` ya termina en `success`**, de modo que el criterio 2 se
  cierra con el estado del despliegue, no con el log.
- Los fallos históricos (`547879cc1`, `9c0de085f`) son de **cabezas de PR**, mientras que los
  merges de PR6, PR9, PR10 y PR1196 de `master` desplegaron bien.
- Commits de `master` ajenos a Hit & Run (PR #1214, `frogger(T1)`, `outrun(T0.3)`) también
  desplegaron bien: **no hay evidencia de que el fallo de Vercel fuera específico de Fase 1.1**.

### 4.3 Desajuste de configuración — HIPÓTESIS (no verificada)

Datos del repositorio:

- `vercel.json` (raíz): `buildCommand: "pnpm run build"`, `outputDirectory: "dist"`, `framework: null`.
- `package.json` (raíz): `build` = `pnpm turbo run build && pnpm exec expo export` → produce el
  bundle **web de la app Expo** en `dist/`.
- `server/package.json`: `build` = `pnpm exec tsc` y `server/tsconfig.json` compila a `./dist`.

**HIPÓTESIS**: el proyecto de Vercel `asteroides-server` está configurado con la raíz del
repositorio, de modo que `buildCommand` ejecuta el build de la **app web Expo** y `outputDirectory`
apunta al `dist/` de la app, mientras que el servidor Colyseus (`server/`) nunca llega a
compilarse. Si el proyecto de Vercel debe servir el servidor, tendría que tener
`rootDirectory: server` (o un `buildCommand` propio) y `outputDirectory: dist` **relativo a
`server/`**. Esta hipótesis **no está verificada**: sin credenciales de Vercel no se puede leer
ni el `project settings` ni el log.

**Pregunta para Xavi**: ¿qué proyecto de Vercel debe desplegar qué directorio? Concretamente,
¿el proyecto `asteroides-server` debe desplegar `server/` (build `pnpm exec tsc`, salida
`server/dist`) o el repositorio raíz (build web Expo, salida `dist/`)? El `vercel.json` de la raíz
es hoy el de la app web y no el del servidor.

---

## 5. Criterio 4 — Revisión de contratos (lectura de código)

### 5.1 `window.__hitAndRunDebug` es de solo lectura y solo en web con `EXPO_PUBLIC_E2E_HOOKS=true`

Fichero: `src/app/hitandrun/index.tsx`.

| Evidencia | Ubicación |
| --- | --- |
| Declaración del contrato global (solo getters) | `src/app/hitandrun/index.tsx:40-82` |
| `const isE2E = process.env.EXPO_PUBLIC_E2E_HOOKS === "true";` | `src/app/hitandrun/index.tsx:147` |
| El `useEffect` que instala el hook empieza con `if (Platform.OS !== "web" \|\| !game \|\| !isReady) return;` | `src/app/hitandrun/index.tsx:164` |
| Instalación condicionada: `if (process.env.EXPO_PUBLIC_E2E_HOOKS === "true") { window.__hitAndRunDebug = {…} }` | `src/app/hitandrun/index.tsx:255-438` |
| Limpieza condicionada: `if (process.env.EXPO_PUBLIC_E2E_HOOKS === "true") { delete window.__hitAndRunDebug; }` | `src/app/hitandrun/index.tsx:444-446` |

Comprobación de solo lectura (grep sobre el bloque 256-437): el hook usa **exclusivamente**
`game.getWorld()` + `world.getResource(...)`, `world.query(...)`, `world.getComponent(...)` y
`world.hasComponent(...)`. **No** aparecen `setResource`, `createEntity`, `removeComponent`,
`mutateComponent`, `emit` ni `getCommandBuffer()` dentro del bloque del hook. Tampoco existe
ningún `step(n)` ni escritura de estado.

### 5.2 `HitRunDeathFlowSystem`

Fichero: `src/games/hitandrun/systems/HitRunDeathFlowSystem.ts`.

| Contrato | Evidencia |
| --- | --- |
| `TimeScale` se escribe como objeto | `setTimeScale()` en `src/games/hitandrun/systems/HitRunDeathFlowSystem.ts:117-128`: si el recurso ya existe y es objeto muta `current.scale`; si no, `world.setResource("TimeScale", new TimeScale(scale))` (línea 127). Nunca se escribe un número. |
| `runsWhileFrozen` | `public runsWhileFrozen = true;` (`HitRunDeathFlowSystem.ts:32`) |
| Respeta `IsPaused` | `if (world.getResource("IsPaused") === true) return;` (`HitRunDeathFlowSystem.ts:65`) |
| No divide el delta por la escala | `flow.remaining -= deltaTime;` (`HitRunDeathFlowSystem.ts:107`) con el comentario explícito en 105-106: *“runsWhileFrozen gives this system the unscaled wall-clock delta. Dividing by TimeScale here would double-compensate and shorten the slow-motion window.”* |

### 5.3 Amortiguación de knockback

Fichero: `src/games/hitandrun/hurt/HitRunHurtSystem.ts:24-37`:

```ts
const ENEMY_KNOCKBACK_RETENTION_PER_60HZ_TICK = 0.85;
const REFERENCE_SIMULATION_HZ = 60;
function getEnemyKnockbackRetention(deltaTime: number): number {
  if (!Number.isFinite(deltaTime) || deltaTime <= 0) return 1;
  return Math.pow(ENEMY_KNOCKBACK_RETENTION_PER_60HZ_TICK, deltaTime * REFERENCE_SIMULATION_HZ);
}
```

Búsqueda de amortiguación por frame alternativa en todo el juego
(`grep -rn "Math.pow|damping|friction|retention|\*= 0\." src/games/hitandrun`): los 5 aciertos son
esta función, su constante y la prueba `HitRunHitReactionIntegration.test.ts:107-113`
(`expect(at60Hz).toBeCloseTo(260 * Math.pow(0.85, 60), 6)`). **No hay otro sitio que amortigüe
por frame.** El resto de coincidencias de `0.85` en el árbol son valores de contenido
(`projectileTtl`, `attackDuration`, colores RGBA, radios de dibujo), no amortiguación.

### 5.4 `git diff` entre la cabeza de PR9 y HEAD en los ficheros de contrato

`git diff 547879cc1442cf8b4186ff357ea7c04581af088b..HEAD -- <ficheros>`:

| Fichero | Cambios tras el 6 de noviembre | ¿Toca los contratos? |
| --- | --- | --- |
| `src/games/hitandrun/systems/HitRunDeathFlowSystem.ts` | **ninguno** (`git log 547879cc1..HEAD -- <fichero>` vacío) | No |
| `src/games/hitandrun/hurt/HitRunHurtSystem.ts` | `01f2972dd` / `f1524f15b` (PR #1205, 2026-11-18): adjuntar `HitReaction` con `world.isUpdating` en vez de siempre por command buffer. `c5c6214d2` / `dbdba768f` / `9adbadc6f` (PR #1205, 2026-11-19): umbrales épsilon `1e-9` en `hitstunRemaining`/`staggerRemaining`. | **No**: el diff no contiene ninguna línea de `getEnemyKnockbackRetention`, de `0.85` ni de `REFERENCE_SIMULATION_HZ`. |
| `src/app/hitandrun/index.tsx` | `0696dba34` / `361a0c854` (PR #1196) y `bc3ddc0b9` (PR #1200): se **endurece** `getWaveState().spawnComplete` y se añaden diagnósticos (`getWaveOwnedEnemyCount`, `getWaveCombatableEnemyCount`, `expectedSpawnCount`, `failedSpawnCount`, `sectionIndex`, `paused`, `timeScale`, `simulationFrozen`). `fd8d54f3b`: `<CanvasRenderer world={game.getWorld()}>` → `world={() => game.getWorld()}`. | Parcial: **sí** toca el hook, pero solo lo **hace más estricto** (ver 5.5). No añade escrituras. |
| `e2e/hitandrun.spec.ts` | `0696dba34` / `361a0c854` / `bc3ddc0b9`: el escenario de oleada pasa de `expect.poll(spawnComplete).toBe(true)` (8 s) a `toMatchObject({ spawnComplete: true })` (22 s) con más aserciones de diagnóstico. | Sí (es el escenario corregido en esta misión). |

### 5.5 Hallazgo clave: el `spawnComplete` histórico era un falso positivo

`git diff 547879cc1..HEAD -- src/app/hitandrun/index.tsx` muestra el cambio de semántica:

```diff
-          const spawnComplete = !wave || !wave.active || (
-            !!script && script.id === wave.scriptId && script.loop !== true &&
-            wave.nextEventIndex >= script.events.length && pending.length === 0
-          );
+          const spawnComplete = Boolean(
+            wave && wave.active && scriptMatches && script?.loop !== true &&
+            wave.nextEventIndex >= (script?.events.length ?? 0) && pending.length === 0
+          );
```

La versión anterior devolvía `true` **cuando no había director activo** (`!wave || !wave.active`),
es decir, también durante la ventana en la que la muerte había recreado el `World` y todavía no
había director de oleada. Por eso el escenario pasaba en CI el 6 de noviembre sin que la línea de
tiempo de spawn se hubiera completado nunca. El PR #1200 lo endureció correctamente y, al
hacerlo, destapó el problema real descrito en la sección 6.

---

## 6. Causa raíz del escenario E2E rojo `keeps spawned enemies combat-capable…`

### 6.1 Síntoma

- Remoto (`e2e.yml`, run `44928298036`, HEAD `master`): `hitandrun.spec.ts:158:7` falla en los 3
  intentos con `spawnComplete: false` y `- Timeout 22000ms exceeded while waiting on the predicate`.
- Local (mismo commit, Chromium real contra el servidor Expo local): idéntico.

### 6.2 Cadena causal medida

1. **El script de la sección 0 dura 11,5 s de tiempo de simulación.**
   `src/games/hitandrun/waves/sectionWaves.ts:13-22` (`WAVE_GOBLINS`): eventos en `t = 1.2, 4.5,
   8.0, 11.5`. `HitRunWaveSystem.update` sólo incrementa `nextEventIndex` cuando
   `ev.t <= state.elapsed` (`src/games/hitandrun/waves/HitRunWaveSystem.ts:80-85`), de modo que el
   cursor llega al final del script en `elapsed >= 11.5`.
2. **Un jugador quieto muere antes.** Traza obtenida ejecutando el juego en Chromium real contra
   el servidor Expo local y leyendo el hook de solo lectura cada 500 ms:

   ```
   T+1612  hp=5 x=120   wave.elapsed=1.47 nextEventIndex=1 totalSpawned=4  enemies=4
   T+2143  hp=4 x=70.5  wave.elapsed=1.92 nextEventIndex=1 totalSpawned=4  enemies=4
   T+3260  hp=3 x=24.7  wave.elapsed=2.98 nextEventIndex=1 totalSpawned=4  enemies=4
   T+4850  hp=2 x=-21.2 wave.elapsed=4.55 nextEventIndex=2 totalSpawned=9  enemies=9
   T+6041  hp=1 x=-67   wave.elapsed=5.60 nextEventIndex=2 totalSpawned=9  enemies=9
   T+7102  hp=0 x=-67   wave.elapsed=6.75 nextEventIndex=2 totalSpawned=9  enemies=9
           deaths=1  timeScale=0.28  deathFlow.active=true (remaining=0.4)
   T+7723  hp=null x=null deaths=0  scriptId=null nextEventIndex=0 eventCount=0   <- World recreado
   T+9790  hp=5 x=120   (nuevo World) wave.elapsed=0 -> el ciclo se repite idéntico
   ```

   Es decir: el jugador pierde sus 5 puntos de vida en `wave.elapsed ≈ 6.75 s`, **5,75 s antes**
   del último evento programado del script.
3. **La muerte reinicia el mundo y con él el director de oleadas.**
   `HitRunDeathFlowSystem` pone `TimeScale` 0.28, cuenta la muerte y pide `requestRestart`
   (`src/games/hitandrun/systems/HitRunDeathFlowSystem.ts:73-113`); la UI consume ese flag cada
   100 ms y llama a `restartWithSeed` (`src/app/hitandrun/index.tsx:151-161`), lo que crea un
   `World` nuevo. El `WaveDirectorState` vive en el `World`, así que la línea de tiempo vuelve a
   `elapsed = 0`.
4. **Consecuencia**: mientras el jugador no se mueva, `spawnComplete` **no puede** ser `true`
   dentro de la ventana de 22 s del escenario, porque el `World` se recrea antes de que el cursor
   alcance el evento `t = 11.5`.
5. **Por qué pasó hasta el 6 de noviembre**: el `spawnComplete` del hook era
   `!wave || !wave.active || (…)` (ver 5.5). Con el director **ausente o inactivo** devolvía
   `true`, y esa ventana (justo tras la muerte, antes de que arranque la oleada siguiente) se
  aba durante el reinicio. El PR #1200 corrigió el diagnóstico; desde entonces el escenario falla
   porque nunca observa el final real de la línea de tiempo.

### 6.3 Fix mínimo aplicado

`e2e/hitandrun.spec.ts`, escenario `keeps spawned enemies combat-capable after the wave spawn
timeline completes`: mientras se espera `spawnComplete`, se **mantiene pulsada `ArrowLeft`** por el
puente de entrada real del navegador.

- No se fabrica ninguna muerte, ni se escribe estado ECS desde el hook, ni se amplía el hook.
- No se sube el timeout: el `expect.poll` sigue con `timeout: 22000`.
- No se toca el balance ni la IA.
- El escenario sigue fallando (no pasa) si el puente de entrada o el director de oleadas se
  rompen: es una comprobación real del runtime.

### 6.4 Evidencia de que la línea de tiempo sí es alcanzable

Misma partida, misma semilla, con `ArrowLeft` mantenido:

```
T+1293  hp=5 wave.elapsed=1.48 nextEventIndex=1 totalSpawned=4  enemies=4
T+8080  hp=5 wave.elapsed=8.45 nextEventIndex=3 totalSpawned=11 enemies=11
T+11429 hp=5 wave.elapsed=11.70 nextEventIndex=4 totalSpawned=15 enemies=15
        spawnComplete=true   combatable=15
```

Y a nivel ECS, con la prueba de regresión
`src/games/hitandrun/__tests__/HitRunWaveTimelineReachability.test.ts`:

- `cannot reach the end of the section-0 timeline while the player stands still` → el jugador
  muere (`deaths = 1`, `Health.current = 0`) con `nextEventIndex < 4` y `elapsed < 11.5`.
- `completes the section-0 timeline while the player keeps distance from the wave` → sin muertes,
  `nextEventIndex === 4`, `totalSpawned === expectedSpawnCount` (15) y `elapsed >= 11.5`.


---

## 7. Commits

Rama: `chore/hitrun-1-1-validation` (creada desde `master` en `0e336039b`). No se abre PR.

| # | Commit | Tarea | Contenido |
| --- | --- | --- | --- |
| 1 | `6be99be08` — `hitrun(fix): make typecheck:app pass for the Hit & Run E2E and melee coverage` | Tarea 2 | `src/games/hitandrun/melee/__tests__/HitRunMeleeSystemWorldUpdate.test.ts` (campos `worldScaleX`/`worldScaleY` que `TransformComponent` exige) y `e2e/tmp-asset.spec.ts` (tipado de la lectura del registro de `expo-asset`, sin `any`/`unknown`/casts nuevos). |
| 2 | `16123807e` — `hitrun(fix): let the wave lifecycle E2E observe the completed spawn timeline` | Tarea 3 | `e2e/hitandrun.spec.ts`: `ArrowLeft` mantenido durante la espera de `spawnComplete` y lectura atómica del contador de muertes y del `TimeScale` en el mismo viaje que observa el flujo de muerte. Añade `src/games/hitandrun/__tests__/HitRunWaveTimelineReachability.test.ts` como guarda de regresión (2 pruebas). |
| 3 | `docs(hitandrun): record the Phase 1.1 execution evidence` (HEAD de la rama) | Tarea 6 | Este documento (sustituye a los registros del 2026-11-06; ver `docs/HISTORICAL_RECORD.md` §5). |

Los SHA de los commits 1 y 2 son los definitivos **después** del rebase descrito más abajo (antes del
rebase eran `d653454a3` y `d2357618e`).

> Nota operativa: el árbol de trabajo del repositorio lo comparten varias sesiones de agente. Durante
> esta sesión, otra sesión (trabajo de *frogger*) confirmó 8 commits sobre la rama
> `chore/hitrun-1-1-validation` porque tenía la rama activa. Al final se ha rebasado la rama
> (`git rebase --onto master d2f8cb948 chore/hitrun-1-1-validation`) para que contenga **sólo** los
> tres commits de esta misión sobre `master` (`0e336039b`). Efecto colateral medido: con los
> commits ajenos fuera, `pnpm run docs:check` pasa (antes fallaba, ver 2.2).

## 8. Pendientes

1. **Cerrar el criterio 1 en remoto.** El arreglo del escenario de oleada y los dos arreglos de
   `typecheck:app` están en la rama `chore/hitrun-1-1-validation`, pero **no se ha hecho push ni se
   ha abierto PR** (instrucción explícita), así que la CI remota de `master` sigue con el rojo
   medido en la sección 1. Para cerrarlo hay que publicar la rama y leer los tres checks.
2. **`asteroides-server#test` (`AsteroidsRoom.test.ts:65`)** falla en `master` y también en local
   (mismo fallo). Está en `server/`, fuera del alcance de esta misión.
3. **`@tiny-aster/core` `BoltPerformance.test.ts:529`** es una aserción de tiempo de pared
   (`< 250 ms`); en este host mide 420 ms. En CI es verde. No se toca (no se suben presupuestos ni
   timeouts).
4. **`check:ratchet` (`pnpm run ci`)**: falla en el HEAD de `master` por
   `src/games/frogger/rendering/__tests__/FroggerSkiaPaints.test.tsx` (`as any=2`, baseline 0). Es un
   fichero de *frogger* que esta misión no toca y cuyo arreglo exigiría actualizar el baseline de
   casts (`pnpm run ratchet:update`), fuera del alcance de la Fase 1.1.
5. **Log de Vercel**: requiere credenciales de Vercel (no hay `~/.vercel` ni `VERCEL_TOKEN`). El
   despliegue del HEAD de `master` sí está en `success`; la clasificación del fallo histórico
   (build/configuración/entorno) queda sin responder.
6. **Desajuste `vercel.json` vs `server/`**: sigue sin resolverse (ver 4.3). Requiere la decisión de
   Xavi sobre qué proyecto de Vercel despliega qué directorio.
7. **Job `E2E`**: el OOM del servidor Expo web en el runner (`Ineffective mark-compacts near heap
   limit`, 17:18:00Z del run `44928298036`) tumbó el resto de specs del job (8 `tmp-*`, 3 `vfx-lab`,
   1 `outrun-baseline`). Con `NODE_OPTIONS=--max-old-space-size=8192` en `playwright.config.ts` el
   runner de 16 GB no aguanta las 40 pruebas en un solo servidor. No se ha tocado
   `playwright.config.ts` (sólo se añadiría `testIgnore` si los `tmp-*` agotasen el timeout de 20 min
   del job, cosa que **no** ha ocurrido: el job remoto tardó 12,0 min de los 20 disponibles).
8. **`tmp-*.spec.ts`**: los 8 ficheros siguen en el repositorio, sin `expect`, y siguen entrando en
   la ejecución por defecto (`--list` → 40 tests en 13 ficheros). Si se quieren sacar del job hay que
   añadir `testIgnore: "**/tmp-*.spec.ts"` en `playwright.config.ts`; no se ha hecho porque
   **no** reproducen ningún fallo por sí mismos y el job no agota su timeout.
9. **Estado del árbol de trabajo compartido**: durante esta sesión otra sesión de agente confirmó
   commits de *frogger* sobre la rama `chore/hitrun-1-1-validation` (el árbol de trabajo del
   repositorio lo comparten). Al terminar se ha rebasado la rama para que contenga únicamente los
   commits de esta misión sobre `master`.

## 9. Veredicto

**Validada con excepciones.**

Los cuatro criterios del ledger tienen evidencia de ejecución, con las siguientes excepciones:

1. **Criterio 1 (CI remota)**: los tres checks de `master` (`0e336039b`) están medidos — `CI`
   **failure**, `E2E` **failure**, `Documentation CI` **success**. Los dos fallos tienen causa
   identificada (sección 1) y el de Hit & Run (4 errores de `typecheck:app` + el escenario de
   oleada) está corregido y verificado en local (commit `d653454a3` y `d2357618e`; el escenario de
   oleada pasa **3/3**). La excepción es que **no se ha hecho push ni se ha abierto PR**, así que
   la CI remota de `master` sigue roja hasta que la rama se publique: el criterio 1 no puede
   cerrarse en remoto desde esta sesión.
2. **Criterio 2 (Vercel)**: el despliegue del HEAD de `master` está en `success`
   (`Deployment has completed`, entorno `Production`). Excepción: **no se ha podido leer el log**
   (`npx vercel inspect … --logs` → `Error: No existing credentials found. Please run 'vercel
   login' or pass "--token"`), así que la clasificación build/configuración/entorno del fallo
   histórico queda sin responder, y el desajuste `vercel.json` (raíz, app web) frente a
   `server/package.json` (`build: tsc`) queda como **HIPÓTESIS** a la espera de la decisión de Xavi.
3. **Criterio 3 (suites locales)**: verde en `jest src/games/hitandrun/__tests__` (23 suites / 81
   tests), `typecheck:core`, `typecheck:app` (tras el arreglo), `test:games:ci` (303 suites / 1624
   tests), `check:core-boundaries`, `check:input-contract`, `check:game-patterns`,
   `check:agent-guardrails` (antes del rebase de la rama) y los pasos de sprites/eslint/`turbo
   build`/`turbo lint`/`turbo typecheck` del workflow. Excepciones: `pnpm exec turbo run test` falla
   por `AsteroidsRoom.test.ts` (en `server/`, el mismo fallo que ya falla en `master` remoto) y por
   `BoltPerformance.test.ts:529` (aserción de tiempo de pared: 420 ms medidos frente a un
   presupuesto de 250 ms, verde en CI); `pnpm run ci` sigue en rojo por `check:ratchet`
   (`src/games/frogger/rendering/__tests__/FroggerSkiaPaints.test.tsx: as any=2 (baseline 0, +2)`),
   un fallo **preexistente en el HEAD de `master`** en un fichero de *frogger* que esta misión no
   toca; `docs:check` pasa tras rebasar la rama.
4. **Criterio 4 (contratos)**: revisado con fichero y línea (sección 5). Sin excepciones.

Excepción adicional, de entorno: la **suite E2E completa no puede terminar en este host de 8 GB**
(sección 3.3.2: un bundle tardó 546 532 ms, el servidor Expo llegó a 2,2 GB de RSS y 16 de los 40
tests no llegaron a ejecutarse). La medición autoritativa de la suite completa es el job remoto.
