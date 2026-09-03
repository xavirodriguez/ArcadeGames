import { ShapeDrawer, World, CoreComponentRegistry } from "@tiny-aster/core";
import { colors } from "../../../theme/colors";

// TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:113-119. Considerar extraer a función compartida. Ref: 16b8cacf
export const drawPlatformerPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 20;

    const health = world.getComponent(entity, "Health" as any) as any;
    if (health && health.invulnerableRemaining && health.invulnerableRemaining > 0) {
      if (Math.floor(world.tick / 4) % 2 === 0) {
        return;
      }
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

// TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:374-379. Considerar extraer a función compartida. Ref: cd20434f
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
