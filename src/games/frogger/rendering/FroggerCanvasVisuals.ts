import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import {
  resolveFroggerPlayerDrawContext,
  resolveFroggerShellSegments,
  resolveFroggerGoalContext,
  resolveFroggerBackgroundContext,
  resolveFroggerSlotColors,
} from "./FroggerRenderUtils";
import { FROGGER_BACKGROUND_ROWS, FROGGER_VISUAL_TOKENS } from "./FroggerVisualTokens";

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

    ctx.fillStyle = isInvuln ? FROGGER_VISUAL_TOKENS.frog.invulnerable : primaryColor;
    ctx.shadowColor = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.shadowBlur = FROGGER_VISUAL_TOKENS.shadows.blur;
    ctx.shadowOffsetY = FROGGER_VISUAL_TOKENS.shadows.offsetY;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.eyes;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.arc(-half * 0.4, -half * 0.5, half * 0.35, 0, Math.PI * 2);
    ctx.arc(half * 0.4, -half * 0.5, half * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.pupils;
    ctx.beginPath();
    ctx.arc(-half * 0.4, -half * 0.55, half * 0.18, 0, Math.PI * 2);
    ctx.arc(half * 0.4, -half * 0.55, half * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = FROGGER_VISUAL_TOKENS.frog.limbs;
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
  draw(ctx, _world, entity) {
    const render = _world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 48;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;

    const carColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.cars[0];
    ctx.save();
    ctx.fillStyle = carColor;
    ctx.shadowColor = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.shadowBlur = FROGGER_VISUAL_TOKENS.shadows.blur;
    ctx.shadowOffsetY = FROGGER_VISUAL_TOKENS.shadows.offsetY;

    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 6);
    ctx.fill();

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.glass;
    ctx.fillRect(-halfW * 0.4, -halfH * 0.6, width * 0.4, height * 0.5);

    ctx.restore();
  },
};

export const drawTruckCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, _world, entity) {
    const render = _world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 80;
    const height = 32;
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.save();

    const truckColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.truck;
    ctx.fillStyle = truckColor;
    ctx.shadowColor = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.shadowBlur = FROGGER_VISUAL_TOKENS.shadows.blur;
    ctx.shadowOffsetY = FROGGER_VISUAL_TOKENS.shadows.offsetY;
    ctx.fillRect(-halfW, -halfH, width * 0.7, height);

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.truckCab;
    ctx.fillRect(halfW - width * 0.28, -halfH + 2, width * 0.28, height - 4);

    ctx.restore();
  },
};

export const drawLogCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, _world, entity) {
    const render = _world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 120;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;

    const logColor = render.color || FROGGER_VISUAL_TOKENS.logs.body;

    ctx.save();
    ctx.fillStyle = logColor;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 10);
    ctx.fill();

    ctx.strokeStyle = FROGGER_VISUAL_TOKENS.logs.grain;
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

    const log = world.getComponent(entity, "Log");
    const isWarning = log?.divePhase === "warning";
    const isSubmerged = log?.divePhase === "submerged";
    const turtleColor = isWarning
      ? FROGGER_VISUAL_TOKENS.turtles.warning
      : isSubmerged
        ? FROGGER_VISUAL_TOKENS.turtles.submerged
        : (render.color || FROGGER_VISUAL_TOKENS.turtles.body);
    const innerColor = FROGGER_VISUAL_TOKENS.turtles.shell;

    ctx.save();

    for (let i = 0; i < segments.length; i++) {
      const segX = segments[i].segX;
      ctx.fillStyle = turtleColor;
      ctx.shadowColor = FROGGER_VISUAL_TOKENS.shadows.color;
      ctx.shadowBlur = FROGGER_VISUAL_TOKENS.shadows.blur;
      ctx.shadowOffsetY = FROGGER_VISUAL_TOKENS.shadows.offsetY;
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

export const drawCrocodileCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, _world, entity) {
    const render = _world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 100;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;

    const crocColor = render.color || FROGGER_VISUAL_TOKENS.crocodile.body;

    ctx.save();
    ctx.fillStyle = crocColor;
    ctx.shadowColor = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.shadowBlur = FROGGER_VISUAL_TOKENS.shadows.blur;
    ctx.shadowOffsetY = FROGGER_VISUAL_TOKENS.shadows.offsetY;

    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 8);
    ctx.fill();

    // Eyes
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.eyes;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(halfW - 12, -halfH + 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

export const drawLilyPadCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied } = goalCtx;

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
      ctx.shadowColor = FROGGER_VISUAL_TOKENS.shadows.color;
      ctx.shadowBlur = FROGGER_VISUAL_TOKENS.shadows.blur;
      ctx.shadowOffsetY = FROGGER_VISUAL_TOKENS.shadows.offsetY;
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.lilyPads.flower;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};

