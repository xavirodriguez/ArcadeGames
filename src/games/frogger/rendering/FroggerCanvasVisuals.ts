import { ShapeDrawer, EffectDrawer, resolveThemeColor, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import {
  resolveFroggerPlayerDrawContext,
  resolveFroggerShellSegments,
  resolveFroggerGoalContext,
  resolveFroggerBackgroundContext,
} from "./FroggerRenderUtils";

export const drawFroggerCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const frogger = world.getComponent(entity, "Frogger");
    const health = world.getComponent(entity, "Health");
    const invulnerableRemaining =
      frogger?.invulnerableRemaining ?? health?.invulnerableRemaining ?? 0;
    const isInvulnerable = invulnerableRemaining > 0;
    const shouldSkip = isInvulnerable && Math.floor(world.tick / 3) % 2 === 0;
    if (shouldSkip) return;

    const playerCtx = resolveFroggerPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { half, isInvuln, primaryColor } = playerCtx;

    ctx.save();

    ctx.fillStyle = isInvuln ? "#A3FF80" : primaryColor;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = isInvuln ? 12 : 8;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-half * 0.4, -half * 0.5, half * 0.35, 0, Math.PI * 2);
    ctx.arc(half * 0.4, -half * 0.5, half * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(-half * 0.4, -half * 0.55, half * 0.18, 0, Math.PI * 2);
    ctx.arc(half * 0.4, -half * 0.55, half * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#20C20E";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-half * 0.8, half * 0.2);
    ctx.lineTo(-half * 1.1, half * 0.8);
    ctx.moveTo(half * 0.8, half * 0.2);
    ctx.lineTo(half * 1.1, half * 0.8);
    ctx.stroke();

    ctx.restore();
  },
};

export const drawCarCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 48;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;

    const carColor = resolveThemeColorWithFallback(world, render.color || "#00F3FF", "car", "secondary");
    ctx.save();
    ctx.fillStyle = carColor;
    ctx.shadowColor = carColor;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 6);
    ctx.fill();

    ctx.fillStyle = "#0D0D12";
    ctx.fillRect(-halfW * 0.4, -halfH * 0.6, width * 0.4, height * 0.5);

    ctx.restore();
  },
};

export const drawTruckCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 80;
    const height = 32;
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.save();

    const truckColor = resolveThemeColorWithFallback(world, "#FF2A6D", "truck", "accent");
    ctx.save();
    ctx.fillStyle = truckColor;
    ctx.shadowColor = truckColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(-halfW, -halfH, width * 0.7, height);

    ctx.fillStyle = "#D3D9E2";
    ctx.fillRect(halfW - width * 0.28, -halfH + 2, width * 0.28, height - 4);

    ctx.restore();
  },
};

export const drawLogCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 120;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;

    const logColor = resolveThemeColorWithFallback(world, "#8B5A2B", "log", "secondary");

    ctx.save();
    ctx.fillStyle = logColor;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 10);
    ctx.fill();

    ctx.strokeStyle = "#5C3A17";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-halfW + 15, 0);
    ctx.lineTo(halfW - 15, 0);
    ctx.stroke();

    ctx.restore();
  },
};

export const drawTurtleCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 80;
    const segments = resolveFroggerShellSegments(width);

    const turtleColor = resolveThemeColorWithFallback(world, "#00D2FF", "turtle", "secondary");
    const innerColor = resolveThemeColorWithFallback(world, "#0088CC", "turtle_inner", "secondary");

    ctx.save();

    for (let i = 0; i < segments.length; i++) {
      const segX = segments[i].segX;
      ctx.fillStyle = turtleColor;
      ctx.shadowColor = turtleColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(segX, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = innerColor;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(segX, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};

export const drawLilyPadCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied } = goalCtx;

    const slotColor = resolveThemeColorWithFallback(world, "#00AA44", "home_slot", "secondary");
    const occupiedColor = resolveThemeColorWithFallback(world, "#39FF14", "home_slot_occupied", "primary");

    ctx.save();

    ctx.fillStyle = occupied ? occupiedColor : slotColor;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0.2, Math.PI * 1.8);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    if (occupied) {
      ctx.fillStyle = occupiedColor;
      ctx.shadowColor = occupiedColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = resolveThemeColorWithFallback(world, "#FF007F", "home_slot_flower", "accent");
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};

export const froggerBackgroundCanvasEffect: EffectDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world) {
    const { w, grid, grassColor, waterColor, roadColor } = resolveFroggerBackgroundContext(world);
    const waterGridColor = resolveThemeColorWithFallback(world, "rgba(0, 243, 255, 0.15)", "water_grid");

    ctx.fillStyle = grassColor;
    ctx.fillRect(0, 0, w, grid);

    ctx.fillStyle = waterColor;
    ctx.fillRect(0, grid * 1, w, grid * 5);

    ctx.strokeStyle = waterGridColor;
    ctx.lineWidth = 1;
    const offset = (world.tick * 1.5) % 40;
    for (let r = 1; r <= 5; r++) {
      ctx.beginPath();
      ctx.moveTo(-40 + offset, r * grid + grid / 2);
      ctx.lineTo(w + 40 + offset, r * grid + grid / 2);
      ctx.stroke();
    }

    ctx.fillStyle = grassColor;
    ctx.fillRect(0, grid * 6, w, grid);

    ctx.fillStyle = roadColor;
    ctx.fillRect(0, grid * 7, w, grid * 5);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    for (let r = 8; r <= 11; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * grid);
      ctx.lineTo(w, r * grid);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = grassColor;
    ctx.fillRect(0, grid * 12, w, grid * 3);
  },
};
