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

## Registered sheets

- `oni_red` — Red Oni / Ashigaru Infernal. Measured from the original 924×539 sheet.
- `sea_dragon` — Sea dragon ("dragón marino") for the Space Invaders *Aquí hay dragones* mod
  (art bible §12.2). Procedurally built outline atlas: 640×192 PNG, 80×64 px cells, logical
  frame 40×32 world units, rows `fly` (6, loop) / `hit` (3, one-shot) / `death` (6, one-shot).
  Regenerate with `node scripts/sprites/build-sea-dragon-atlas.cjs`. Drawers for Canvas/Skia
  live in `src/games/space-invaders/rendering/SeaDragonVisuals.ts`, registered through the
  NauticalMod so entities with `render.shape = "sea_dragon"` render on both backends.

## Notes

- Frame rects for `oni_red` were measured from the original sheet (924×539).
- Adjust `startX / startY / spacing` in `makeRowFrames` if frames look offset.
- The system is intentionally renderer-agnostic so the same animator works on web (Canvas) and native (Skia).

## Atlas validation

Run `pnpm run sprites:validate` before opening a game or submitting sprite work. The command validates the shared sprite catalogue and the bundled Hit&Run atlases. It checks that each referenced PNG exists, verifies the PNG signature/IHDR dimensions, confirms frame rectangles remain inside the image, detects duplicate ids, and validates animation timing, source mode and anchors. CI runs the same command before the build.

All shared-pipeline sheet definitions use the canonical `SpriteSheetDefinition` contract exported by `@tiny-aster/core`. Keep the repository-relative `assetPath` alongside the runtime `imageSource`: the former is for tooling and validation; the latter is for Metro/platform loading. Add new shared-pipeline sheets to `SPRITE_SHEET_CATALOG` so runtime registration and CI inspect the same definitions.


## Animation timing

`updateSpriteAnimator(animator, dt)` consumes elapsed seconds and advances across every frame boundary covered by `dt`, including after a slow frame. A completed non-looping clip sets `animator.finished` and reports completion once; call `playAnimation(animator, name, true)` to restart that same clip. Invalid or non-positive `dt` values and non-positive frame durations do not advance playback.

## Shared destination geometry

The ECS Canvas drawer, ECS Skia drawer and shared sprite-sheet drawer use `calculateSpriteDestinationRect` from `@tiny-aster/core` for destination sizing and anchor offsets. This keeps center, feet and custom normalized anchors consistent across both render backends. Run the core test `packages/core/tests/SpriteSheetDefinition.test.ts` when changing this contract.
