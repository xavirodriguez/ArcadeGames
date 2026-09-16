import { ShapeDrawer, World, CoreComponentRegistry, TilemapComponent } from "@tiny-aster/core";
import { colors } from "../../../theme/colors";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";

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
            ctx.fillStyle = colors.slate;
            ctx.strokeStyle = colors.borderLight;
            ctx.lineWidth = 1;
            ctx.fillRect(0, 0, tileSize, tileSize);
            ctx.strokeRect(0, 0, tileSize, tileSize);
            ctx.fillStyle = colors.cyan;
            ctx.fillRect(0, 0, tileSize, 3);
            break;
          case 2:
            ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
            ctx.strokeStyle = colors.cyan;
            ctx.lineWidth = 1.5;
            ctx.fillRect(0, 0, tileSize, tileSize);
            ctx.strokeRect(0, 0, tileSize, tileSize);
            break;
          case 3:
            ctx.fillStyle = "rgba(234, 179, 8, 0.3)";
            ctx.strokeStyle = colors.gold;
            ctx.lineWidth = 2;
            ctx.fillRect(0, 0, tileSize, tileSize);
            ctx.strokeRect(0, 0, tileSize, tileSize);
            break;
          case 4:
            ctx.fillStyle = colors.danger;
            ctx.strokeStyle = colors.white;
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
            ctx.fillStyle = colors.cyan;
            ctx.fillRect(0, 0, tileSize, 6);
            break;
          default:
            ctx.fillStyle = colors.slate;
            ctx.fillRect(0, 0, tileSize, tileSize);
            break;
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }
};

export const drawPlatformerPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 20;

    const health = world.getComponent(entity, "Health");
    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0 });
    if (invState.isInvulnerable && invState.opacity === 0) {
      return;
    }

    ctx.save();
    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 10;

    ctx.fillStyle = colors.cyan;
    ctx.strokeStyle = colors.white;
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.4, -size * 0.6, size * 0.8, size * 1.2, 4);
    } else {
      ctx.rect(-size * 0.4, -size * 0.6, size * 0.8, size * 1.2);
    }
    ctx.fill();
    ctx.stroke();

    // Visor
    ctx.fillStyle = colors.white;
    ctx.fillRect(-size * 0.2, -size * 0.4, size * 0.5, size * 0.2);

    ctx.restore();
  }
};

export const drawPlatformerGoal: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 32;

    ctx.save();
    ctx.shadowColor = colors.gold;
    ctx.shadowBlur = 12;

    ctx.fillStyle = colors.gold;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.5);
    ctx.lineTo(-size * 0.3, -size * 0.5);
    ctx.lineTo(size * 0.4, -size * 0.25);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();

    // Pole
    ctx.strokeStyle = colors.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.5);
    ctx.lineTo(-size * 0.3, -size * 0.5);
    ctx.stroke();

    ctx.restore();
  }
};
