import { ShapeDrawer, CoreComponentRegistry, TilemapComponent, resolveThemeColorWithFallback } from "@tiny-aster/core";

// TODO(refactor): código duplicado detectado (bloque) con platformer/rendering/PlatformerCanvasVisuals.ts:4-91. Considerar extraer a función compartida. Ref: f164834e
export const drawPlatformerTilemap: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const tilemap = world.getComponent(entity, "Tilemap") as TilemapComponent | undefined;
    if (!tilemap?.data || tilemap.data.length === 0) return;

    const tileSize = tilemap.tileSize || 40;
    const data = tilemap.data;
    const range = tilemap.visibleRange;

    const minX = range ? Math.max(0, range.minX) : 0;
    const maxX = range ? Math.min(data[0].length - 1, range.maxX) : data[0].length - 1;
    const minY = range ? Math.max(0, range.minY) : 0;
    const maxY = range ? Math.min(data.length - 1, range.maxY) : data.length - 1;

    const slateColor = resolveThemeColorWithFallback(world, "#1e293b", "tile_slate", "archiveSlate");
    const borderColor = resolveThemeColorWithFallback(world, "#334155", "tile_border", "archiveBorderLight");
    const cyanColor = resolveThemeColorWithFallback(world, "#00f0ff", "tile_cyan", "restorationCyan", "primary");
    const goldColor = resolveThemeColorWithFallback(world, "#fbbf24", "tile_gold", "restorationGold", "secondary");
    const dangerColor = resolveThemeColorWithFallback(world, "#ef4444", "tile_danger", "corruptionCrimson", "accent");
    const whiteColor = resolveThemeColorWithFallback(world, "#ffffff", "restorationWhite");

    ctx.save();

    for (let r = minY; r <= maxY; r++) {
      const row = data[r];
      if (!row) continue;
      for (let c = minX; c <= maxX; c++) {
        const tileId = row[c];
        if (!tileId) continue;

        ctx.save();
        ctx.translate(c * tileSize, r * tileSize);

        switch (tileId) {
          case 1:
            ctx.fillStyle = slateColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.fillRect(0, 0, tileSize, tileSize);
            ctx.strokeRect(0, 0, tileSize, tileSize);
            ctx.fillStyle = cyanColor;
            ctx.fillRect(0, 0, tileSize, 3);
            break;
          case 2:
            ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
            ctx.strokeStyle = cyanColor;
            ctx.lineWidth = 1.5;
            ctx.fillRect(0, 0, tileSize, tileSize);
            ctx.strokeRect(0, 0, tileSize, tileSize);
            break;
          case 3:
            ctx.fillStyle = "rgba(234, 179, 8, 0.3)";
            ctx.strokeStyle = goldColor;
            ctx.lineWidth = 2;
            ctx.fillRect(0, 0, tileSize, tileSize);
            ctx.strokeRect(0, 0, tileSize, tileSize);
            break;
          case 4:
            ctx.fillStyle = dangerColor;
            ctx.strokeStyle = whiteColor;
            ctx.lineWidth = 1;
            for (let s = 0; s < 3; s++) {
              ctx.beginPath();
              ctx.moveTo(s * (tileSize / 3), tileSize);
              ctx.lineTo((s + 0.5) * (tileSize / 3), 4);
              ctx.lineTo((s + 1) * (tileSize / 3), tileSize);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
            break;
          case 5:
            ctx.fillStyle = cyanColor;
            ctx.fillRect(0, 0, tileSize, 6);
            break;
          default:
            ctx.fillStyle = slateColor;
            ctx.fillRect(0, 0, tileSize, tileSize);
            break;
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }
};
