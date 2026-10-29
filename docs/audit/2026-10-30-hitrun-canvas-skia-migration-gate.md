# Hit & Run Canvas/Skia migration gate

**Branch:** `refactor/presentation-roadmap-rollout`  
**Baseline:** `db8a38345e3dd020f61dd013a91aef562a693914`  
**Review date:** 2026-10-30

## What this phase has connected

- The game owns a presentation session rather than relying on a process-wide active theme instance.
- Canvas entity drawers, the Canvas backdrop, the Skia backdrop and the HUD resolve the theme from the same world's session resource.
- The session exposes normalized tokens and an isolated cosmetic random stream.
- Session resize is routed to the owned theme when the viewport changes.

## What is not yet a completed Canvas/Skia migration

The legacy `HitRunTheme` contract still requires `CanvasRenderingContext2D` for ground shadows, entities, projectiles, feedback, HUD and banners. Its optional Skia entry point currently covers the backdrop only. `HitAndRunGame.initializeRenderer()` still registers Canvas-compatible shape drawers for the Skia renderer. The existence of `CanvasPresentationPainter` and `SkiaPresentationPainter` does not close this gap.

## Remaining work, in migration order

1. Build a backend-neutral Hit & Run theme facade over typed presentation snapshots.
2. Implement the Sumi-e theme over `PresentationPainter` without changing the established visual baseline.
3. Wire Canvas and Skia painters into the renderer-specific registration path; do not pass Canvas drawers into Skia.
4. Migrate backdrop and environment layers, then shadows and entities, projectiles and feedback, and finally HUD and banners.
5. Supply actual font and image resolvers and define missing-asset fallback behavior.
6. Add backend conformance tests for alpha, clipping, transforms, gradients, text metrics, missing assets and composition order.
7. Run a seeded scene through both real backends and compare screenshots with explicit rasterization tolerances.

## Exit criteria

Do not mark the phase closed until all production layers use backend-neutral theme methods and a seeded end-to-end scene passes both Canvas and Skia validation. Unit tests built only from mocks are necessary but insufficient.

## Validation constraint

This repository state was inspected through GitHub's source/API connector. A local checkout was not available in the execution environment, so these changes have not been validated with `pnpm run ci` or runtime renderer tests. Keep that distinction explicit until CI and real backend validation complete.
