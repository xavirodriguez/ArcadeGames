# Registro histórico de documentación retirada

> **Propósito.** Archivo único de decisiones, auditorías y planes de ejecución que ya no
> son guía vigente. Está aquí para que los agentes **no vuelvan a reabrir** preguntas ya
> resueltas y para conservar la traza de *qué se hizo, cuándo y por qué*.
>
> **Regla para agentes.** Si una decisión aparece aquí, trátala como **cerrada**. No
> reintroduzcas su plan, sus cifras ni sus "tareas pendientes" en documentos activos.
> Si necesitas el texto completo de un documento retirado, use el comando de la entrada
> (el contenido íntegro sigue disponible en el historial de git).

## Cómo recuperar el contenido original

```bash
git show <SHA>:<ruta>
# p. ej. git show fc950387e:PROGRESO_REFACTOR.md
git log --follow -- <ruta>   # historial completo del archivo
```

Cada entrada indica el último SHA que contuvo el archivo antes de su retiro. Los SHA
son abreviados pero suficientes para `git show`.

---

## Índice

| # | Tema | Documentos retirados | Fuente de verdad actual |
| --- | --- | --- | --- |
| 1 | Refactorización y tipos | `PROGRESO_REFACTOR.md`, `FASE5_CIERRE.md`, parte de `type-safety-phase5-investigation.md` | `docs/agents/types-ledger.md`, `docs/TECHNICAL_DEBT_RATCHETS.md` |
| 2 | Sprites | `docs/SPRITE_READINESS_AUDIT.md` | `docs/sprites-baseline.md`, `docs/SPRITE_SYSTEM_AGENT_GUIDE.md` |
| 3 | Out Run | `docs/OUTRUN_IMPLEMENTATION_QUALITY_AUDIT.md`, tabla de fases de `OUTRUN_ARTWORK_IMPLEMENTATION.md` | `docs/OUTRUN_JAVASCRIPT_RACER_EVOLUTION_ROADMAP.md` §14 |
| 4 | Juice / hit-stop | `docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md` | `docs/agents/juice-consolidation-ledger.md`, `docs/architecture/GAME_FEEL_ARCHITECTURE.md` |
| 5 | E2E de Hit & Run | `docs/agents/HITANDRUN_E2E_ACTION_PLAN.md`, 5 logs Phase 1.1 | `docs/audit/2026-11-22-hitrun-phase-1.1-execution-evidence.md` |
| 6 | Rollout de presentación | 4 auditorías `2026-10-30-presentation-*` | `docs/specs/adr-002-presentation-architecture.md` |
| 7 | VFX / PixelFX / deuda técnica | 5 documentos | `docs/agents/pixelfx-vfx-quality-ledger.md`, `docs/specs/pixelfx-integration.md`, `scripts/*-baseline.json` |
| 8 | Vertical Shmup | `2026-10-23-vertical-shmup-internal-structure-audit.md` | `docs/audit/vertical-shmup-*-contract.md` |
| 9 | Auditorías informales antiguas | `2025-03-05-campaign-repair.md`, `2026-10-03-roadmap-execution.md`, `docs/sound-kit-progress.md` | `docs/sound-kit-final.md` |
| 10 | Samurai / sumi-e | checklist, `samurai-painted/*`, nota de implementación | `docs/hitandrun/COMBAT_SYSTEM_V1.md`, `docs/sumi-e/ART_BIBLE.md` |
| 11 | Diseño de color | `color-literals-allowlist-proposal.md` | `scripts/color-literals-ratchet.mjs` (`COLOR_LITERAL_ALLOWLIST`) |
| 12 | Notas de juegos | 4 archivos de asteroides / hitandrun / space-invaders | ver cada entrada |
| 13 | Duplicados y archivos vacíos | copia duplicada de arte tower-defense, `AsteroidsGame.tail.md` | ver cada entrada |

---

## 1. Refactorización y tipos

### `PROGRESO_REFACTOR.md` (retirado; último SHA `fc950387e`, 2026-11-18)

