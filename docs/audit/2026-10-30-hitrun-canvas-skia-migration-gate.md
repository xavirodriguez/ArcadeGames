# Hit & Run Canvas/Skia migration gate

**Branch:** `refactor/presentation-roadmap-rollout`  
**Baseline:** `db8a38345e3dd020f61dd013a91aef562a693914`  
**Review date:** 2026-10-30

## What this phase has connected

- The game owns a presentation session rather than relying on a process-wide active theme instance.
- Canvas entity drawers, the Canvas backdrop, the Skia backdrop and the HUD resolve the theme from the same world's session resource.
- The session exposes normalized tokens and an isolated cosmetic random stream.
- Session resize is routed to the owned theme when the viewport changes.

## HUD/banner vertical slice migrated

The shared Hit & Run bridge implements `renderHud` and `renderBanner` with backend-neutral `PresentationPainter` methods. The ECS read layer creates immutable HUD snapshots and a `PresentationFrame`. The production route registers separate Canvas and Skia HUD effects, each creating its matching painter adapter.

The migrated slice includes health, score, section label, game-over overlay and transition banner. It also observes `reduceMotion` and `highContrast` frame flags. The legacy theme methods remain in the legacy interface for other consumers but are no longer used by this HUD route.

Contract tests exercise both registered themes against the same painter API. They do not establish pixel parity between real raster backends.

## What is not yet a completed Canvas/Skia migration

The legacy `HitRunTheme` contract still requires `CanvasRenderingContext2D` for ground shadows, entities, projectiles and feedback. The HUD/banner path has moved to the shared painter; the other scene layers have not. Skia has native backdrop and migrated HUD/banner paths, but shape drawers are still Canvas-compatible registrations for both renderer types. The existence of painter adapters does not prove pixel parity.

## Remaining work, in migration order

1. Migrate ground shadows and entity/projectile rendering to typed snapshots and `PresentationPainter`.
2. Build the backend-neutral backdrop/environment path with asset resolvers and a visual baseline for Sumi-e.
3. Migrate feedback effects to painter-backed snapshots and seeded cosmetic randomness.
4. Complete production font/image resolvers and missing-resource fallbacks.
5. Add backend conformance tests for alpha, clipping, transforms, gradients, text metrics, missing assets and composition order.
6. Run a seeded scene through both real backends and compare screenshots with explicit rasterization tolerances.

## Exit criteria

Do not mark the phase closed until all production layers use backend-neutral theme methods and a seeded end-to-end scene passes both Canvas and Skia validation. Unit tests built only from mocks are necessary but insufficient.

## Validation constraint

This repository state was inspected through GitHub's source/API connector. A local checkout was not available in the execution environment, so these changes have not been validated with `pnpm run ci` or runtime renderer tests. Keep that distinction explicit until CI and real backend validation complete.
