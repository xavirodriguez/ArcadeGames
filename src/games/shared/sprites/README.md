# Sprite System

Scalable sprite-sheet system for ArcadeGames (Canvas + Skia).

## Quick start

1. Place your sprite sheet PNG under:

   ```
   assets/sprites/enemies/oni_red.png
   ```

2. Register it in `SpriteRegistry.ts` (already done for `oni_red`).

3. Call once at boot:

   ```ts
   import { SpriteRegistry } from "../shared/sprites";
   SpriteRegistry.init();
   ```

4. On an entity, add a `SpriteAnimator` component:

   ```ts
   import { createSpriteAnimator } from "../shared/sprites";

   const animator = createSpriteAnimator("oni_red", "idle");
   // attach to entity
   ```

5. Every frame:

   ```ts
   updateSpriteAnimator(animator, dt);
   ```

6. Draw:

   - Canvas: `drawSpriteCanvas(ctx, animator, x, y)`
   - Skia:   `drawSpriteSkia(canvas, animator, x, y)`

## Adding a new character or static prop

1. Drop the PNG into `assets/sprites/...`
2. Add a new `SpriteSheetDef` in `SpriteRegistry.ts`
3. For a regular sheet, define measured source rectangles per animation row.
4. For a single-image prop, set `sourceMode: "full-image"`, provide its logical fit box in `frameWidth/frameHeight`, and use `animations.idle.frames: []`. The drawer reads the source dimensions at runtime and preserves aspect ratio.
5. Set `anchor: { x: 0.5, y: 0.5 }` for cell-centered props; character sheets default to bottom-center.
6. Register it in `SpriteRegistry.init()` and use `createSpriteAnimator("your_id")` in the game's drawer or entity blueprint.

Canvas and Skia use renderer-specific decoded-image caches over the shared registry. Both drawers return `false` while the asset is loading, allowing the ShapeDrawer fallback to remain visible.

## Notes

- Frame rects for `oni_red` were measured from the original sheet (924×539).
- Adjust `startX / startY / spacing` in `makeRowFrames` if frames look offset.
- The system is intentionally renderer-agnostic so the same animator works on web (Canvas) and native (Skia).
