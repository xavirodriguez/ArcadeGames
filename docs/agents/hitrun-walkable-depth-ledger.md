# Hit & Run — Walkable Depth Ledger

Updated: 2026-11-17 (U2)

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
| U2 — Shared rendering bounds | implemented-unverified | Both backdrop drawers read `BELT_MOVEMENT_CONFIG_RESOURCE` and pass the resolved `{ min, max }` to the theme. Sumi-e replaces its percentage-based lane with those exact bounds; Fantasy and Template render a subtle floor band and edge lines from the same bounds on Canvas and Skia. | `HitRunBackdropCanvas.ts`; `HitRunBackdropSkia.ts`; `HitRunTheme.ts`; `theme/sumi-e/SumiETheme.ts`; `theme/fantasy/FantasyTheme.ts`; `theme/TemplateTheme.ts`. Added `rendering/__tests__/HitRunBackdropDepth.test.ts` to assert Canvas and Skia receive the identical resource values. Test execution and visual parity remain unverified pending CI/device review. |
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
