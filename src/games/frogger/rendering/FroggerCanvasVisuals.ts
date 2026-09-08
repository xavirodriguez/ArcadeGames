import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

export const drawFroggerCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 32;
    const half = size / 2;

    ctx.save();

    // Body
    ctx.fillStyle = "#39FF14"; // Neon green
    ctx.shadowColor = "#39FF14";
    ctx.shadowBlur = 8;
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
    // Back legs
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

    ctx.save();
    ctx.fillStyle = render.color || "#00F3FF"; // Neon Cyan
    ctx.shadowColor = render.color || "#00F3FF";
    ctx.shadowBlur = 10;

    // Body
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 6);
    ctx.fill();

    // Windshield
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

    // Trailer
    ctx.fillStyle = "#FF2A6D"; // Neon pink trailer
    ctx.shadowColor = "#FF2A6D";
    ctx.shadowBlur = 8;
    ctx.fillRect(-halfW, -halfH, width * 0.7, height);

    // Cab
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

    ctx.save();
    ctx.fillStyle = "#8B5A2B"; // Wood brown
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 10);
    ctx.fill();

    // Bark details
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
    const height = 30;
    const halfW = width / 2;

    ctx.save();

    // Draw shell segments along length
    const segmentCount = Math.floor(width / 35);
    const step = width / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const segX = -halfW + i * step + step / 2;
      ctx.fillStyle = "#00D2FF";
      ctx.shadowColor = "#00D2FF";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(segX, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0088CC";
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
    const pad = world.getComponent(entity, "GoalLilyPad");
    const render = world.getComponent(entity, "Render");
    if (!render || !pad) return;

    const size = render.size || 36;
    const half = size / 2;

    ctx.save();

    // Pad
    ctx.fillStyle = pad.occupied ? "#39FF14" : "#00AA44";
    ctx.beginPath();
    ctx.arc(0, 0, half, 0.2, Math.PI * 1.8);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    if (pad.occupied) {
      // Frogger on pad
      ctx.fillStyle = "#39FF14";
      ctx.shadowColor = "#39FF14";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Flower in center
      ctx.fillStyle = "#FF007F";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};

export const froggerBackgroundCanvasEffect: EffectDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world) {
    const config = world.getResource<typeof DEFAULT_FROGGER_CONFIG>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const w = config.SCREEN_WIDTH;
    const grid = config.GRID_SIZE;

    // Row 0: Goal Bank
    ctx.fillStyle = "#0B2B16"; // Dark green grass bank
    ctx.fillRect(0, 0, w, grid);

    // Rows 1-5: River Zone
    ctx.fillStyle = "#051C33"; // Deep neon blue water
    ctx.fillRect(0, grid * 1, w, grid * 5);

    // River water ripple lines
    ctx.strokeStyle = "rgba(0, 243, 255, 0.15)";
    ctx.lineWidth = 1;
    const offset = (world.tick * 1.5) % 40;
    for (let r = 1; r <= 5; r++) {
      ctx.beginPath();
      ctx.moveTo(-40 + offset, r * grid + grid / 2);
      ctx.lineTo(w + 40 + offset, r * grid + grid / 2);
      ctx.stroke();
    }

    // Row 6: Safe Grass Median
    ctx.fillStyle = "#0B2B16";
    ctx.fillRect(0, grid * 6, w, grid);

    // Rows 7-11: Road Zone
    ctx.fillStyle = "#121218"; // Dark asphalt
    ctx.fillRect(0, grid * 7, w, grid * 5);

    // Road lane markings
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

    // Rows 12-14: Starting Bank
    ctx.fillStyle = "#0B2B16";
    ctx.fillRect(0, grid * 12, w, grid * 3);
  },
};
