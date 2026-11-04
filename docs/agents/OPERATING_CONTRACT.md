# Agent operating contract

This document defines the mandatory workflow for AI coding agents and human contributors working in ArcadeGames. It complements the architecture reference in `AGENTS.md`; it does not replace it.

## 1. Establish the real contract before editing

1. Read the root `AGENTS.md`, this document, and any nearer `AGENTS.md` files that apply to the files being changed.
2. Inspect the implementation, public exports, types, callers, tests, and relevant entries in `docs/agents/`. Do not infer an API from a single error message, a stale issue, or a previous agent's summary.
3. Identify the owner of the contract. For shared APIs, inspect both producers and consumers, including serialization/deserialization, adapters, runtime boundaries, and both Canvas and Skia implementations where applicable.
4. Record assumptions explicitly. If the runtime value contradicts its TypeScript type, trace the boundary that introduced the mismatch; do not change the canonical type merely to silence the exception.

### Important example: Input.actions

The canonical declaration in `packages/core/src/input/CanonicalInput.ts` is a sorted, readonly array of `CanonicalActionName`, not a `Set`. `hasInputAction` using `.some()` matches that contract. An error such as `actions.some is not a function` means a runtime value violated the declared shape; it is not evidence that the canonical API should be migrated to `Set`. Trace the producer, test fixture, cast, and conversion boundary first. Update the types ledger and all consumers only when a deliberate contract change is justified.

## 2. Fix causes, not symptoms

For every defect:
1. Reproduce it with the smallest relevant test or check.
2. State the root cause and the boundary where the invalid state entered.
3. Add or strengthen a regression test before or alongside the fix.
4. Fix the owning abstraction instead of adding game-specific workarounds.
5. Do not hide failures with broad `catch` blocks, silent `null` fallbacks, permissive casts, skipped tests, or global Jest transforms.
6. If a temporary exception is unavoidable, document its scope, reason, owner, and removal condition.

A recurring failure class must produce an executable guard: a type check, unit/integration test, architecture rule, asset validator, or required CI check. Documentation alone is not sufficient.

## 3. Respect architectural boundaries

- Keep `packages/core` platform-agnostic. Do not pull React Native, Expo, Skia, game-specific code, or transport implementations into Core.
- Keep gameplay simulation independent from rendering/theme implementation details. Cross the boundary through typed data, events, or presentation contracts.
- Keep Canvas and Skia backends independently loadable. Canvas tests must not import Skia accidentally; do not make tests pass by indiscriminately transforming all of `node_modules`.
- Keep asset declaration, path validation, resource resolution, and resource loading as distinct lifecycle stages. Explain null asset references rather than muting them.
- Preserve deterministic simulation: seeded gameplay randomness, fixed timestep, and no mutable gameplay state hidden in system instance fields.

## 4. Change shared contracts deliberately

When changing an exported type, input shape, event, component, asset schema, theme role, renderer contract, or lifecycle API:
- Search for all producers and consumers before editing.
- Inspect serialization, hydration, network, prediction/rollback, and test fixtures as relevant.
- Update canonical declarations, adapters, tests, docs, and `docs/agents/types-ledger.md` where applicable.
- Add tests for valid, empty, missing, and malformed boundary values where those states are part of the contract.
- Avoid competing representations unless an explicit adapter and migration plan exist.

## 5. Required verification

Run targeted tests while iterating, then run the relevant full checks before declaring work complete:

| Command | Purpose |
| --- | --- |
| `pnpm run check:agent-guardrails` | Shared contract, boundary, ratchet, pattern, and story guards |
| `pnpm run ci` | Build, repository guardrails, API docs check, and application typecheck |
| `pnpm run test:ci` | Complete Jest project suite |
| `pnpm run test:games:ci` | Game unit and regression suites |
| `pnpm run sprites:validate` | Sprite catalog paths and metadata |
| `pnpm run sprites:build -- --check` | Generated sprite artifacts are up to date |

GitHub Actions must run repository guardrails, tests, and typechecks on pull requests. If the local environment prevents a command from running, report the exact command and reason. Never describe an unexecuted check as passing. Do not suppress a failing test or narrow coverage solely to obtain a green run.

## 6. Definition of done

A change is complete only when:
- The root cause and affected contract are described.
- A regression test or executable guard prevents the same failure class from returning.
- Existing callers and relevant platforms/backends have been checked.
- Required checks have actually run, with pass/fail status reported.
- Relevant ledgers and agent-facing instructions are updated.
- The pull request explains the cause, prevention mechanism, and remaining limitations.

## 7. Regression patterns to remember

These are observed failure classes from the 2026-11-03 logs. They are evidence for where to investigate, not permission to assume the same cause in a future incident.

| Failure pattern | What agents must verify | Prevention expected |
| --- | --- | --- |
| `actions.some is not a function` | `CanonicalInputState.actions` is a readonly array. Trace the runtime producer/fixture; do not assume Set. | Contract check, typed boundary, regression test for the producer/conversion path. |
| React Native Flow or Skia ESM parse error in headless Jest | Trace the import chain; do not let Canvas-only tests load Skia or unrelated native APIs. | Isolated backend/platform modules and focused Jest tests. |
| Syntax errors in test sources | Fix the first parser error and retain the tests. | Full Jest projects run in CI. |
| `JuiceOrchestrator is not defined` during game registration | Verify the canonical export/import and lifecycle wiring. | Application typecheck plus game initialization/SmokeTest. |
| SpriteRegistry `imageSource === null` | Distinguish Jest's asset resolution from actual runtime asset loading. | Sprite metadata/path validation plus resource-resolution tests; never silence nulls. |
| Missing Theme color roles | Decide which roles are required/optional and verify fallback behavior. | Theme contract tests; do not add arbitrary aliases just to remove warnings. |
| Local `Transform` mutation leaves `worldX/worldY` stale | Verify every writer that changes local transform fields marks `dirty = true` before the `Transform` phase; `HierarchySystem` refreshes cached world coordinates only for dirty transforms. Respawns performed after the Transform phase must synchronize the root player's cache in the same tick. | `FroggerLifecycle.test.ts` covers discrete jumps, log carry, and respawn; `galaxian-gameplay-regression.test.ts` covers player movement, respawn and both projectile types. Run `pnpm exec jest --runInBand src/games/frogger/__tests__/FroggerLifecycle.test.ts` and `pnpm exec jest --runInBand src/games/galaxian/__tests__/galaxian-gameplay-regression.test.ts`. |
| Galaxian can advance a level without starting the next wave | Wait for deferred enemy removals; require a valid formation/configuration for spawning; a failed spawn must retain the same transition instead of incrementing level again. Reset dive scheduling when the next formation is created. | `galaxian-gameplay-regression.test.ts` clears every first-wave enemy, verifies the 1.5s transition, checks the second-wave dive lifecycle, and covers stale counters/missing formation. Run `pnpm exec jest --runInBand src/games/galaxian/__tests__/galaxian-gameplay-regression.test.ts`. |

For every recurrence, add the confirmed root cause, exact regression test/guard, and CI command here. Do not record speculative explanations as facts.

## 8. Keep policy maintainable

`AGENTS.md` and this document are the source of truth. Tool-specific instruction files must remain short pointers; do not copy architecture rules into independently maintained documents.
