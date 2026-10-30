# Presentation legacy selection retirement

**Review date:** 2026-10-30  
**Scope:** Hit & Run theme selection and session ownership.

## Result

The global active-theme state has been removed from `src/games/hitandrun/rendering/theme/ThemeRegistry.ts`. The registry now stores factories and produces fresh instances through `get(id, context)`. A game-owned resource points to the theme instance used by its Canvas/Skia backdrop, entity drawers and HUD.

`activateHitAndRunTheme()` remains exported as a deprecated, pure compatibility alias to `resolveHitAndRunTheme()`; it no longer activates or disposes any theme. Retaining that alias is an API compatibility choice, not a second source of truth.

## Guardrails

- Architecture tests reject the old active-instance fields and accessors.
- Theme-aware render entry points must resolve `getHitRunTheme(world)`.
- Each session disposes only the theme instance it created.
- Simulation folders remain protected from imports from rendering.

## Remaining legacy

This phase retires the global selection mechanism, not the full Canvas-specific `HitRunTheme` drawing contract. The latter remains a compatibility surface until the backend-neutral migration gate in `2026-10-30-hitrun-canvas-skia-migration-gate.md` is satisfied.

## Validation state

The regression guard and source changes are committed, but the new tests have not yet been executed locally. Phase retirement is considered implemented in source; runtime acceptance remains dependent on CI and real backend validation.
