# Technical-debt quality audit — 2026-11-04

## Scope and evidence

This audit inspects the repository files on `master` on 2026-11-04. Baseline JSON files were parsed directly. The JSCPD scanner and project tests were **not executed in the local analysis environment**, so the figures below are committed baseline values, not fresh scanner results.

## F0 — Baseline snapshot

### Code duplication

Source: `scripts/duplication-baseline.json`.

| Metric | Committed value |
| --- | ---: |
| Duplicated lines | 2,164 |
| Clone pairs | 243 |
| Duplication ratio | 1.57% |
| Scanned lines | 137,609 |

The existing `scripts/duplication-ratchet.ts` already creates `report/jscpd-report.json`, writes a folder/category breakdown and top-10 clone table to the GitHub Actions summary, and prints the top 15 clones when the ratchet fails. A new clone classifier is therefore unnecessary. This branch adds a CI artifact upload for the JSON and Markdown reports so the actual clone pairs can be inspected after the workflow completes.

### Type assertions

Source: `scripts/typecast-baseline.json`.

| Metric | Committed value |
| --- | ---: |
| Files with assertions | 196 |
| `as any` | 640 |
| `as unknown` | 223 |
| Total | 863 |

Excluding test and mock paths leaves **231 runtime assertions in 106 files**: 65 `any` and 166 `unknown`. Largest runtime clusters:

| File | any | unknown | Total |
| --- | ---: | ---: | ---: |
| `src/games/shared/rendering/SharedVFX.ts` | 2 | 22 | 24 |
| `src/games/geometrywars/scenes/GeometryWarsGameScene.ts` | 0 | 9 | 9 |
| `packages/renderer-canvas/src/CanvasRenderer.ts` | 0 | 7 | 7 |
| `packages/gameplay-kit/src/combat/systems/CombatSystem.ts` | 0 | 6 | 6 |
| `packages/core/src/physics/systems/PlatformerMovementSystem.ts` | 0 | 5 | 5 |
| `packages/core/src/runtime/NullBaseGame.ts` | 0 | 5 | 5 |

These are audit candidates, not automatic refactoring targets. Each type boundary needs to be inspected before changing the API or replacing a cast.

### Determinism guard

The original AST linter scans `packages/core/src` and `src/games`, but applies the time/randomness and iteration checks only below `systems/` and `simulation/`. It does not scan `packages/gameplay-kit/src`, and root-level names such as `EntityFactory.ts` are outside those path rules. Its test exclusion also omitted `.spec.ts(x)` files and mock folders.

This branch expands the deterministic source scope to:
- all production TypeScript under `packages/gameplay-kit/src`;
- `systems/`, `simulation/`, `factory(s)/`, `blueprint(s)/` and `entities/` paths;
- root-level files whose names include `Factory` or `Blueprint`;
- `Math.random()` checks in game `rendering/` and `presentation/` paths, where visual randomness must use an injected `world.renderRandom`.

The clock rules remain limited to deterministic gameplay/simulation sources, avoiding false positives from render timing and UI instrumentation. Tests and mocks are excluded consistently. Structural-mutation checks remain limited to systems and simulation, because factories legitimately create and initialize entities.

### Test inventory

The root `jest.config.cjs` already registers Jest projects for all 16 game modules, as well as core, gameplay-kit, renderers, networking and server. The existence of those projects is not proof of equivalent test depth; per-game assertions and coverage still need a separate inventory. The earlier hypothesis that the newer games lack dedicated Jest projects is not supported by the current root configuration.

### Stale findings corrected by live source

- `src/games/vertical-shmup/EntityFactory.ts` currently obtains its generator from `world.gameplayRandom`; the older audit note claiming that this factory still calls `Math.random()` is stale.
- `src/utils/SeedUtils.ts` currently contains seed formatting, parsing and validation functions, with no TODO markers.

## Work started in this branch

1. Added a testable path-classification module and regression tests for gameplay systems, factories, blueprints, gameplay-kit, test/mocks exclusion and the separation of structural-mutation rules.
2. Expanded the AST linter's source coverage, including seeded-RNG enforcement in game rendering/presentation code.
3. Removed the implicit `Math.random()` fallback from `computeMotionSecondaryEffect`; all non-empty effects now require an injected RNG. Added seeded regression tests for flame, exhaust-smoke and dust-trail geometry.
4. Changed `SpawnRequest.args` from `Record<string, any>` to `Record<string, unknown>` and removed its redundant `as any` call-site assertion in `SpawnDirectorSystem`.
5. Added the classification test command to ECS Sentinel CI.
6. Added a 14-day workflow artifact for the raw JSCPD JSON/Markdown reports.
7. Updated the PRD to describe the expanded deterministic guard.

## Remaining phases

| Phase | Status | Next evidence required |
| --- | --- | --- |
| F0 — Baseline and clone map | Partial | Run JSCPD and inspect the uploaded clone report; committed baseline alone does not identify the actual clone pairs. |
| F1 — Determinism coverage | Implemented in branch; unverified | ECS Sentinel test + AST linter results. |
| F2 — Type assertion reduction | Partially implemented; verification pending | One unsafe `as any` assertion was removed from `SpawnDirectorSystem`; the baseline remains unchanged until the scanner confirms the reduction. Continue with high-impact runtime candidates only after contract inspection. |
| F3 — Duplication reduction | Pending | Rank the actual JSCPD clone pairs by duplicated lines and semantic relationship. |
| F4 — Test-depth alignment | Inventory pending | Compare assertions/coverage per game, not merely Jest project existence. |
| F5 — Documentation alignment | Partial | Reconcile remaining historical wiki/audit claims with live code and CI evidence. |

Do not update any debt baseline until the corresponding scanner has run after the remediation and confirmed a real reduction.
