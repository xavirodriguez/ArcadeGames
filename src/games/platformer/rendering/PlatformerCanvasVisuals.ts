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

/**
 * Animated goal flag: gentle undulation driven by world.tick, pulsing glow,
 * and a subtle vertical light beam. Visual-only; no particles, no simulation impact.
 * Colors remain theme-token driven (same resolveThemeColorWithFallback calls as before).
 */
export const drawPlatformerGoal: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 32;

    const goalColor = resolveThemeColorWithFallback(world, "#fbbf24", "goal", "secondary");
    const whiteColor = resolveThemeColorWithFallback(world, "#ffffff", "restorationWhite");

    const tick = world.tick;
    // Deterministic pulse and wave phase (no Date/performance/Math.random)
    const pulse = 1.0 + 0.14 * Math.sin(tick * 0.07);
    const wavePhase = tick * 0.11;

    ctx.save();

    // Subtle vertical light beam behind the flag (theme color + low alpha)
    const beamHeight = size * 1.7;
    const beamWidth = size * 0.32;
    const beamAlpha = 0.07 + 0.05 * Math.sin(tick * 0.05);
    ctx.globalAlpha = beamAlpha;
    ctx.fillStyle = goalColor;
    // Slightly left of pole so the beam reads as a soft shaft of light
    ctx.fillRect(-size * 0.3 - beamWidth * 0.35, -beamHeight * 0.55, beamWidth, beamHeight);
    ctx.globalAlpha = 1;

    // Pulsing glow
    ctx.shadowColor = goalColor;
    ctx.shadowBlur = 10 + 10 * pulse;

    // Pole
    ctx.strokeStyle = whiteColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.5);
    ctx.lineTo(-size * 0.3, -size * 0.5);
    ctx.stroke();

    // Flag body with undulation (segmented path; tip and mid points offset by sin)
    const poleX = -size * 0.3;
    const topY = -size * 0.5;
    const flagW = size * 0.7;
    const tipWave = Math.sin(wavePhase) * size * 0.09;
    const midWave = Math.sin(wavePhase + 0.85) * size * 0.06;

    ctx.fillStyle = goalColor;
    ctx.beginPath();
    ctx.moveTo(poleX, topY);
    ctx.lineTo(poleX + flagW * 0.5 + midWave, topY + size * 0.13);
    ctx.lineTo(poleX + flagW + tipWave, topY + size * 0.28);
    ctx.lineTo(poleX + flagW * 0.45 + midWave * 0.4, topY + size * 0.42);
    ctx.lineTo(poleX, 0);
    ctx.closePath();
    ctx.fill();

    // Soft secondary outline on the flag edge for readability at distance
    ctx.strokeStyle = whiteColor;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.35 + 0.15 * pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }
};
