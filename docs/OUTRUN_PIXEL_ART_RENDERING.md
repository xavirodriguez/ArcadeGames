# Out Run pixel-art rendering slice

## Intent

Replace the smooth geometric player and traffic car approximations with original, hand-authored low-resolution sprite grids. Keep the existing pseudo-3D road, procedural scenery, road projection, ECS simulation, and gameplay contracts unchanged.

## Implementation

- `rendering/OutrunPixelSprites.ts` is the single source of truth for the player and traffic sprite grids, palette roles, frame selection, and horizontal pixel-run traversal.
- Canvas and Skia rasterize the same pixel runs with square rectangles. Both use the same body color inputs and palette-role mapping.
- The two-frame brake-light pulse is derived from world distance (`playerZ` / `racer.z`), not wall-clock time or random values. Replaying the same simulation state therefore selects the same frame.
- Existing procedural road, sky, scenery, speed lines, and off-road dust remain procedural. The new sprite grids are original project assets encoded as typed source data; no third-party arcade art or new runtime dependency is introduced.
- The road projection buffer, sprite occlusion pass, and ECS entities are unchanged.

## Visual comparison

See [the sprite-level before/after comparison](./OUTRUN_PIXEL_ART_VISUAL_COMPARISON.svg). It compares the previous geometric approximation with the new authored sprite and shows the alternate brake-light frame.

This is a sprite-level reference, not a captured in-game screenshot. A full gameplay comparison still needs to be captured on the same viewport/device in the Expo/browser runtime so road composition, scaling, and real Canvas/Skia output can be judged in context.

## Validation

Run from the repository root:

```bash
pnpm exec jest src/games/outrun/__tests__/OutrunPixelSprites.test.ts
pnpm exec jest src/games/outrun
pnpm run typecheck:app
```

The sprite tests check frame dimensions and glyph validity, deterministic frame selection, crisp run geometry, and palette-role mapping. The existing Out Run suite covers gameplay determinism and both renderer integrations. CI results should be reviewed before merging; no local device/browser screenshot or runtime test is claimed by this document.
