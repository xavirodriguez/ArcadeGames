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

## Adding a new character

1. Drop the PNG into `assets/sprites/...`
2. Add a new `SpriteSheetDef` in `SpriteRegistry.ts`
3. Call `SpriteRegistry.register(...)` inside `init()`
4. Use `createSpriteAnimator("your_id")`

## Notes

- Frame rects for `oni_red` were measured from the original sheet (924×539).
- Adjust `startX / startY / spacing` in `makeRowFrames` if frames look offset.
- The system is intentionally renderer-agnostic so the same animator works on web (Canvas) and native (Skia).
