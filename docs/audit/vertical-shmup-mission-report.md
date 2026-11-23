# Vertical Shmup — Mission report (boss & graze completion)

- **Date:** 2026-11-23
- **Branch:** `feat/shmup-boss-and-graze`
- **Base commit:** `5bb7b3303` (`master`)
- **Estado final:** todos los cambios están commiteados localmente; el hash más reciente se confirma con `git log --oneline --decorate -12` al cierre de la misión.

## A. Resumen

Se completaron las tareas T2–T7 sobre la rama, partiendo del commit base `5bb7b3303` y del trabajo previo T1 ya commiteado (`6ab641692`). El juego ahora tiene: un boss con HP propio, movimiento hover determinista y límites que no lo destruyen; waves de boss gobernadas por un único predicado; tres fases de ataque dependientes de HP con patrones distintos; economía de bombas con recompensas por graze y por kill de boss, con flags serializables y seguros ante rollback; y un anuncio de wave presentado en Canvas y Skia. Todo el código fue verificado con tests focalizados, typecheck estricto y los guardrails del repositorio. No se hizo push ni PR.

> Nota de idioma: el término usado en el código es `bomb economy` (economía de bombas).

## B. Estado por tarea

| Tarea | Estado | Evidencia |
|-------|--------|-----------|
| T1 — Fase de spiral por disparo | PASS (preexistente en la rama) | `6ab641692`; 9 tests en `VerticalShmupSpiralPattern.test.ts` |
| T2 — Comportamiento dedicado del boss | PASS | `e57b2ae27`; `VerticalShmupBoss.test.ts` (9 tests) |
| T3 — Fases de ataque por HP | PASS | `d3ddb0dd1`; `VerticalShmupBossPhase.test.ts` (9 tests) |
| T4 — Unificación de waves de boss | PASS | `16da384e3`; `VerticalShmupBossWaves.test.ts` (5 tests) + ajuste en `VerticalShmupTheme.test.ts` |
| T5a — Fix de tagging de projectiles | PASS | `bd93ce63f`; `VerticalShmupProjectileTagging.test.ts` (4 tests) |
| T5b — Recompensas de bombas | PASS | `250312420`; `VerticalShmupBombRewards.test.ts` (10 tests) |
| T6 — Anuncio de wave | PASS | `9ffa1b7b6` + `1da1d9018`; `VerticalShmupWaveAnnouncement.test.ts` (7 tests) y registro en ambos backends |
| T7 — Docs y verificación final | PASS (con fallos preexistentes documentados) | `d61645cca`; esta sección D |

No hay tareas BLOCKED por cambios de esta misión. Los comandos que fallan lo hacen por deuda preexistente en commit base o por el artefacto sin trackear `dist-e2e/`, ambos verificados y detallados en D y E.

## C. Commits locales

Hashes principales de la misión (el commit más reciente se confirma con `git log`):

| Hash | Mensaje |
|------|---------|
| `6ab641692` | `fix(shmup): advance spiral phase per shot` (T1, ya presente al iniciar) |
| `e57b2ae27` | `feat(shmup): add dedicated boss behavior` (T2) |
| `d3ddb0dd1` | `feat(shmup): add hp-based boss attack phases` (T3) |
| `16da384e3` | `fix(shmup): unify boss wave progression` (T4) |
| `bd93ce63f` | `fix(shmup): tag pooled projectiles with shmup component names` (T5a) |
| `250312420` | `feat(shmup): reward bombs from grazes and boss kills` (T5b) |
| `9ffa1b7b6` | `feat(shmup): add wave announcement presentation` (T6) |
| `1da1d9018` | `test(shmup): keep rendering mock typecasts at baseline` (T7, corrige regresión de ratchet propia) |
| `d61645cca` | `docs(shmup): document boss, waves, rewards and announcements` (T7) |
| `c561f739a` | `docs(shmup): add final mission report` (T7) |

## D. Verificaciones ejecutadas

| Comando | Resultado | Detalle |
|---------|-----------|---------|
| `cd src/games/vertical-shmup && npx jest --config jest.config.cjs --runInBand` | PASS | **17 suites / 98 tests** (línea base: 10 suites / 44 tests → +7 suites, +54 tests) |
| `pnpm run typecheck:app` | PASS | Sin errores; TypeScript estricto, sin `any`/`unknown` nuevos |
| `pnpm run test:games:ci` | FAIL (preexistente) | 312 suites / 1704 tests; 1703 pasan. Único fallo: `FlappyBirdGameplayPass.test.ts` → `adds NEAR_MISS_GLIDE_ENERGY...`. Reproducido en worktree limpio en `5bb7b3303` |
| `pnpm run check:agent-guardrails` | FAIL (preexistente) | `check:ratchet`: `FroggerSkiaPaints.test.tsx` tiene 2 `as any` con baseline 0. Reproducido en `5bb7b3303` |
| `pnpm run check:duplication` | FAIL (preexistente) | 1556 líneas duplicadas vs baseline 1545; idéntico valor en `5bb7b3303` |
| `pnpm run check:color-literals` | FAIL (preexistente) | 2 literales nuevos en `FroggerCanvasVisuals.ts` / `FroggerSkiaVisuals.ts`; idéntico en `5bb7b3303` |
| `pnpm run check:game-patterns` | FAIL (preexistente) | `[3a]` detecta `dist-e2e/_expo/static/js/web/entry-*.js`; directorio sin trackear desde el inicio, dejado intacto |
| `pnpm run story:lint` | PASS | 8 grafos/paquetes auditados, 0 errores |
| `pnpm run docs:check` | PASS | 16 módulos, 8 paquetes y referencias de CI verificadas |
| `pnpm run ci` | FAIL (preexistente) | `build:core` y `build:gameplay-kit` PASS; se detiene en el mismo `check:ratchet` de Frogger |

Guardrails que sí pasan dentro de `check:agent-guardrails`: `check:core-boundaries`, `check:gameplay-kit-boundaries`, `check:network-boundaries` e `input-contract`.

Los fallos preexistentes se confirmaron ejecutando los mismos comandos en un worktree detached en `5bb7b3303`, sin modificar la rama de trabajo.

## E. Riesgos y limitaciones

- **Balance del boss:** 250 HP a la wave 5 (≈30 s de duel con la cadencia actual). No se probó en dispositivo; la curva está aislada en `boss/bossMath.ts` para ajustarla sin tocar sistemas.
- **Tope de bombas:** las recompensas por encima de `BOMB_STOCK_MAX = 5` se descartan, no se acumulan para después (documentado en el contrato de bombas).
- **Hash de resimulación:** el hash de *mundo completo* diverge entre simulación normal y resimulación porque la presentación (juice/SFX) se suprime por diseño. Los tests comparan el hash del estado de gameplay, que es idéntico.
- **Fuera de alcance:** no se agregó puente de `shmup:wave_complete` a Story/StoryDirector.
- **Deuda ajena:** los guardrails de Frogger (typecasts, color literals), la duplicación y el artefacto `dist-e2e/` permanecen intactos; no se modificaron para maquillar resultados.

## F. Estado de Git

- Rama actual: `feat/shmup-boss-and-graze` (sincronizada localmente; `origin/feat/shmup-boss-and-graze` y `origin/master` siguen en `5bb7b3303`).
- `git status --short --branch`: `## feat/shmup-boss-and-graze` y `?? dist-e2e/` (único archivo sin trackear, sin tocar).
- No se hizo `push`, no se abrieron PRs, no se usaron `reset`, `clean` ni `rebase` destructivos.
- `git diff 5bb7b3303..HEAD --stat`: 36 archivos, 2042 inserciones, 57 borrados.
