# Hit & Run Canvas/Skia migration gate

**Branch:** `refactor/presentation-hitrun-entities`  
**Base:** `024b96cd976c0ac1062f3b83d0dc49545e46af15` (master, after PR #994)  
**PR:** [#995](https://github.com/xavirodriguez/ArcadeGames/pull/995)  
**Review date:** 2026-10-30

## What this phase has connected

- The game owns a presentation session rather than relying on a process-wide active theme instance.
- Canvas and Skia actor/projectile drawers, the Canvas/Skia backdrop and the HUD resolve the presentation theme from the same world's session resource.
- The session exposes normalized tokens and an isolated cosmetic random stream.
- Session resize is routed to the owned theme when the viewport changes.

## HUD/banner vertical slice migrated

The shared Hit & Run bridge implements `renderHud` and `renderBanner` with backend-neutral `PresentationPainter` methods. The ECS read layer creates immutable HUD snapshots and a `PresentationFrame`. The production route registers separate Canvas and Skia HUD effects, each creating its matching painter adapter.

The migrated slice includes health, score, game-over overlay and transition banner. Fantasy retains its top-bar composition; Sumi-e retains its seal composition. The banner method supports `reduceMotion` and `highContrast` frame flags, but the production reader currently supplies their defaults (`false`). The legacy theme methods remain in the legacy interface for other consumers but are no longer used by this HUD route.

Contract tests exercise both registered themes against the same painter API. They do not establish pixel parity between real raster backends.

## Entity, ground-shadow and projectile vertical slice migrated

The actor drawers (player, popcorn, wall trooper, hopper, charger, elite and Samurai fallback) and projectile drawers (bullet and rocket) now build typed `PresentationEntitySnapshot` values. Snapshots carry semantic IDs, interpolated transforms, facing, elevation, opacity, tint and immutable visual metadata; they do not expose ECS component references to the theme.

Canvas and Skia register distinct drawer factories. Both invoke the same session-owned theme methods via `CanvasPresentationPainter` or `SkiaPresentationPainter`. Ground shadows render as a separate composition step on the ground plane, before elevated actor/projectile bodies. Fantasy retains its dark-fantasy silhouettes and glow treatment; Sumi-e retains ink silhouettes, oni forms and ofuda projectiles.

The Samurai fallback now uses a painter-backed theme method rather than owning a Canvas2D context. The painter reconstruction retains the layered armor, shoulder guards, mask and horns, katana guard/highlights, attack arc, death pose and hit-flash overlay. It remains a reconstruction rather than a pixel-verified port; screenshot comparison is still required before visual equivalence can be accepted.

## What is not yet a completed Canvas/Skia migration

The legacy `HitRunTheme` contract still requires `CanvasRenderingContext2D` for backdrop and feedback. HUD/banner, ground shadows, actors, Samurai fallback and projectiles use the shared painter. Placeholder tilemap/fragment/core drawers and the Lancero sprite still use their existing Canvas-compatible path. The production `PresentationFrame` still defaults `reduceMotion` and `highContrast` to false rather than reading user preferences. The existence of painter adapters does not prove pixel parity.

## Remaining work, in migration order

1. Migrate feedback effects to painter-backed snapshots and seeded cosmetic randomness.
2. Build the backend-neutral backdrop/environment path with asset resolvers and a visual baseline for Sumi-e.
3. Migrate placeholder tilemap/fragment/core and Lancero drawers to backend-specific presentation adapters.
4. Complete production font/image resolvers and missing-resource fallbacks.
5. Add backend conformance tests for alpha, clipping, transforms, gradients, text metrics, missing assets and composition order.
6. Run a seeded scene through both real backends and compare screenshots with explicit rasterization tolerances.

## Exit criteria

Do not mark the phase closed until all production layers use backend-neutral theme methods and a seeded end-to-end scene passes both Canvas and Skia validation. Unit tests built only from mocks are necessary but insufficient.

## Current continuation status

This phase4 continuation is tracked in [PR #995](https://github.com/xavirodriguez/ArcadeGames/pull/995). Source-level tests cover typed entity projection, both theme implementations and backend-specific registration. They have not been executed in a local checkout. Real Canvas/Skia rendering, screenshot-diff tolerances and device-specific font/image resolver behavior remain unverified.

## Validation constraint

This repository state was inspected through GitHub's source/API connector. A local checkout was not available in the execution environment, so these changes have not been validated with `pnpm run ci` or runtime renderer tests. Keep that distinction explicit until CI and real backend validation complete.