- **Qué era:** inventario de avances P0.1→P2.9 de una sesión de refactorización, con un
  SHA de checkout y una pregunta abierta ("¿Priorizas aplicar las release-tags de P1.6?").
- **Por qué quedó obsoleto:** el SHA que declara (`45837f35…`) quedó **144 commits por
  detrás** de HEAD; la última sección es una decisión en vivo, no documentación durable.
- **Conclusión durable:** los ítems completados sí se verificaron en su momento (stub PNG
  de Jest, `as unknown` eliminado de `ShmupJuiceHelpers`, `@deprecated` en
  `UnifiedInputSystem`) y no deben rehacerse. La pregunta de release-tags está cerrada:
  el estado de los rótulos se mide en `docs/TECHNICAL_DEBT_RATCHETS.md`.
- **Recuperar:** `git show fc950387e:PROGRESO_REFACTOR.md`

### `FASE5_CIERRE.md` (retirado; último SHA `745d14a93`, 2026-11-20)

- **Qué era:** cierre de la rama `chore/tipos-fase5` con mediciones de la Fase 5
  (Tarea A firma de `emitDeferred`, Tarea B spike de `Entity` branded, Tarea C
  `noUncheckedIndexedAccess`).
- **Por qué quedó obsoleto:** informe de rama con artefactos de shell al final (`EOF`,
  `echo done`); sus conclusiones están incorporadas en la sección 6 de
  `docs/type-safety-phase5-investigation.md`, que ahora apunta aquí.
- **Conclusión durable — no reabrir:**
  - `EventBus.emitDeferred` **ya es genérico** sobre `CombinedEvents<TEvents>`. La
    afirmación de que "acepta `string`" era **falsa**.
  - Branded `EntityId`: **descartado**. El spike dio **1689 errores**; `Entity` es un
    `number` empaquetado y no debe migrarse "por limpieza".
  - `noUncheckedIndexedAccess`: **no aplicado** al núcleo; el spike dio **689 errores**.
  - Sí queda un problema adyacente documentado, no corregido: casts a `EventBus` no
    genérico en `BaseGameStateSystem`, `CombatSystem`, `SpawnDirectorSystem`,
    `AchievementSystem`, `HitRunCombatSystem` y `StoryDirectorSystem`.
- **Recuperar:** `git show 745d14a93:FASE5_CIERRE.md`

### `docs/type-safety-phase5-investigation.md` (recortado; se conserva la sección 6)

- **Qué se recortó:** las secciones 1–5 (investigación inicial) y los artefactos de shell.
- **Por qué:** la investigación original afirmaba que no había evidencia para un spike de
  branded types; el spike posterior la refutó con 1689 errores.
- **Conclusión durable:** ver el apartado `FASE5_CIERRE.md` anterior. El documento vivo
  conserva solo el estado final y el puntero aquí.

---

## 2. Sprites

### `docs/SPRITE_READINESS_AUDIT.md` (retirado; último SHA `fda3704d7`, 2026-10-29)

- **Por qué quedó obsoleto:** afirmaba que `ghost_galleon`, `lancero` y
  `oni_red` "no están listos / no existen". En la actualidad `SpriteRegistry.ts` registra
  `ghost_galleon` y `lancero`, y `oni_red` se sirve como `enemy2.png` (commit `399e62ed5`,
  mismo día que el informe). El propio `SPRITE_SYSTEM_AGENT_GUIDE.md` ya advertía:
  *"may lag; trust code"*.
- **Conclusión durable:** el inventario de hojas es `docs/sprites-baseline.md` (18 + 3 = 21
  hojas). No hay que reauditar la "disponibilidad" de `ghost_galleon`, `lancero` ni
  `oni_red`.
- **Recuperar:** `git show fda3704d7:docs/SPRITE_READINESS_AUDIT.md`

---

## 3. Out Run

### `docs/OUTRUN_IMPLEMENTATION_QUALITY_AUDIT.md` (retirado; último SHA `c1d2b1f87`, 2026-10-15)

