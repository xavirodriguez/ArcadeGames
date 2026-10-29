# Second-game presentation pilot preflight

**Candidate:** Out Run (`src/games/outrun/`)  
**Review date:** 2026-10-30  
**Status:** Candidate identified; production pilot not implemented.

## Evidence supporting Out Run as a candidate

- `src/games/outrun/mods/types.ts` defines `OutrunThemeModule` as a presentation-only module with separate `registerDrawers` callbacks for Canvas and Skia.
- `src/games/outrun/OutrunGame.ts` applies the selected visual mod and stores `OutrunThemeModule` in the world.
- `src/games/outrun/rendering/OutrunRendererManager.ts` routes mod drawer registration to the renderer's actual backend.
- `src/games/outrun/mods/registry.ts` provides a single bundle registry and a compatibility resolver.

This is a different genre and visual representation from Hit & Run: pseudo-3D racing with road, traffic, roadside decoration and HUD layers.

## Why this does not yet close Phase 7

The current `MOD_REGISTRY` initializes only the `classic` bundle. The production renderer still consumes `OutrunThemeModule` callbacks; it does not consume `PresentationThemeSession` or `PresentationPainter`. Merely wrapping its existing callbacks in another session would test selection plumbing, not prove backend-neutral theme portability.

## Required pilot

1. Add a genuinely distinct Out Run presentation theme using the existing visual-mod contract, without changing road generation, speed, collision or race-state simulation.
2. Create an Out Run session through `PresentationThemeRegistry` and derive renderer/UI tokens from that same session.
3. Migrate one complete vertical slice to `PresentationPainter`, then expand to road/scenery, vehicles and HUD.
4. Run seeded gameplay determinism checks and real Canvas/Skia screenshots; verify a theme change affects presentation only.
5. Confirm there are no dependencies from Out Run gameplay systems to the presentation implementation.

Until these checks pass, Out Run remains a documented candidate, not a completed second-game proof.
