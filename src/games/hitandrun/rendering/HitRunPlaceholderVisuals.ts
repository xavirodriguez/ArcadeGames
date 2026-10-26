/**
 * Monochrome placeholder drawers for hitandrun diagnostics.
 * Not production art — solid blocks so tilemap + collectibles are visible
 * and missing-blueprint / missing-asset failures are easy to spot.
 */
import {
  ShapeDrawer,
  CoreComponentRegistry,
  TilemapComponent,
} from "@tiny-aster/core";

/** Solid floor/wall tiles — greys only. */
export const drawHitRunMonoTilemap: ShapeDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world, entity) {
    const tilemap = world.getComponent(entity, "Tilemap") as
      | TilemapComponent
      | undefined;
    if (!tilemap?.data || tilemap.data.length === 0) return;

    const tileSize = tilemap.tileSize || 40;
    const data = tilemap.data;
    const range = tilemap.visibleRange;

    const minX = range ? Math.max(0, range.minX) : 0;
    const maxX = range
      ? Math.min((data[0]?.length ?? 1) - 1, range.maxX)
      : (data[0]?.length ?? 1) - 1;
    const minY = range ? Math.max(0, range.minY) : 0;
    const maxY = range
      ? Math.min(data.length - 1, range.maxY)
      : data.length - 1;

    ctx.save();
    for (let r = minY; r <= maxY; r++) {
      const row = data[r];
      if (!row) continue;
      for (let c = minX; c <= maxX; c++) {
        const tileId = row[c];
        if (!tileId) continue;

        ctx.save();
        ctx.translate(c * tileSize, r * tileSize);

        // 1 = solid ground, 5 = platform ledge, other = wall-ish
        if (tileId === 1) {
          ctx.fillStyle = "#555555";
        } else if (tileId === 5) {
          ctx.fillStyle = "#888888";
        } else {
          ctx.fillStyle = "#333333";
        }
        ctx.fillRect(0, 0, tileSize, tileSize);
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, tileSize - 1, tileSize - 1);

        ctx.restore();
      }
    }
    ctx.restore();
  },
};

/** Magenta block — collectible_fragment */
export const drawHitRunMonoFragment: ShapeDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, _world, _entity) {
    const s = 16;
    ctx.fillStyle = "#FF00FF";
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
  },
};

/** Cyan block — collectible_core */
export const drawHitRunMonoCore: ShapeDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, _world, _entity) {
    const s = 24;
    ctx.fillStyle = "#00FFFF";
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
  },
};
