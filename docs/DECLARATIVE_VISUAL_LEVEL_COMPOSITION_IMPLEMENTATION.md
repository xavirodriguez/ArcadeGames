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
- Runtime validation with field-path diagnostics for IDs, assets, coordinate spaces, layer ordering, parallax factors and transform bounds.
- Fixed instance resolution into a renderer-neutral scene, including prefab flattening, stable layer order and transform defaults.
- Unit test fixtures for stable resolution and common invalid documents.

## Deliberate limits

- This phase does not wire the resolver into Hit & Run rendering, does not load/decode images and does not claim Canvas/Skia parity.
- Asset lookup is supplied by an adapter around the existing registry/provider; no parallel asset catalog or global singleton is created.
- Theme identifiers are preserved as data. Theme rendering and palette treatment remain owned by existing theme implementations.
- Procedural variation, nested prefabs, viewport/camera transforms, and runtime resource ownership remain future phases.
