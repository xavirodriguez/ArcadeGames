import { ShapeDrawer, EffectDrawer, resolveThemeColor, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import {
  resolveFroggerPlayerDrawContext,
  resolveFroggerShellSegments,
  resolveFroggerGoalContext,
  resolveFroggerBackgroundContext,
  resolveFroggerSlotColors,
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

    // Facing: default sprite faces "up"; rotate in place.
    const facing = frogger?.facing ?? "up";
    const facingRad =
      facing === "up" ? 0 :
      facing === "right" ? Math.PI / 2 :
      facing === "down" ? Math.PI :
      -Math.PI / 2;

    ctx.save();
    if (facingRad !== 0) ctx.rotate(facingRad);

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

    const log = world.getComponent(entity, "Log");
    const divePhase = log?.divePhase ?? "float";
    // Fully submerged turtles are invisible (player falls in).
    if (divePhase === "submerged") return;

    const width = render.size || 80;
    const segments = resolveFroggerShellSegments(width);

    const turtleColor = resolveThemeColorWithFallback(world, "#00D2FF", "turtle", "secondary");
    const innerColor = resolveThemeColorWithFallback(world, "#0088CC", "turtle_inner", "secondary");
    // Warning phase: partial dive — lower alpha + slight downward offset.
    const isWarning = divePhase === "warning";
    const alpha = isWarning ? 0.45 : 1;
    const yOffset = isWarning ? 8 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, yOffset);

    for (let i = 0; i < segments.length; i++) {
      const segX = segments[i].segX;
      ctx.fillStyle = turtleColor;
      ctx.shadowColor = turtleColor;
      ctx.shadowBlur = isWarning ? 2 : 6;
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

/** River crocodile: long green body with darker head; mouth-open accent. */
export const drawCrocodileCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const log = world.getComponent(entity, "Log");
    const width = render.size || 120;
    const height = 28;
    const halfW = width / 2;
    const halfH = height / 2;
    const mouthOpen = !!log?.mouthOpen;
    const dir = log?.direction ?? 1;

    const bodyColor = resolveThemeColorWithFallback(world, "#2E8B57", "crocodile", "secondary");
    const headColor = mouthOpen ? "#1A5C38" : "#3CB371";

    ctx.save();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width * 0.7, height, 8);
    ctx.fill();

    // Head (facing travel direction)
    const headW = width * 0.3;
    const headX = dir > 0 ? halfW - headW : -halfW;
    ctx.fillStyle = headColor;
    ctx.shadowBlur = mouthOpen ? 10 : 4;
    ctx.beginPath();
    ctx.roundRect(headX, -halfH + 2, headW, height - 4, 6);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#FFD700";
    ctx.shadowBlur = 0;
    const eyeX = dir > 0 ? halfW - headW * 0.4 : -halfW + headW * 0.4;
    ctx.beginPath();
    ctx.arc(eyeX, -halfH * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Open mouth indicator (red inner)
    if (mouthOpen) {
      ctx.fillStyle = "#8B0000";
      const mouthY = halfH * 0.15;
      ctx.fillRect(headX + 4, mouthY, headW - 8, halfH * 0.55);
    }

    ctx.restore();
  },
};

export const drawLilyPadCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied, pad } = goalCtx;

    const { slotColor, occupiedColor } = resolveFroggerSlotColors(world);

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
    } else if (pad.hasCrocodile) {
      // Pad crocodile silhouette
      ctx.fillStyle = "#1A5C38";
      ctx.shadowColor = "#2E8B57";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(0, 2, half * 0.7, half * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFD700";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(-half * 0.25, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (pad.hasFly) {
      // Bonus fly
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFAA00";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(-6, -4, 5, 3, -0.4, 0, Math.PI * 2);
      ctx.ellipse(6, -4, 5, 3, 0.4, 0, Math.PI * 2);
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
