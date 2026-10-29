# Repeated sprite scenes for Hit & Run

## Purpose

Hit & Run's Sumi-e village is built from static environment sprites placed in renderer-neutral scene data. The village remains decorative: it does not create ECS entities or affect gameplay state, collisions, AI, or seeded gameplay randomness.

## Authoring a repeated row

A `VisualLayerDefinition` can contain ordinary `items` and optional `repeaters`. A repeater defines a list of static full-image asset IDs, an origin, horizontal spacing, scale and opacity. The renderer expands only the indices that can intersect the viewport plus an overscan margin; it does not materialize a full level's worth of instances.

```ts
{
  id: "village",
  role: "settlement",
  order: 20,
  space: "parallax",
  parallaxFactor: 0.36,
  items: [],
  repeaters: [{
    id: "village-houses",
    assets: ["urban_house_01", "urban_house_03", "urban_large_house"],
    start: { x: -180, y: 440 },
    spacing: 470,
    scale: { x: 0.68, y: 0.68 },
    opacity: 0.56
  }]
}
```

The example is schematic; see `SumiEVillageComposition.ts` for the active composition.

## Asset contract

- Register environment sprites in `SpriteRegistry.ts` using literal Metro `require()` paths.
- Static images use `sourceMode: "full-image"`, no frame rectangles, and a bottom-center anchor unless the artwork needs another origin.
- `frameWidth` / `frameHeight` define the logical fit box for a `full-image` sprite. The drawer preserves source aspect ratio within this box.
- Animated character sheets remain frame-based and should not be used as full-image environment art.
- Failed optional scenery assets leave the procedural backdrop visible.

## Coordinate and camera contract

Resolved instance positions and repeater origins are world or screen coordinates. Canvas and Skia share `getVisualPosition()` and `getVisibleRepeatedIndexRange()` from `VisualSceneTransform.ts`.

For world/parallax content:

\\[x_{screen} = (x_{world} - x_{camera} \\cdot p) \\cdot zoom + viewportOffset_x\\]

Screen-space content stays fixed to the viewport and does not receive world zoom or camera translation. Each layer's parallax factor is applied once, in the renderer; repeaters keep their origins stable in world coordinates.

Repeated asset variation follows a stable cycle based on the repeater ID and signed repeat index. It does not use `Math.random()` or `world.gameplayRandom`.

## Renderers and lifecycle

- Canvas uses `drawResolvedVisualSceneCanvas()` and the existing Canvas image cache.
- Skia uses `drawResolvedVisualSceneSkia()` and the existing Skia image cache; no `HTMLImageElement` crosses the backend boundary.
- Both adapters use the same resolved scene, camera transform, culling range, anchors, variant order and layer ordering.
- Scene composition does not own image caches. Preload delegates to `SpriteDrawer`.
- The native Sumi-e backdrop draws paper, ink-wash silhouettes, lane and repeated village sprites. Other themes without a native backdrop method receive a palette-color fallback on the Skia backdrop path.

## Verification

Run:

```bash
pnpm run sprites:validate
pnpm exec jest --runInBand src/games/shared/rendering/visual-composition/__tests__/resolveVisualScene.test.ts src/games/shared/rendering/visual-composition/__tests__/VisualSceneTransform.test.ts src/games/hitandrun/rendering/theme/sumi-e/__tests__/SumiEVillageComposition.test.ts
pnpm run ci
```

Manual visual validation should compare the Sumi-e village on Canvas and Skia at multiple viewport widths and camera positions. The current native backdrop implementation mirrors the key paper/ink-wash/lane layers and village placement; it does not yet reproduce every Canvas-only ornament, decal, or dragon stroke pixel-for-pixel.
