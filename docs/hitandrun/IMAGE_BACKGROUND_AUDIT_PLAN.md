# Hit & Run — audit and implementation plan for image-based backgrounds

**Date:** 2026-10-29  
**Scope:** `src/games/hitandrun`  
**Status:** audit / proposal only; no runtime rendering code changed

## Executive summary

Hit & Run already has a background-rendering seam and a theme abstraction, so an image-backed background should extend the current design rather than introduce a parallel renderer. The main architectural constraint is platform parity: the current theme contract and Sumi-e implementation are Canvas 2D-specific, while `HitAndRunGame` accepts both `canvas` and `skia` renderers and currently registers the same canvas-compatible drawers for both.

**Recommendation:** first define a renderer-neutral environment-asset contract and resource lifecycle, then implement Canvas and Skia adapters behind it. Do not add `drawImage` calls directly to gameplay systems or make the gameplay simulation depend on theme assets.

## Findings from the current repository

### Existing extension points

- `HitAndRunGame.ts` registers `hit_run_procedural_backdrop` through `registerBackgroundEffect`.
- `HitRunBackdropCanvas.ts` resolves viewport dimensions, the main camera's X coordinate and elapsed time, then delegates to `ThemeRegistry.getActiveTheme().renderBackdrop(...)`.
- `HitRunTheme.ts` separates visual theme operations from gameplay: backdrop, entities, projectiles, feedback, HUD, banners, resize and disposal.
- `SumiETheme.ts` already combines procedural ink-wash layers with a parchment canvas. Its scene includes distant mountains, pagodas/pines/houses, a lane and foreground silhouettes. This is the lowest-risk place to prove an image-backed environment layer.
- `SumiEAssetManifest.ts` currently describes character atlases (player and samurai), not environment props. Its `atlasPath`/animation contract should not be stretched to describe static backgrounds.

### Constraints / risks

1. **Canvas-only theme contract.** `HitRunTheme.renderBackdrop` requires `CanvasRenderingContext2D`; `SumiETheme` creates `HTMLCanvasElement` offscreen buffers via `document.createElement("canvas")`. Those are not a native Skia implementation.
2. **Renderer selection is not platform parity.** `HitAndRunGame.ts` accepts `renderer.type === "canvas" || renderer.type === "skia"`, registers the same drawers, and logs that Skia is using “canvas-compatible drawers (Phase 4 parity)”. Image loading and drawing must be verified against the actual Skia path rather than assumed to work because the renderer is accepted.
3. **Backdrop currently owns composition.** `HitRunBackdropCanvas.ts` delegates a whole-frame backdrop to the active theme. Static image layers should be composed here / in a theme-owned background component, not from ECS gameplay systems.
4. **Asset loading must follow existing lifecycle.** `HitAndRunGame.ts` already uses the core `AssetLoader` for sprite assets and readiness resources. A new environment loader must avoid per-frame loads, duplicate image objects, unbounded caches, and drawing before the resource is ready.
5. **Camera/world coordinates need an explicit contract.** The current backdrop receives `cameraX`, while environment props may be fixed to screen space, anchored in world space, or parallax layers. These behaviours should be explicit in data rather than inferred from asset names.
6. **No background-specific test seam was found in the reviewed Hit & Run test inventory.** Existing tests cover game lifecycle, asset readiness, camera creation/movement and deterministic simulation, but they do not establish a cross-renderer background-image contract.

## Proposed architecture

### Contract

Introduce a small renderer-neutral description for static environment layers, independent from character atlas metadata. At minimum:

- `id` / `assetKey`: stable semantic identity, not a hard-coded renderer URI.
- `space`: `screen`, `world`, or `parallax`.
- `x`, `y`, `width`, `height`: logical viewport/world units; source pixel dimensions remain asset metadata.
- `parallaxFactor`: only meaningful for parallax layers; default to 1 for world-locked scenery.
- `opacity` and optional horizontal repeat mode.
- deterministic layer order / z-order.
- optional theme/level association.

Keep the data contract renderer-neutral. Canvas and Skia adapters should translate the same layer description into their native image type and draw calls.

### Resource lifecycle

