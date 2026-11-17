# Hit & Run — Walkable Depth Ledger

Updated: 2026-11-17

## Contract

- `walkableDepth.min/max` are inclusive world-space pixel coordinates on `Transform.y`.
- The authored level definition is the source of truth for new levels.
- `DEFAULT_BELT_MOVEMENT_CONFIG.depthMin/depthMax` remain a compatibility fallback only when a level omits `walkableDepth`.
- Invalid explicit ranges fail during config resolution instead of silently falling back.
- Rendering must consume the same resolved config in a later unit; this PR does not claim visual parity with the floor artwork yet.

## Work ledger

| Unit | Status | Scope | Evidence / remaining work |
|---|---|---|---|
| U1 — Level data contract and gameplay resolution | implemented-unverified | Added `walkableDepth` to `level-01.json`; added a pure resolver; Hit & Run resolves the selected built-in/custom level before `registerBeltSystems`. | `src/games/hitandrun/levels/level-01.json`; `src/games/hitandrun/belt/BeltWalkableDepth.ts`; `src/games/hitandrun/HitAndRunGame.ts`. Added unit/integration coverage in `src/games/hitandrun/belt/__tests__/BeltWalkableDepth.test.ts`. The focused test and typecheck have not been run locally; PR CI is triggered and must complete before U1 is marked verified. |
| U2 — Shared rendering bounds | pending | Ensure floor/backdrop geometry is derived from the resolved walkable band; retain Canvas/Skia parity. | Inspect theme-specific `renderBackdrop` / `renderBackdropSkia` implementations before choosing the drawing contract. |
| U3 — Debug visualization | pending | Keep the debug overlay on the same resolved resource and expose the band against the actual floor geometry. | `HitRunDebugOverlay` already reads `BELT_MOVEMENT_CONFIG_RESOURCE`; visual agreement remains unverified. |
| U4 — Browser contract | pending | Extend `__hitAndRunDebug` and Playwright to assert the resolved limits and their rendered representation. | `e2e/hitandrun.spec.ts`; no browser assertion added in U1. |
| U5 — Validation | pending | Run focused Jest tests, typecheck, Hit & Run E2E and relevant CI. | No green status is claimed until observed from Actions. |

## U1 implementation notes

- Built-in level 1 declares `{ min: 280, max: 520 }`, preserving the current gameplay behavior while moving authored ownership into level data.
- Custom `HitAndRunConfig.levelData` may declare its own `walkableDepth`.
- Legacy custom level data without the field receives a copy of the legacy defaults.
- The resolver preserves all non-depth movement tuning and rejects non-finite or inverted/equal bounds.

## Status vocabulary

- `implemented-unverified`: code and tests are authored, but execution has not been observed.
- `pending`: not started.
- `verified`: required focused validation has run and passed.
- `blocked`: a concrete dependency prevents progress.
