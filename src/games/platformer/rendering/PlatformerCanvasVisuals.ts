import { ShapeDrawer, CoreComponentRegistry, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
export { drawPlatformerTilemap } from "../../shared/rendering/PlatformerSharedTilemap";

export const drawPlatformerPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 20;

    const playerColor = resolveThemeColorWithFallback(world, render.color || "#00f0ff", "player", "primary");
    const whiteColor = resolveThemeColorWithFallback(world, "#ffffff", "restorationWhite");

    const health = world.getComponent(entity, "Health");
    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0 });
    if (invState.isInvulnerable && invState.opacity === 0) {
      return;
    }

    ctx.save();
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 10;

    ctx.fillStyle = playerColor;
    ctx.strokeStyle = whiteColor;
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
    ctx.fillStyle = whiteColor;
    ctx.fillRect(-size * 0.2, -size * 0.4, size * 0.5, size * 0.2);

    ctx.restore();
  }
};

export const drawPlatformerGoal: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 32;

    const goalColor = resolveThemeColorWithFallback(world, "#fbbf24", "goal", "secondary");
    const whiteColor = resolveThemeColorWithFallback(world, "#ffffff", "restorationWhite");

    ctx.save();
    ctx.shadowColor = goalColor;
    ctx.shadowBlur = 12;

    ctx.fillStyle = goalColor;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.5);
    ctx.lineTo(-size * 0.3, -size * 0.5);
    ctx.lineTo(size * 0.4, -size * 0.25);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();

    // Pole
    ctx.strokeStyle = whiteColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.5);
    ctx.lineTo(-size * 0.3, -size * 0.5);
    ctx.stroke();

    ctx.restore();
  }
};
