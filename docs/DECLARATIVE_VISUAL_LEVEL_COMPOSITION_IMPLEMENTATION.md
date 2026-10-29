# Declarative Visual Level Composition — Phase 0 Audit

**Date:** 2026-10-29  
**Roadmap:** [DECLARATIVE_VISUAL_LEVEL_COMPOSITION_ROADMAP.md](./DECLARATIVE_VISUAL_LEVEL_COMPOSITION_ROADMAP.md)

## Findings

- Hit & Run's current Sumi-e village layer is code-authored and Canvas-specific:
  `src/games/hitandrun/rendering/theme/sumi-e/SumiEVillageLayer.ts` calculates repeated house positions and draws each house directly into a `CanvasRenderingContext2D`.
- The background/theme boundary is the correct integration seam. The existing audit at `docs/hitandrun/IMAGE_BACKGROUND_AUDIT_PLAN.md` notes that `HitRunTheme.renderBackdrop` is Canvas-only and that the current Skia selection does not establish native background parity.
- The repository already has shared sprite infrastructure under `src/games/shared/sprites/`, including `SpriteRegistry`, `SpriteDrawer`, `AssetLoaderAdapter` and shared asset source resolution. ECS/game-owned AssetLoader providers still have their own lifecycle. The composition core must not introduce another registry or image cache.
- The repository has Zod 4 as a root dependency, but the first contract is implemented as a small pure validator to keep runtime behavior and schema dependencies explicit. It performs no image decode, renderer allocation or ECS mutation.
- Existing core helper `calculateSpriteDestinationRect` is the established home for sprite anchor/destination math across Canvas and Skia drawers. The composition resolver records semantic anchors; renderer adapters should reuse that helper when they are implemented.
- Existing tests live alongside game/shared source under Jest. The new resolver tests are pure and do not need a DOM, image fixtures or a running game.

## Phase 1 scope delivered here

- Versioned TypeScript authoring and resolved-scene contracts.
- Strict runtime validation with field-path diagnostics, including rejection of unknown keys, registered-theme checks, referenced-prefab validation, asset/anchor checks, transform bounds, and layer-role/order contradictions.
- A single layer-level coordinate-space authority. Instance definitions do not carry `space`; all items inherit the containing layer's coordinate space and parallax factor.
- One ordered `items` list per layer allows direct instances and prefab placements to interleave. All resolved IDs are layer-prefixed and collisions are reported.
- Parallax semantics are explicit: factor `0` is camera-fixed and `1` moves at world-camera speed. Layer position offsets every item in that layer, including prefab placements.
- Unit tests for deterministic ordering, strict keys, invalid references/transforms, unused broken prefabs, theme checks and ID collisions.

## Deliberate limits

- This phase does not wire the resolver into Hit & Run rendering, does not load/decode images and does not claim Canvas/Skia parity.
- Asset lookup is supplied by an adapter around the existing registry/provider; no parallel asset catalog or global singleton is created.
- Theme identifiers are validated against the injected catalog. Theme rendering and palette treatment remain owned by existing theme implementations.
- Procedural variation, nested prefabs, viewport/camera transforms, and runtime resource ownership remain future phases.

## Phase 2 — fixed Sumi-e village pilot

- Added `CanvasVisualSceneRenderer`, a thin adapter from the renderer-neutral resolved IR to the existing `SpriteRegistry` and `SpriteDrawer`. It does not create a parallel image cache or mutate ECS state.
- Added camera coordinate mapping for `world`, `screen`, and `parallax` spaces; parallax factor semantics are shared with the resolver contract.
- Added semantic anchor handling and preserved rotation, scale, flip and opacity during Canvas drawing.
- Added `SUMI_E_VILLAGE_COMPOSITION`, a small fixed seven-instance composition across far-background, settlement and foreground layers. It uses the existing `tower_basic_art` sprite and registered `sumi-e` theme.
- Wired `SumiEVillageTheme`'s village layer to resolve and render the fixed composition over the existing procedural ink-wash backdrop. The original deterministic placement helper remains independently testable.
- Added tests for fixed composition resolution, unique resolved IDs, layer order, and world/screen/parallax camera transforms.

### Phase 2 boundaries

This is a Canvas pilot, not yet Canvas/Skia parity. The existing SpriteDrawer owns asynchronous sprite decoding and cache lifecycle. The composition uses a fixed authoring frame of 800×600 and centers it against the actual viewport; responsive layout rules, viewport culling, Skia drawing, procedural variation and broader asset coverage remain subsequent work. The art asset is intentionally reused as a proof of the composition path, not treated as the final village asset set.


### Phase 2.1 — viewport transform allocation fix

- Added an optional viewport offset to the Canvas adapter. It is applied after world/screen/parallax camera transforms, so centering the fixed authoring frame does not change the meaning of each layer's parallax factor.
- Removed the per-frame scene clone and seven per-instance object allocations from `drawSumiEVillageLayer`. The resolved scene remains cached and immutable; viewport centering is now a draw-time transform input.
- Added a unit test proving viewport offsets are composed after camera/parallax transforms.
- This is a targeted allocation reduction, not a claim of zero-allocation rendering. The sprite drawer still constructs per-instance animator/options objects, and viewport culling remains future work.