export const froggerBackgroundCanvasEffect: EffectDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world) {
    const { w, grid } = resolveFroggerBackgroundContext(world);
    const rows = FROGGER_BACKGROUND_ROWS;
    const palette = FROGGER_VISUAL_TOKENS.surfaces;
    const riverY = rows.riverStart * grid;
    const riverHeight = rows.riverRows * grid;
    const medianY = rows.median * grid;
    const roadY = rows.roadStart * grid;
    const roadHeight = rows.roadRows * grid;
    const startY = rows.startBank * grid;
    const startHeight = rows.startRows * grid;

    ctx.save();

    // Upper goal bank.
    ctx.fillStyle = palette.bank;
    ctx.fillRect(0, 0, w, grid);
    ctx.fillStyle = palette.bankHighlight;
    ctx.fillRect(0, 0, w, 3);
    ctx.fillStyle = palette.bankShadow;
    ctx.fillRect(0, grid - 4, w, 4);

    // River: a restrained vertical gradient, with slow, low-contrast wave marks.
    const riverGradient = ctx.createLinearGradient(0, riverY, 0, riverY + riverHeight);
    riverGradient.addColorStop(0, palette.riverShallow);
    riverGradient.addColorStop(0.55, palette.riverMid);
    riverGradient.addColorStop(1, palette.riverDeep);
    ctx.fillStyle = riverGradient;
    ctx.fillRect(0, riverY, w, riverHeight);

    const flowOffset = (world.tick * 0.35) % 96;
    ctx.strokeStyle = palette.waterFlow;
    ctx.lineWidth = 1.5;
    for (let lane = 0; lane < rows.riverRows; lane += 1) {
      const lineY = riverY + lane * grid + grid * 0.34 + (lane % 2) * 5;
      const laneOffset = lane % 2 === 0 ? flowOffset : (flowOffset + 48) % 96;
      for (let x = -96 + laneOffset; x < w + 96; x += 96) {
        ctx.beginPath();
        ctx.moveTo(x, lineY);
        ctx.lineTo(x + 8, lineY - 2);
        ctx.lineTo(x + 18, lineY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 38, lineY + 10);
        ctx.lineTo(x + 50, lineY + 8);
        ctx.stroke();
      }
    }

    // Safe median is visually distinct from both river and roadway.
    ctx.fillStyle = palette.bank;
    ctx.fillRect(0, medianY, w, grid);
    ctx.fillStyle = palette.bankShadow;
    ctx.fillRect(0, medianY, w, 3);
    ctx.fillRect(0, medianY + grid - 3, w, 3);
    ctx.strokeStyle = palette.medianDivider;
    ctx.lineWidth = 1;
    for (let x = 12; x < w; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, medianY + 13);
      ctx.lineTo(x + 10, medianY + 13);
      ctx.moveTo(x + 5, medianY + 25);
      ctx.lineTo(x + 17, medianY + 25);
      ctx.stroke();
    }

    // Road surface and four separators between the five traffic lanes.
    ctx.fillStyle = palette.asphalt;
    ctx.fillRect(0, roadY, w, roadHeight);
    ctx.fillStyle = palette.roadEdge;
    ctx.fillRect(0, roadY, w, 3);
    ctx.fillRect(0, roadY + roadHeight - 3, w, 3);

    ctx.strokeStyle = palette.laneDivider;
    ctx.lineWidth = 2;
    for (let separator = 1; separator < rows.roadRows; separator += 1) {
      const lineY = roadY + separator * grid;
      for (let x = 0; x < w; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, lineY);
        ctx.lineTo(Math.min(x + 8, w), lineY);
        ctx.stroke();
      }
    }

    // Starting bank: warm paving with subdued, evenly spaced joints.
    ctx.fillStyle = palette.bank;
    ctx.fillRect(0, startY, w, startHeight);
    ctx.fillStyle = palette.bankHighlight;
    ctx.fillRect(0, startY, w, 3);
    ctx.fillStyle = palette.bankShadow;
    ctx.fillRect(0, startY + startHeight - 4, w, 4);
    ctx.strokeStyle = palette.bankTileLine;
    ctx.lineWidth = 1;
    for (let x = grid; x < w; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, startY + 4);
      ctx.lineTo(x, startY + startHeight - 4);
      ctx.stroke();
    }
    for (let y = startY + grid; y < startY + startHeight; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.restore();
  },
};
