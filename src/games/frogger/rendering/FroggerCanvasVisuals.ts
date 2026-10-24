import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import {
  resolveFroggerPlayerDrawContext,
  resolveFroggerShellSegments,
  resolveFroggerGoalContext,
  resolveFroggerBackgroundContext,
  resolveFroggerSlotColors,
  resolveFroggerVehicleDirection,
  resolveFroggerFacingRotation,
  resolveFroggerTurtleVisualState,
} from "./FroggerRenderUtils";
import { FROGGER_BACKGROUND_ROWS, FROGGER_VISUAL_TOKENS } from "./FroggerVisualTokens";

export const drawFroggerCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const playerCtx = resolveFroggerPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { half, isInvuln, primaryColor } = playerCtx;
    const facing = world.getComponent(entity, "Frogger")?.facing;
    const scale = half / 16;

    ctx.save();
    ctx.rotate(resolveFroggerFacingRotation(facing));
    ctx.scale(scale, scale);

    // Contact shadow keeps the frog separate from the background without neon glow.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.beginPath();
    ctx.ellipse(0, 8, 9.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear feet and toes sit behind the body.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.limbs;
    ctx.beginPath();
    ctx.ellipse(-8, 5, 4.5, 5.5, -0.35, 0, Math.PI * 2);
    ctx.ellipse(8, 5, 4.5, 5.5, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-10, 9, 3.5, 2.1, -0.3, 0, Math.PI * 2);
    ctx.ellipse(-6, 10, 3.1, 1.8, 0.1, 0, Math.PI * 2);
    ctx.ellipse(10, 9, 3.5, 2.1, 0.3, 0, Math.PI * 2);
    ctx.ellipse(6, 10, 3.1, 1.8, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Forearms extend to the sides; all proportions are art-only.
    ctx.strokeStyle = FROGGER_VISUAL_TOKENS.frog.limbs;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-10, 3);
    ctx.moveTo(5, 0);
    ctx.lineTo(10, 3);
    ctx.stroke();
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.body;
    ctx.beginPath();
    ctx.arc(-10, 3, 2.3, 0, Math.PI * 2);
    ctx.arc(10, 3, 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Compact body and pale belly make the character read as a frog, not a green dot.
    ctx.fillStyle = isInvuln ? FROGGER_VISUAL_TOKENS.frog.invulnerable : primaryColor;
    ctx.beginPath();
    ctx.ellipse(0, 2, 8.2, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.belly;
    ctx.beginPath();
    ctx.ellipse(0, 4.5, 4.8, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head, eye stalks, eyes and pupils point in the stored facing direction.
    ctx.fillStyle = isInvuln ? FROGGER_VISUAL_TOKENS.frog.invulnerable : primaryColor;
    ctx.beginPath();
    ctx.ellipse(0, -5.2, 8.6, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.highlight;
    ctx.beginPath();
    ctx.ellipse(-2.2, -8.2, 3.3, 1.1, -0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.body;
    ctx.beginPath();
    ctx.ellipse(-3.6, -9.1, 3.2, 4.1, -0.1, 0, Math.PI * 2);
    ctx.ellipse(3.6, -9.1, 3.2, 4.1, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.eyes;
    ctx.beginPath();
    ctx.ellipse(-3.6, -9.2, 2.55, 3.25, 0, 0, Math.PI * 2);
    ctx.ellipse(3.6, -9.2, 2.55, 3.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.pupils;
    ctx.beginPath();
    ctx.ellipse(-3.6, -10.1, 1.15, 1.65, 0, 0, Math.PI * 2);
    ctx.ellipse(3.6, -10.1, 1.15, 1.65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

function drawCanvasVehicleBeam(
  ctx: CanvasRenderingContext2D,
  halfWidth: number,
  height: number,
  length: number
): void {
  ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.headlightBeam;
  ctx.beginPath();
  ctx.moveTo(halfWidth - 2, -height * 0.2);
  ctx.lineTo(halfWidth + length, -height * 0.62);
  ctx.lineTo(halfWidth + length, height * 0.62);
  ctx.lineTo(halfWidth - 2, height * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawCanvasVehicleTires(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isTruck: boolean
): void {
  ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.tires;
  const wheelCount = isTruck ? 3 : 2;
  for (let index = 0; index < wheelCount; index += 1) {
    const centerX = isTruck
      ? (index === 0 ? -width * 0.34 : index === 1 ? -width * 0.08 : width * 0.36)
      : (index === 0 ? -width * 0.27 : width * 0.27);
    ctx.beginPath();
    ctx.roundRect(centerX - 3.5, -height * 0.48, 7, 4.5, 1.5);
    ctx.roundRect(centerX - 3.5, height * 0.28, 7, 4.5, 1.5);
    ctx.fill();
  }
}

function drawCanvasVehicleLights(
  ctx: CanvasRenderingContext2D,
  halfWidth: number,
  height: number
): void {
  ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.headlights;
  ctx.beginPath();
  ctx.roundRect(halfWidth - 4, -height * 0.34, 3.5, 3, 1);
  ctx.roundRect(halfWidth - 4, height * 0.21, 3.5, 3, 1);
  ctx.fill();

  ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.taillights;
  ctx.beginPath();
  ctx.roundRect(-halfWidth + 0.5, -height * 0.34, 3, 3, 1);
  ctx.roundRect(-halfWidth + 0.5, height * 0.21, 3, 3, 1);
  ctx.fill();
}

export const drawCarCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 48;
    // Keep the art lower than the 30px gameplay collider.
    const height = Math.min(24, Math.max(18, width * 0.46));
    const halfW = width / 2;
    const halfH = height / 2;
    const direction = resolveFroggerVehicleDirection(world.getComponent(entity, "Vehicle")?.direction);
    const carColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.cars[0];

    ctx.save();
    ctx.scale(direction, 1);

    // The beam is deliberately faint and ends close to the car, preserving road readability.
    drawCanvasVehicleBeam(ctx, halfW, height, width * 0.42);

    // Soft offset shadow and tires remain within the existing visual footprint.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.beginPath();
    ctx.roundRect(-halfW + 1, -halfH + FROGGER_VISUAL_TOKENS.shadows.offsetY + 1, width - 2, height - 1, 6);
    ctx.fill();
    drawCanvasVehicleTires(ctx, width, height, false);

    // Low, rounded body with a tapered nose. The direction sign mirrors this exact silhouette.
    ctx.fillStyle = carColor;
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, -halfH);
    ctx.lineTo(halfW - 7, -halfH);
    ctx.quadraticCurveTo(halfW - 2, -halfH, halfW, -halfH + 4);
    ctx.lineTo(halfW, halfH - 4);
    ctx.quadraticCurveTo(halfW - 2, halfH, halfW - 7, halfH);
    ctx.lineTo(-halfW + 4, halfH);
    ctx.quadraticCurveTo(-halfW, halfH, -halfW, halfH - 4);
    ctx.lineTo(-halfW, -halfH + 4);
    ctx.quadraticCurveTo(-halfW, -halfH, -halfW + 4, -halfH);
    ctx.closePath();
    ctx.fill();

    // Hood highlight and low-profile cabin.
    ctx.fillStyle = "rgba(242, 238, 227, 0.18)";
    ctx.beginPath();
    ctx.roundRect(halfW * 0.18, -halfH * 0.64, halfW * 0.58, 2.2, 1);
    ctx.fill();

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.glass;
    ctx.beginPath();
    ctx.roundRect(-width * 0.13, -height * 0.31, width * 0.27, height * 0.62, 2.5);
    ctx.roundRect(width * 0.17, -height * 0.28, width * 0.10, height * 0.56, 1.5);
    ctx.roundRect(-width * 0.34, -height * 0.25, width * 0.09, height * 0.5, 1.5);
    ctx.fill();

    drawCanvasVehicleLights(ctx, halfW, height);
    ctx.restore();
  },
};

export const drawTruckCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const width = render.size || 80;
    const height = Math.min(27, Math.max(23, width * 0.34));
    const halfW = width / 2;
    const halfH = height / 2;
    const direction = resolveFroggerVehicleDirection(world.getComponent(entity, "Vehicle")?.direction);
    const truckColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.truck;

    ctx.save();
    ctx.scale(direction, 1);

    drawCanvasVehicleBeam(ctx, halfW, height, width * 0.4);

    // Shadow, tandem wheels and cargo box.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.beginPath();
    ctx.roundRect(-halfW + 1, -halfH + FROGGER_VISUAL_TOKENS.shadows.offsetY + 1, width - 2, height - 1, 3);
    ctx.fill();
    drawCanvasVehicleTires(ctx, width, height, true);

    ctx.fillStyle = truckColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 1, -halfH + 1, width * 0.69, height - 2, 3);
    ctx.fill();

    // Cargo-panel seams are faint so the truck remains readable at mobile scale.
    ctx.strokeStyle = FROGGER_VISUAL_TOKENS.vehicles.truckDetail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-halfW + 7, -halfH + 4);
    ctx.lineTo(-halfW + width * 0.63, -halfH + 4);
    ctx.moveTo(-halfW + 7, halfH - 4);
    ctx.lineTo(-halfW + width * 0.63, halfH - 4);
    ctx.stroke();

    // Cab is always at the front, even when the vehicle travels left.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.truckCab;
    ctx.beginPath();
    ctx.roundRect(halfW - width * 0.31, -halfH + 2, width * 0.29, height - 4, 3);
    ctx.fill();

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.vehicles.glass;
    ctx.beginPath();
    ctx.roundRect(halfW - 7, -height * 0.31, 4, height * 0.62, 1);
    ctx.fill();

    drawCanvasVehicleLights(ctx, halfW, height);
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
    const grainColor = FROGGER_VISUAL_TOKENS.logs.grain;

    ctx.save();

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.beginPath();
    ctx.roundRect(-halfW + 1, -halfH + FROGGER_VISUAL_TOKENS.shadows.offsetY + 2, width - 2, height - 1, 10);
    ctx.fill();

    ctx.fillStyle = logColor;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, 10);
    ctx.fill();

    // Warm upper rim and bark grain; marks stay sparse at mobile scale.
    ctx.strokeStyle = FROGGER_VISUAL_TOKENS.logs.barkHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-halfW + 13, -halfH + 4);
    ctx.lineTo(halfW - 13, -halfH + 4);
    ctx.stroke();

    ctx.strokeStyle = grainColor;
    ctx.lineWidth = 1.6;
    const lineCount = Math.max(2, Math.floor(width / 38));
    for (let i = 0; i < lineCount; i += 1) {
      const x1 = -halfW + 18 + i * ((width - 36) / lineCount);
      const y1 = i % 2 === 0 ? -4 : 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(Math.min(x1 + 14 + (i % 3) * 4, halfW - 14), y1 - (i % 2 === 0 ? 1 : -1));
      ctx.stroke();
    }

    // End grain rings make the long platform read as timber.
    for (let endIndex = 0; endIndex < 2; endIndex += 1) {
      const endX = endIndex === 0 ? -halfW + 6 : halfW - 6;
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.logs.grain;
      ctx.beginPath();
      ctx.ellipse(endX, 0, 5.8, halfH - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.logs.ring;
      ctx.beginPath();
      ctx.ellipse(endX, 0, 4.3, halfH - 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.logs.endGrain;
      ctx.beginPath();
      ctx.ellipse(endX, 0, 2.8, halfH - 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = FROGGER_VISUAL_TOKENS.logs.grain;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(endX, 0, 1.3, Math.max(2, halfH - 8), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

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
    const visual = resolveFroggerTurtleVisualState(log?.divePhase);
    const direction = resolveFroggerVehicleDirection(log?.direction);
    const halfW = width / 2;

    ctx.save();
    ctx.globalAlpha *= visual.opacity;
    if (log?.divePhase === "submerged") ctx.scale(1, 0.78);

    // Feet and neck are drawn before the shell to establish a readable creature silhouette.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.turtles.skin;
    for (let i = 0; i < segments.length; i += 1) {
      const x = segments[i].segX;
      ctx.beginPath();
      ctx.ellipse(x - 8, -10, 3.8, 3, -0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 8, -10, 3.8, 3, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x - 8, 10, 3.8, 3, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 8, 10, 3.8, 3, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < segments.length; i += 1) {
      const x = segments[i].segX;
      ctx.fillStyle = visual.bodyColor;
      ctx.beginPath();
      ctx.ellipse(x, 0, 12.5, 14.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = visual.shellColor;
      ctx.beginPath();
      ctx.ellipse(x, 0, 10.4, 12.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = FROGGER_VISUAL_TOKENS.turtles.shellHighlight;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, 0, 8.5, 10.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = FROGGER_VISUAL_TOKENS.turtles.shellLine;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x, 10);
      ctx.moveTo(x - 8, -5);
      ctx.lineTo(x + 8, -5);
      ctx.moveTo(x - 8, 5);
      ctx.lineTo(x + 8, 5);
      ctx.moveTo(x - 4, -9);
      ctx.lineTo(x - 7, -4);
      ctx.moveTo(x + 4, 9);
      ctx.lineTo(x + 7, 4);
      ctx.stroke();
    }

    // A shared leading head follows the floating group's real direction.
    const headX = direction * (halfW - 8);
    ctx.fillStyle = visual.bodyColor;
    ctx.beginPath();
    ctx.ellipse(headX, 0, 7.8, 6.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.eyes;
    ctx.beginPath();
    ctx.arc(headX + direction * 2, -2.1, 1.45, 0, Math.PI * 2);
    ctx.arc(headX + direction * 2, 2.1, 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.pupils;
    ctx.beginPath();
    ctx.arc(headX + direction * 2.3, -2.1, 0.65, 0, Math.PI * 2);
    ctx.arc(headX + direction * 2.3, 2.1, 0.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

export const drawCrocodileCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const log = world.getComponent(entity, "Log");
    if (!render) return;

    const width = render.size || 100;
    const height = 30;
    const halfW = width / 2;
    const direction = resolveFroggerVehicleDirection(log?.direction);
    const bodyColor = render.color || FROGGER_VISUAL_TOKENS.crocodile.body;

    ctx.save();
    ctx.scale(direction, 1);

    ctx.fillStyle = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.beginPath();
    ctx.ellipse(0, 4, halfW - 2, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail tapers into a long reptilian body.
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(-halfW + 20, -6);
    ctx.quadraticCurveTo(-halfW + 32, -9, -halfW + 44, -7);
    ctx.lineTo(halfW - 22, -7);
    ctx.quadraticCurveTo(halfW - 8, -7, halfW - 5, -3);
    ctx.lineTo(halfW, -2);
    ctx.lineTo(halfW, 2);
    ctx.lineTo(halfW - 7, 3);
    ctx.quadraticCurveTo(halfW - 14, 8, halfW - 26, 7);
    ctx.lineTo(-halfW + 30, 6);
    ctx.quadraticCurveTo(-halfW + 15, 6, -halfW, 0);
    ctx.closePath();
    ctx.fill();

    // Four short legs, kept inside the obstacle's existing visual footprint.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.body;
    for (let leg = 0; leg < 2; leg += 1) {
      const legX = leg === 0 ? -width * 0.28 : width * 0.22;
      ctx.beginPath();
      ctx.ellipse(legX, -10, 5.5, 3.8, -0.35, 0, Math.PI * 2);
      ctx.ellipse(legX, 10, 5.5, 3.8, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dorsal bands use a dark botanical green instead of a bright outline.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.dorsal;
    for (let band = 0; band < 4; band += 1) {
      const bandX = -width * 0.12 + band * width * 0.12;
      ctx.beginPath();
      ctx.roundRect(bandX, -7, 5.5, 14, 2);
      ctx.fill();
    }

    // Snout and mouth reflect the current gameplay danger flag.
    const jawX = halfW - 24;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(jawX, -7, 22, 10, 4);
    ctx.fill();

    if (log?.mouthOpen) {
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.mouth;
      ctx.beginPath();
      ctx.moveTo(jawX + 1, -1);
      ctx.lineTo(halfW, -1);
      ctx.lineTo(halfW, 5);
      ctx.lineTo(jawX + 3, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.teeth;
      for (let tooth = 0; tooth < 3; tooth += 1) {
        const toothX = jawX + 5 + tooth * 5;
        ctx.beginPath();
        ctx.moveTo(toothX, -1);
        ctx.lineTo(toothX + 2.2, -1);
        ctx.lineTo(toothX + 1.1, 1.6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = FROGGER_VISUAL_TOKENS.crocodile.dorsal;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(jawX + 2, 1.5);
      ctx.lineTo(halfW - 2, 1.5);
      ctx.stroke();
    }

    // Coral eyes are reserved as the danger cue.
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.underbelly;
    ctx.beginPath();
    ctx.arc(halfW - 23, -5.5, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.eyes;
    ctx.beginPath();
    ctx.arc(halfW - 23, -5.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

function drawCanvasGoalFrog(ctx: CanvasRenderingContext2D, half: number): void {
  ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.body;
  ctx.beginPath();
  ctx.ellipse(0, 2, half * 0.43, half * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.eyes;
  ctx.beginPath();
  ctx.arc(-half * 0.27, -half * 0.26, half * 0.17, 0, Math.PI * 2);
  ctx.arc(half * 0.27, -half * 0.26, half * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FROGGER_VISUAL_TOKENS.frog.pupils;
  ctx.beginPath();
  ctx.arc(-half * 0.27, -half * 0.29, half * 0.07, 0, Math.PI * 2);
  ctx.arc(half * 0.27, -half * 0.29, half * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

export const drawLilyPadCanvas: ShapeDrawer<CanvasRenderingContext2D, FroggerComponentRegistry> = {
  draw(ctx, world, entity) {
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied, pad } = goalCtx;
    const { slotColor, occupiedColor } = resolveFroggerSlotColors(world);
    const hasCrocodile = !!pad.hasCrocodile;
    const hasFly = !!pad.hasFly;

    ctx.save();
    ctx.fillStyle = FROGGER_VISUAL_TOKENS.shadows.color;
    ctx.beginPath();
    ctx.ellipse(1, 3, half, half * 0.83, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leaf notch at the upper-right gives each goal the classic lily-pad silhouette.
    ctx.fillStyle = occupied ? occupiedColor : slotColor;
    ctx.beginPath();
    ctx.arc(0, 0, half, Math.PI * 0.25, Math.PI * 1.9);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FROGGER_VISUAL_TOKENS.lilyPads.edge;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.strokeStyle = FROGGER_VISUAL_TOKENS.lilyPads.vein;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(half * 0.35, -half * 0.48);
    ctx.moveTo(0, 0);
    ctx.lineTo(half * 0.55, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(half * 0.28, half * 0.5);
    ctx.moveTo(0, 0);
    ctx.lineTo(-half * 0.48, half * 0.2);
    ctx.moveTo(0, 0);
    ctx.lineTo(-half * 0.38, -half * 0.35);
    ctx.stroke();

    if (occupied) {
      drawCanvasGoalFrog(ctx, half);
    } else if (hasCrocodile) {
      // A compact warning silhouette stays visible even at the goal's small size.
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, half * 0.68, half * 0.24, 0, 0, Math.PI * 2);
      ctx.roundRect(-half * 0.6, -half * 0.28, half * 0.7, half * 0.28, 2);
      ctx.fill();
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.lilyPads.danger;
      ctx.beginPath();
      ctx.arc(half * 0.28, -half * 0.12, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (hasFly) {
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.lilyPads.flower;
      ctx.beginPath();
      ctx.ellipse(-2.5, -1, 2.8, 1.8, -0.45, 0, Math.PI * 2);
      ctx.ellipse(2.5, -1, 2.8, 1.8, 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.crocodile.dorsal;
      ctx.beginPath();
      ctx.ellipse(0, 1, 1.3, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = FROGGER_VISUAL_TOKENS.lilyPads.flower;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
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