- **Por qué quedó obsoleto:** declaraba que Canvas y Skia compartían `resolveSegmentFog`.
  Esa función fue eliminada en el commit `315fb5554` (2026-11-21) porque solo la usaban
  sus tests. También citaba 6 suites / 70 tests, frente a 19 suites / 157 tests actuales.
- **Conclusión durable:** el render de Out Run usa `NEAR_PLANE = 0.5` y laniebla se resuelve
  con `fogIntensity` + `resolveRoadFogColor` en `OutrunFog.ts`. Estado canónico:
  `docs/OUTRUN_JAVASCRIPT_RACER_EVOLUTION_ROADMAP.md` §14.
- **Recuperar:** `git show c1d2b1f87:docs/OUTRUN_IMPLEMENTATION_QUALITY_AUDIT.md`

### Tabla de fases/PR de `src/games/outrun/OUTRUN_ARTWORK_IMPLEMENTATION.md`

- **Qué se recortó:** la tabla de rollout (PR #838–#856, "Fase 9 … PR Actual") y las notas
  de integración por fase. Se conserva la sección de arquitectura de mods.
- **Por qué:** la tabla dejó de actualizarse — aparece un mod `motorcycle/` no documentado
  — y los números de PR no son fuente de verdad.
- **Conclusión durable:** los mods de Out Run se registran en código; la sección de
  arquitectura del propio archivo sigue siendo válida.

---

## 4. Juice / hit-stop

### `docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md` (retirado; último SHA `af9e6183f`, 2026-11-05)

- **Por qué quedó obsoleto:** sus premisas fueron desmentidas por
  `docs/agents/juice-consolidation-ledger.md`:
  - afirmaba que `ArkanoidCollisionSystem` escribía `GameplayFreeze` directamente →
    **0 referencias**; usa `triggerEvent(...)` → `requestHitStop`.
  - afirmaba que `HitStopSystem` guardaba un temporizador propio → `hitStopTimer` **no
    existe**; `GameplayFreeze` es el único reloj de duración.
  - proponía una heurística de shake `> 10` → **eliminada**.
  - el ledger marca F0–F4 como **HECHA / completada** (estado real a 2026-11-10).
- **Conclusión durable:** la propiedad de `GameplayFreeze` y la política de hit-stop
  viven en `docs/architecture/GAME_FEEL_ARCHITECTURE.md` y
  `docs/specs/adr-002-rollback-safe-gameplay-freeze.md`. No reintroducir temporizadores
  paralelos ni escrituras directas de freeze desde sistemas de combate.
- **Recuperar:** `git show af9e6183f:docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md`

---

## 5. E2E de Hit & Run

### `docs/agents/HITANDRUN_E2E_ACTION_PLAN.md` (retirado; último SHA `1269334d2`, 2026-11-21)

- **Por qué quedó obsoleto:** plan de ejecución de una sola sesión, sin dueño ni estado.
  Sus pasos ya están ejecutados: `fireHeld` se escribe siempre
  (`mutateBeltInputState.ts`), el logging de PAGEERROR existe en `e2e/hitandrun.spec.ts`,
  los sondeos de 22 s pasaron a 8 s y el arreglo de olas se integró en `16123807e`. Las
  instrucciones que quedaban (quarantina, exclusión de CI, hook `window.__test.step`) no
  existen en el código y serían activamente engañosas.
- **Conclusión durable:** la evidencia de ejecución canónica es
  `docs/audit/2026-11-22-hitrun-phase-1.1-execution-evidence.md`.
- **Recuperar:** `git show 1269334d2:docs/agents/HITANDRUN_E2E_ACTION_PLAN.md`

### Los 5 logs de Phase 1.1 del 2026-11-06 (retirados)

`2026-11-06-hitrun-phase-1.1-death-recovery.md` (`0e0649a61`),
`-final-validation.md` (`bfd5380d1`), `-gameplay-e2e.md` (`547879cc1`),
`-hit-reaction.md` (`e24072410`), `-verification.md` (`ffba8fe38`).

- **Por qué:** son logs por PR (PR6–PR9) de una rama de integración. El propio
  `final-validation` ya decía *"Estado actualizado: ver 2026-11-22-…execution-evidence.md"*.
  PR #1216 está fusionado.
- **Conclusión durable:** el documento del 2026-11-22 sustituye a los cinco en cuanto a
  evidencia de ejecución; no hay que reconstruir el orden PR6→PR9.
- **Recuperar:** `git show <SHA>:docs/audit/<nombre>.md`

---

## 6. Rollout de presentación (zona ADR-002)

Retirados: `2026-10-30-hitrun-canvas-skia-migration-gate.md` (`45de89a7c`),
`-presentation-legacy-retirement.md` (`1f8492bc7`),
`-presentation-roadmap-baseline.md` (`7e290b87f`),
`-presentation-roadmap-execution-status.md` (`45de89a7c`).

- **Por qué:** son registros de una puerta de migración ligada a PR #995 y a la rama
  `refactor/presentation-hitrun-entities`: IDs de ejecución de CI, matrices de fases y
  estados de "no fusionado todavía". El código fusionado es la verdad actual:
  `PresentationThemeRegistry` y los painters Canvas/Skia existen.
- **Conclusión durable:**
  - `ThemeRegistry.setActiveTheme` **no existe**; `activateHitAndRunTheme` queda como
    alias puro en `mods/registry.ts`.
  - `AestheticThemeTokens` todavía no tiene consumidor de producción, por lo que el
    estado "migración en curso" de `adr-002-presentation-architecture.md` sigue siendo
    correcto.
  - `2026-10-29-presentation-phase1-inventory.md` se conserva como trasfondo citado por
    ADR-002, pero es un snapshot: sus decisiones ya están ejecutadas.
- **Recuperar:** `git show <SHA>:docs/audit/<nombre>.md`

---

## 7. VFX / PixelFX / deuda técnica

| Documento | Último SHA | Motivo |
| --- | --- | --- |
| `docs/audit/2026-11-04-technical-debt-quality-audit.md` | `14d23f8d7` | Snapshot de métricas con scanners **no ejecutados**; las cifras vivas están en `scripts/*-baseline.json`. Su 1.57% se mezcló por error en `TECHNICAL_DEBT_RATCHETS.md`. |
| `docs/audit/2026-11-06-vfx-visual-quality-phase-1-audit.md` | `a6fdd1094` | Se autodenomina "baseline actual" pero los registros vivos son `pixelfx-vfx-quality-ledger.md` y `vfx-ledger.md` (2026-11-17). |
| `docs/audit/PIXELFX_INTEGRATION_AUDIT.md` | `57e737c9a` | Snippet de spike: "assets aún no registrados". Hoy `PixelFXCatalog.ts` y la spec son la verdad. |
| `docs/roadmaps/PIXELFX_INTEGRATION_ROADMAP.md` | `57e737c9a` | "Done — contracts + spike"; el resto se sigue en la spec y el ledger. |
| `docs/roadmaps/2026-11-lancero-presentation-space-invaders.md` | `de7fc465c` | Matriz PR-B/C/D de un momento dado: `presentOnly` nunca se implementó y las escrituras directas de `GameplayFreeze` siguen en `SpaceInvadersCollisionSystem.ts`. El trabajo vivo está en game-feel v2. |

- **Conclusión durable:** no reauditar el estado de integración PixelFX ni el catálogo de
  draws. El catálogo actual tiene **59 drawers** (los "17", "20", "27", "39" que aparecen
  en specs antiguas son conteos históricos). Las specs `vfx-*` se conservan por sus
  contratos, no por sus cifras.
- **Recuperar:** `git show <SHA>:<ruta>`

---

## 8. Vertical Shmup

### `docs/audit/2026-10-23-vertical-shmup-internal-structure-audit.md` (retirado; `9638ee208`)

- **Por qué:** auditoría de la rama `feat/vertical-shmup-tdd-suite` con hallazgos
  "pendiente de validar". La implementación se completó entre el 16 y el 23 de noviembre
  (p. ej. `EnemyArchetypes.ts` existe).
- **Conclusión durable:** los contratos vivos son los cuatro documentos
  `docs/audit/vertical-shmup-{collision-matrix,bomb-contract,graze-contract,boss-and-waves}.md`,
  todos marcados como *Implemented*. El informe de misión `(mission-audit / mission-report)`
  se conserva: es la evidencia de la rama actual.
- **Recuperar:** `git show 9638ee208:docs/audit/2026-10-23-vertical-shmup-internal-structure-audit.md`

---

## 9. Auditorías informales antiguas

| Documento | Último SHA | Motivo |
| --- | --- | --- |
| `docs/audit/2025-03-05-campaign-repair.md` | `8edb69406` | El contenido más antiguo del repositorio: verificación de bugs de campaña ya corregidos. Propósito agotado. |
| `docs/audit/2026-10-03-roadmap-execution.md` | `207565dcc` | Matriz de smoke-tests y resultados de comandos de un checkout concreto. |
| `docs/sound-kit-progress.md` | `aeb5b22f7` | Estado de una sesión ("Branch: `jules-162258…`", items 17–22 en `pending`) mientras `sound-kit-final.md` declara misión completada al 100%. |

- **Conclusión durable:** el sound kit terminó; `docs/sound-kit-final.md` y
  `docs/sound-kit-decisions.md` son el registro cerrado (mono SFX, ruta `/sound-lab`, WAV
  canónico, `RENDER_VERSION = 0.3.1`).
- **Recuperar:** `git show <SHA>:<ruta>`

---

## 10. Samurai / sumi-e

### `docs/hitandrun/SAMURAI_ENEMY_PR_CHECKLIST.md` (`72c05905d`) y
### `docs/hitandrun/SAMURAI_ENEMY_IMPLEMENTATION.md` (`d35d64347`) — retirados

- **Por qué:** checklist con 7 casillas sin marcar y aviso de "trabajo pendiente" cuando el
  arquetipo, el sprite, las animaciones y los tests están implementados (cableado en
  `HitRunEnemyPool.ts`). La nota de implementación tiene una sección "Validación
  pendiente" de una rama ya fusionada.
- **Conclusión durable:** el contrato técnico vivo es `docs/hitandrun/COMBAT_SYSTEM_V1.md`;
  la dirección de arte es `docs/sumi-e/ART_BIBLE.md` + el brief por juego.
- **Recuperar:** `git show 72c05905d:docs/hitandrun/SAMURAI_ENEMY_PR_CHECKLIST.md`

### `docs/hitandrun/assets/samurai-painted/README.md` y `provenance.md` (retirados; `a6914c082`)

- **Por qué:** registro de un candidato artístico **descartado** ("no Sumi-e, no fusionar",
  QA FAIL en paleta, rellenos puros y presupuesto de archivos) de una sesión cerrada.
- **⚠️ Bloqueo que NO debe reabrirse:** el asset `samurai-painted` tiene **licencia
  desconocida**; el propio registro decía que *"no puede aprobarse, publicarse ni
  distribuirse"*. No reintroducirlo en el juego ni en los sprites publicables. El manifest
  del directorio apunta ahora a esta sección del registro histórico.
- **Recuperar:** `git show a6914c082:docs/hitandrun/assets/samurai-painted/README.md`
  y `git show a6914c082:docs/hitandrun/assets/samurai-painted/provenance.md`

---

## 11. Diseño de color

### `docs/design-system/color-literals-allowlist-proposal.md` (retirado; `d1fd8dd6e`)

- **Por qué:** proponía usar `PROPOSED_ALLOWLIST` de `scripts/color-literals-ratchet.mjs`.
  Ese símbolo **no existe**; la implementación exporta `COLOR_LITERAL_ALLOWLIST`. La
  propuesta quedó resuelta por el código.
- **Conclusión durable:** la allowlist viva está en el script. No recrear la propuesta.
- **Recuperar:** `git show d1fd8dd6e:docs/design-system/color-literals-allowlist-proposal.md`

---

## 12. Notas de juegos

| Documento | Último SHA | Conclusión durable |
| --- | --- | --- |
| `src/games/asteroids/mods/iceberg/FRACTURE_WIRING.md` | `bb474750d` | Nota de 7 líneas con "Status: applied". El cableado está en `IcebergGameplayMod.ts` y `AsteroidCollisionSystem.ts`, cubierto por `DecoupledVisualMods.test.ts`. |
| `src/games/hitandrun/HITANDRUN_AESTHETIC_GUIDELINES.md` | `52a098519` | Dirección v1.0 "Neo-Retro Military Pop / Metal Slug" **supersedida**. La dirección actual es belt-scroll fantasy (`src/games/hitandrun/README.md` + `THEMING.md`, mods `fantasy` y `sumi-e`). |
| `src/games/space-invaders/PHASE_0_1_AQUI_HAY_DRAGONES.md` | `0aebc057c` | Checklist de fases 0–4 del pack "Aquí hay dragones". Todo implementado en `mods/nautical/` con paridad Skia; cubierto por `AquiHayDragonesConceptPack.test.ts`, `NauticalPhase3.test.ts` y `NauticalPhase4.test.ts`. |
| Parte de `src/games/outrun/OUTRUN_ARTWORK_IMPLEMENTATION.md` | — | Ver sección 3 de este registro. |

- **Recuperar:** `git show <SHA>:<ruta>`

---

## 13. Duplicados y archivos vacíos (eliminados, sin contenido que archivar)

- `src/games/asteroids/AsteroidsGame.tail.md` (`c18b50dca`) — **0 bytes**.
- `src/games/tower-defense/ART_DIRECTION_SUMI_E.md` — copia **byte-idéntica** a
  `docs/tower-defense/ART_DIRECTION_SUMI_E.md` (mismo SHA-256). El README del juego enlaza
  la copia de `docs/`; esa es la canónica.

---

## 14. Recortes recientes aplicados a documentos vigentes

Estas líneas se retiraron de documentos que se conservan; se listan aquí para que nadie
las reintroduzca:

- `docs/SPRITE_SYSTEM_AGENT_GUIDE.md`: referencia a `SPRITE_READINESS_AUDIT.md`.
- `docs/agents/juice-consolidation-ledger.md`: mención de una "discrepancia" con
  `JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md` §3.2 (ya no existe ese documento).
- `docs/audit/vfx-architecture-audit.md`: afirmación de que los assets PixelFX "no están
  registrados".
- `docs/audit/2026-11-22-hitrun-phase-1.1-execution-evidence.md`: puntero al
  `final-validation` retirado.
- `docs/TECHNICAL_DEBT_RATCHETS.md`: cifras 147.867 líneas y 196 archivos (correctas:
  150.481 y 194); el par 1.57% / 1.50% provenía de la auditoría retirada del 2026-11-04.
  Se sustituyó por 1.03% → 0.93% y se actualizó el guard que lo exigía en
  `scripts/docs-check.mjs`, para que la validación no reintroduzca el valor viejo.
- `docs/ECHO_RUNNER_PIXEL_ART_RESTORATION.md`: rejilla "12×16" (la real es 16×20, según
  `EchoRunnerPixelArt.test.ts`).
- `src/games/shared/README.md`: lista de carpetas `arcade/`, `combat/`, `spawn/`, `types/`
  que ya viven en `packages/gameplay-kit/`.
- `src/games/galaxian/GALAXIAN_ARTWORK.md` y `src/games/outrun/OUTRUN_ARTWORK.md`:
  referencias a `GALAXIAN_PROMPT.md` / `OUTRUN_PROMPT.md`, que no existen.
- `src/games/hitandrun/README.md`: rama `feature/belt-brawler-fantasy`, inexistente.