- Resolve the semantic asset key through the game's asset provider / existing loader boundary.
- Load once during theme or scene preparation; retain a ready/error state.
- Reuse decoded images; never decode or allocate image resources inside the frame loop.
- Draw the existing procedural background while the asset is loading or after a recoverable failure.
- Release renderer-owned image resources when the theme/scene is disposed; avoid putting renderer-specific objects in ECS gameplay components.
- Preserve headless mode: no DOM access or image decode should be required to construct the simulation.

### Composition

For the first pilot, draw the isolated Japanese house as a single decorative prop over the current procedural Sumi-e backdrop, with a configurable screen/world position and scale. Keep the procedural ink wash and lane visible. Only after this looks correct should the scene expand to multiple houses, fences, vegetation, distant landscape and independently moving parallax layers.

The house is decoration only: it must not create colliders, affect enemy/player state, or alter deterministic simulation.

## Implementation plan (separate, reviewable steps)

### Phase 0 — asset preparation (prepared separately from this audit PR)

- Remove only the connected, neutral-light exterior background; preserve the cream paper/wash within the illustration and the ink splashes around its silhouette.
- Export RGBA PNG with true alpha, trimmed with a small transparent safety margin.
- Validate on both light and dark backgrounds to catch white fringes.
- Treat this as an unintegrated candidate asset until it is placed under the repository's Sumi-e environment asset directory and referenced by the new manifest/loader.

### Phase 1 — contract and tests

- Add a dedicated environment-layer manifest/type; keep `SumiEAssetManifest` focused on character animation atlases unless there is a clear shared-asset abstraction.
- Define the asset readiness/error/fallback lifecycle using existing loader conventions.
- Add unit tests for layer ordering, coordinate conversion, camera offset/parallax, resize behaviour, missing assets and disposal.
- Keep gameplay/determinism tests independent from renderer asset availability.

### Phase 2 — Canvas adapter and pilot

- Implement Canvas image-layer drawing behind the existing backdrop/theme extension point.
- Load and cache the house once, draw it after distant wash layers and before gameplay entities, and use save/restore around alpha/transforms.
- Retain the current procedural backdrop as the fallback.
- Add a visual smoke test or a deterministic render fixture if the existing test stack supports it.

### Phase 3 — Skia adapter and parity

- Trace the actual native renderer's image asset representation and disposal semantics before coding the adapter.
- Map the same environment-layer contract to Skia-native image drawing; do not pass `HTMLImageElement`, `HTMLCanvasElement` or `CanvasRenderingContext2D` across the boundary.
- Verify the same logical position, scaling, alpha, z-order and camera/parallax behaviour on web Canvas and native Skia.
- Add adapter-specific tests and a manual device smoke test.

### Phase 4 — reusable scenery

- Add additional environment props and optional repeated/parallax layers.
- Keep layer data separate from gameplay and level collision data.
- Profile draw calls, image decode, memory and frame time on mobile before expanding the asset count.

## Verification plan

### Existing tests to preserve

- `src/games/hitandrun/__tests__/HitAndRun.test.ts`: lifecycle, asset loader/readiness resources, main camera and camera movement.
- `src/games/hitandrun/__tests__/Determinism600Ticks.test.ts`: simulation determinism must remain unchanged.
- `src/games/hitandrun/__tests__/HitAndRunPhase2.test.ts`: existing phase-two game integration coverage.

### New tests required before merging runtime changes

1. Manifest validation rejects missing keys, non-finite dimensions and invalid opacity/scale.
2. A not-yet-ready or failed image does not throw and keeps the procedural fallback visible.
3. Images are loaded/decoded once, not on each render tick.
4. World-space props follow the camera; screen-space props do not; parallax applies the configured factor.
5. Layer ordering is stable and does not alter entity/gameplay rendering order.
6. Resize and disposal release/rebuild resources correctly without leaks or stale image handles.
7. The same layer data produces equivalent placements in Canvas and Skia.
8. Headless initialization does not access `document` or require image decoding.

### Current verification status

This PR is documentation-only. The repository's Jest suite and web/native builds were not run in this environment; the runtime integration phases above must add tests and run the project's CI before merge.

## Acceptance criteria

- Existing gameplay, collision, determinism and theme selection remain unchanged.
- No image loading or allocation occurs in the per-frame gameplay path.
- Procedural background remains a robust fallback.
- Canvas and Skia consume one renderer-neutral layer description, with native resource ownership handled by each adapter.
- The Japanese house appears as a non-interactive decorative element and has no effect on game simulation.
