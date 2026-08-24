import { ShapeDrawer } from "@tiny-aster/core";
import { NebulaDashComponentRegistry } from "../types/NebulaDashRegistry";

export const drawNebulaPlayer: ShapeDrawer<CanvasRenderingContext2D, NebulaDashComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 16;
    ctx.save();

    // Body gradient
    const grad = ctx.createRadialGradient(0, -size * 0.2, 2, 0, 0, size);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.5, "#00f0ff");
    grad.addColorStop(1, "#0055ff");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.8, size);
    ctx.lineTo(0, size * 0.6);
    ctx.lineTo(-size * 0.8, size);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
};

export const drawNebulaGap: ShapeDrawer<CanvasRenderingContext2D, NebulaDashComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const gap = world.getComponent(entity, "ObstacleGap");
    if (!render || !gap) return;

    const gapWidth = gap.gapWidth || 120;
    const halfGap = gapWidth / 2;
    const barrierWidth = 400;

    ctx.save();

    // Color based on whether passed
    const color = gap.passed ? "#00ff88" : "#ff0055";

    // Left barrier
    ctx.fillStyle = color;
    ctx.fillRect(-halfGap - barrierWidth, -10, barrierWidth, 20);

    // Right barrier
    ctx.fillRect(halfGap, -10, barrierWidth, 20);

    // Dotted energy beam across gap
    ctx.strokeStyle = gap.passed ? "rgba(0, 255, 136, 0.4)" : "rgba(255, 0, 85, 0.4)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-halfGap, 0);
    ctx.lineTo(halfGap, 0);
    ctx.stroke();

    ctx.restore();
  }
};

export const drawNebulaAsteroid: ShapeDrawer<CanvasRenderingContext2D, NebulaDashComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 30;
    const radius = size / 2;

    ctx.save();
    ctx.fillStyle = "#888888";
    ctx.strokeStyle = "#aaaaaa";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Simple crater highlights
    ctx.fillStyle = "#666666";
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.arc(radius * 0.2, radius * 0.3, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawNebulaPlasmaWall: ShapeDrawer<CanvasRenderingContext2D, NebulaDashComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    ctx.save();
    const grad = ctx.createLinearGradient(0, -50, 0, 50);
    grad.addColorStop(0, "rgba(255, 0, 255, 0.9)");
    grad.addColorStop(0.3, "rgba(255, 0, 128, 0.7)");
    grad.addColorStop(1, "rgba(128, 0, 255, 0.9)");

    ctx.fillStyle = grad;
    ctx.fillRect(-1000, -50, 2000, 200);

    ctx.restore();
  }
};
