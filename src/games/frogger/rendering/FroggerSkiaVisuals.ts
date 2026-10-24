import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { SkShader } from "@shopify/react-native-skia";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { Skia, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { getVisibleSkiaRender } from "../../shared/rendering/renderingUtils";
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

function drawSkiaRoundedBox(
  canvas: SkCanvas,
  width: number,
  height: number,
  color: string,
  rx = 6,
  ry = 6
): void {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  const rect = Skia.RRectXY(Skia.XYWHRect(-width / 2, -height / 2, width, height), rx, ry);
  canvas.drawRRect(rect, paint);
}

export const drawFroggerSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const playerCtx = resolveFroggerPlayerDrawContext(world, entity);
    if (!playerCtx || !Skia) return;

    const { half, isInvuln, primaryColor } = playerCtx;
    const facing = world.getComponent(entity, "Frogger")?.facing;
    const scale = half / 16;

    canvas.save();
    canvas.rotate((resolveFroggerFacingRotation(facing) * 180) / Math.PI, 0, 0);
    canvas.scale(scale, scale);

    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.shadows.color));
    canvas.drawOval(Skia.XYWHRect(-9.5, 4, 19, 8), shadowPaint);

    const limbPaint = Skia.Paint();
    limbPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.limbs));
    canvas.drawOval(Skia.XYWHRect(-12.5, -0.5, 9, 11), limbPaint);
    canvas.drawOval(Skia.XYWHRect(3.5, -0.5, 9, 11), limbPaint);
    canvas.drawOval(Skia.XYWHRect(-13.5, 6.9, 7, 4.2), limbPaint);
    canvas.drawOval(Skia.XYWHRect(-7.6, 8.2, 6.2, 3.6), limbPaint);
    canvas.drawOval(Skia.XYWHRect(6.5, 6.9, 7, 4.2), limbPaint);
    canvas.drawOval(Skia.XYWHRect(1.4, 8.2, 6.2, 3.6), limbPaint);

    const armPath = Skia.Path.Make();
    armPath.moveTo(-5, 0);
    armPath.lineTo(-10, 3);
    armPath.moveTo(5, 0);
    armPath.lineTo(10, 3);
    const armPaint = Skia.Paint();
    armPaint.setStyle(Skia.PaintStyle.Stroke);
    armPaint.setStrokeWidth(3);
    armPaint.setStrokeCap(Skia.StrokeCap.Round);
    armPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.limbs));
    canvas.drawPath(armPath, armPaint);

    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(isInvuln ? FROGGER_VISUAL_TOKENS.frog.invulnerable : primaryColor));
    canvas.drawOval(Skia.XYWHRect(-8.2, -8.5, 16.4, 21), bodyPaint);

    const bellyPaint = Skia.Paint();
    bellyPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.belly));
    canvas.drawOval(Skia.XYWHRect(-4.8, -1.7, 9.6, 12.4), bellyPaint);

    canvas.drawOval(Skia.XYWHRect(-8.6, -12, 17.2, 13.6), bodyPaint);

    const highlightPaint = Skia.Paint();
    highlightPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.highlight));
    canvas.drawOval(Skia.XYWHRect(-5.5, -9.3, 6.6, 2.2), highlightPaint);

    const eyeStalkPaint = Skia.Paint();
    eyeStalkPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.body));
    canvas.drawOval(Skia.XYWHRect(-6.8, -13.2, 6.4, 8.2), eyeStalkPaint);
    canvas.drawOval(Skia.XYWHRect(0.4, -13.2, 6.4, 8.2), eyeStalkPaint);

    const eyePaint = Skia.Paint();
    eyePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.eyes));
    canvas.drawOval(Skia.XYWHRect(-6.15, -12.45, 5.1, 6.5), eyePaint);
    canvas.drawOval(Skia.XYWHRect(1.05, -12.45, 5.1, 6.5), eyePaint);

    const pupilPaint = Skia.Paint();
    pupilPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.pupils));
    canvas.drawOval(Skia.XYWHRect(-4.75, -11.75, 2.3, 3.3), pupilPaint);
    canvas.drawOval(Skia.XYWHRect(2.45, -11.75, 2.3, 3.3), pupilPaint);

    canvas.restore();
  },
};

function drawSkiaVehicleBeam(
  canvas: SkCanvas,
  halfWidth: number,
  height: number,
  length: number
): void {
  const beam = Skia.Path.Make();
  beam.moveTo(halfWidth - 2, -height * 0.2);
  beam.lineTo(halfWidth + length, -height * 0.62);
  beam.lineTo(halfWidth + length, height * 0.62);
  beam.lineTo(halfWidth - 2, height * 0.2);
  beam.close();

  const paint = Skia.Paint();
  paint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.headlightBeam));
  canvas.drawPath(beam, paint);
}

function drawSkiaVehicleTires(
  canvas: SkCanvas,
  width: number,
  height: number,
  isTruck: boolean
): void {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.tires));
  const wheelCount = isTruck ? 3 : 2;
  for (let index = 0; index < wheelCount; index += 1) {
    const centerX = isTruck
      ? (index === 0 ? -width * 0.34 : index === 1 ? -width * 0.08 : width * 0.36)
      : (index === 0 ? -width * 0.27 : width * 0.27);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(centerX - 3.5, -height * 0.48, 7, 4.5), 1.5, 1.5),
      paint
    );
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(centerX - 3.5, height * 0.28, 7, 4.5), 1.5, 1.5),
      paint
    );
  }
}

function drawSkiaVehicleLights(canvas: SkCanvas, halfWidth: number, height: number): void {
  const headlightPaint = Skia.Paint();
  headlightPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.headlights));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(halfWidth - 4, -height * 0.34, 3.5, 3), 1, 1),
    headlightPaint
  );
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(halfWidth - 4, height * 0.21, 3.5, 3), 1, 1),
    headlightPaint
  );

  const taillightPaint = Skia.Paint();
  taillightPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.taillights));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(-halfWidth + 0.5, -height * 0.34, 3, 3), 1, 1),
    taillightPaint
  );
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(-halfWidth + 0.5, height * 0.21, 3, 3), 1, 1),
    taillightPaint
  );
}

export const drawCarSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 48;
    // Keep the art lower than the 30px gameplay collider.
    const height = Math.min(24, Math.max(18, width * 0.46));
    const halfW = width / 2;
    const halfH = height / 2;
    const direction = resolveFroggerVehicleDirection(world.getComponent(entity, "Vehicle")?.direction);
    const carColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.cars[0];

    canvas.save();
    canvas.scale(direction, 1);

    drawSkiaVehicleBeam(canvas, halfW, height, width * 0.42);

    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.shadows.color));
    canvas.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(-halfW + 1, -halfH + FROGGER_VISUAL_TOKENS.shadows.offsetY + 1, width - 2, height - 1),
        6,
        6
      ),
      shadowPaint
    );
    drawSkiaVehicleTires(canvas, width, height, false);

    const bodyPath = Skia.Path.Make();
    bodyPath.moveTo(-halfW + 4, -halfH);
    bodyPath.lineTo(halfW - 7, -halfH);
    bodyPath.quadTo(halfW - 2, -halfH, halfW, -halfH + 4);
    bodyPath.lineTo(halfW, halfH - 4);
    bodyPath.quadTo(halfW - 2, halfH, halfW - 7, halfH);
    bodyPath.lineTo(-halfW + 4, halfH);
    bodyPath.quadTo(-halfW, halfH, -halfW, halfH - 4);
    bodyPath.lineTo(-halfW, -halfH + 4);
    bodyPath.quadTo(-halfW, -halfH, -halfW + 4, -halfH);
    bodyPath.close();

    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(carColor));
    canvas.drawPath(bodyPath, bodyPaint);

    const highlightPaint = Skia.Paint();
    highlightPaint.setColor(Skia.Color("rgba(242, 238, 227, 0.18)"));
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(halfW * 0.18, -halfH * 0.64, halfW * 0.58, 2.2), 1, 1),
      highlightPaint
    );

    const glassPaint = Skia.Paint();
    glassPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.glass));
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-width * 0.13, -height * 0.31, width * 0.27, height * 0.62), 2.5, 2.5),
      glassPaint
    );
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(width * 0.17, -height * 0.28, width * 0.10, height * 0.56), 1.5, 1.5),
      glassPaint
    );
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-width * 0.34, -height * 0.25, width * 0.09, height * 0.5), 1.5, 1.5),
      glassPaint
    );

    drawSkiaVehicleLights(canvas, halfW, height);
    canvas.restore();
  },
};

export const drawTruckSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 80;
    const height = Math.min(27, Math.max(23, width * 0.34));
    const halfW = width / 2;
    const halfH = height / 2;
    const direction = resolveFroggerVehicleDirection(world.getComponent(entity, "Vehicle")?.direction);
    const truckColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.truck;

    canvas.save();
    canvas.scale(direction, 1);

    drawSkiaVehicleBeam(canvas, halfW, height, width * 0.4);

    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.shadows.color));
    canvas.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(-halfW + 1, -halfH + FROGGER_VISUAL_TOKENS.shadows.offsetY + 1, width - 2, height - 1),
        3,
        3
      ),
      shadowPaint
    );
    drawSkiaVehicleTires(canvas, width, height, true);

    const trailerPaint = Skia.Paint();
    trailerPaint.setColor(Skia.Color(truckColor));
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-halfW + 1, -halfH + 1, width * 0.69, height - 2), 3, 3),
      trailerPaint
    );

    const seamPaint = Skia.Paint();
    seamPaint.setStyle(Skia.PaintStyle.Stroke);
    seamPaint.setStrokeWidth(1);
    seamPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.truckDetail));
    canvas.drawLine(-halfW + 7, -halfH + 4, -halfW + width * 0.63, -halfH + 4, seamPaint);
    canvas.drawLine(-halfW + 7, halfH - 4, -halfW + width * 0.63, halfH - 4, seamPaint);

    const cabPaint = Skia.Paint();
    cabPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.truckCab));
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(halfW - width * 0.31, -halfH + 2, width * 0.29, height - 4), 3, 3),
      cabPaint
    );

    const glassPaint = Skia.Paint();
    glassPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.glass));
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(halfW - 7, -height * 0.31, 4, height * 0.62), 1, 1),
      glassPaint
    );

    drawSkiaVehicleLights(canvas, halfW, height);
    canvas.restore();
  },
};

export const drawLogSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, _world, entity) {
    if (!Skia) return;
    const render = getVisibleSkiaRender(_world, entity);
    if (!render) return;

    const width = render.size || 120;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;
    const logColor = render.color || FROGGER_VISUAL_TOKENS.logs.body;

    canvas.save();
    canvas.translate(0, FROGGER_VISUAL_TOKENS.shadows.offsetY + 1);

    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.shadows.color));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-halfW + 1, -halfH + 1, width - 2, height - 1), 10, 10), shadowPaint);

    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(logColor));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-halfW, -halfH, width, height), 10, 10), bodyPaint);

    const highlightPaint = Skia.Paint();
    highlightPaint.setStyle(Skia.PaintStyle.Stroke);
    highlightPaint.setStrokeWidth(2);
    highlightPaint.setStrokeCap(Skia.StrokeCap.Round);
    highlightPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.logs.barkHighlight));
    canvas.drawLine(-halfW + 13, -halfH + 4, halfW - 13, -halfH + 4, highlightPaint);

    const grainPaint = Skia.Paint();
    grainPaint.setStyle(Skia.PaintStyle.Stroke);
    grainPaint.setStrokeWidth(1.6);
    grainPaint.setStrokeCap(Skia.StrokeCap.Round);
    grainPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.logs.grain));
    const lineCount = Math.max(2, Math.floor(width / 38));
    for (let i = 0; i < lineCount; i += 1) {
      const x1 = -halfW + 18 + i * ((width - 36) / lineCount);
      const y1 = i % 2 === 0 ? -4 : 3;
      canvas.drawLine(x1, y1, Math.min(x1 + 14 + (i % 3) * 4, halfW - 14), y1 - (i % 2 === 0 ? 1 : -1), grainPaint);
    }

    for (let endIndex = 0; endIndex < 2; endIndex += 1) {
      const endX = endIndex === 0 ? -halfW + 6 : halfW - 6;
      const outer = Skia.Paint();
      outer.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.logs.grain));
      canvas.drawOval(Skia.XYWHRect(endX - 5.8, -halfH + 1, 11.6, height - 2), outer);

      const ring = Skia.Paint();
      ring.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.logs.ring));
      canvas.drawOval(Skia.XYWHRect(endX - 4.3, -halfH + 3, 8.6, height - 6), ring);

      const inner = Skia.Paint();
      inner.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.logs.endGrain));
      canvas.drawOval(Skia.XYWHRect(endX - 2.8, -halfH + 6, 5.6, height - 12), inner);

      const innerLine = Skia.Paint();
      innerLine.setStyle(Skia.PaintStyle.Stroke);
      innerLine.setStrokeWidth(0.8);
      innerLine.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.logs.grain));
      canvas.drawOval(Skia.XYWHRect(endX - 1.3, -halfH + 8, 2.6, height - 16), innerLine);
    }

    canvas.restore();
  },
};

export const drawTurtleSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 80;
    const segments = resolveFroggerShellSegments(width);
    const log = world.getComponent(entity, "Log");
    const visual = resolveFroggerTurtleVisualState(log?.divePhase);
    const direction = resolveFroggerVehicleDirection(log?.direction);
    const halfW = width / 2;

    canvas.save();
    if (log?.divePhase === "submerged") canvas.scale(1, 0.78);

    const skinPaint = Skia.Paint();
    skinPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.turtles.skin));
    skinPaint.setAlphaf(visual.opacity);
    for (let i = 0; i < segments.length; i += 1) {
      const x = segments[i].segX;
      canvas.drawOval(Skia.XYWHRect(x - 11.8, -13, 7.6, 6), skinPaint);
      canvas.drawOval(Skia.XYWHRect(x + 4.2, -13, 7.6, 6), skinPaint);
      canvas.drawOval(Skia.XYWHRect(x - 11.8, 7, 7.6, 6), skinPaint);
      canvas.drawOval(Skia.XYWHRect(x + 4.2, 7, 7.6, 6), skinPaint);
    }

    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(visual.bodyColor));
    bodyPaint.setAlphaf(visual.opacity);
    const shellPaint = Skia.Paint();
    shellPaint.setColor(Skia.Color(visual.shellColor));
    shellPaint.setAlphaf(visual.opacity);
    const shellHighlightPaint = Skia.Paint();
    shellHighlightPaint.setStyle(Skia.PaintStyle.Stroke);
    shellHighlightPaint.setStrokeWidth(1.2);
    shellHighlightPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.turtles.shellHighlight));
    shellHighlightPaint.setAlphaf(visual.opacity);
    const shellLinePaint = Skia.Paint();
    shellLinePaint.setStyle(Skia.PaintStyle.Stroke);
    shellLinePaint.setStrokeWidth(1.1);
    shellLinePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.turtles.shellLine));
    shellLinePaint.setAlphaf(visual.opacity);

    for (let i = 0; i < segments.length; i += 1) {
      const x = segments[i].segX;
      canvas.drawOval(Skia.XYWHRect(x - 12.5, -14.5, 25, 29), bodyPaint);
      canvas.drawOval(Skia.XYWHRect(x - 10.4, -12.4, 20.8, 24.8), shellPaint);
      canvas.drawOval(Skia.XYWHRect(x - 8.5, -10.2, 17, 20.4), shellHighlightPaint);
      canvas.drawLine(x, -10, x, 10, shellLinePaint);
      canvas.drawLine(x - 8, -5, x + 8, -5, shellLinePaint);
      canvas.drawLine(x - 8, 5, x + 8, 5, shellLinePaint);
      canvas.drawLine(x - 4, -9, x - 7, -4, shellLinePaint);
      canvas.drawLine(x + 4, 9, x + 7, 4, shellLinePaint);
    }

    const headX = direction * (halfW - 8);
    canvas.drawOval(Skia.XYWHRect(headX - 7.8, -6.7, 15.6, 13.4), bodyPaint);
    const eyePaint = Skia.Paint();
    eyePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.eyes));
    eyePaint.setAlphaf(visual.opacity);
    canvas.drawCircle(headX + direction * 2, -2.1, 1.45, eyePaint);
    canvas.drawCircle(headX + direction * 2, 2.1, 1.45, eyePaint);
    const pupilPaint = Skia.Paint();
    pupilPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.pupils));
    pupilPaint.setAlphaf(visual.opacity);
    canvas.drawCircle(headX + direction * 2.3, -2.1, 0.65, pupilPaint);
    canvas.drawCircle(headX + direction * 2.3, 2.1, 0.65, pupilPaint);

    canvas.restore();
  },
};

export const drawCrocodileSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = getVisibleSkiaRender(world, entity);
    const log = world.getComponent(entity, "Log");
    if (!render) return;

    const width = render.size || 100;
    const halfW = width / 2;
    const direction = resolveFroggerVehicleDirection(log?.direction);
    const bodyColor = render.color || FROGGER_VISUAL_TOKENS.crocodile.body;

    canvas.save();
    canvas.scale(direction, 1);

    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.shadows.color));
    canvas.drawOval(Skia.XYWHRect(-halfW + 2, -8, width - 4, 24), shadowPaint);

    const body = Skia.Path.Make();
    body.moveTo(-halfW, 0);
    body.lineTo(-halfW + 20, -6);
    body.quadTo(-halfW + 32, -9, -halfW + 44, -7);
    body.lineTo(halfW - 22, -7);
    body.quadTo(halfW - 8, -7, halfW - 5, -3);
    body.lineTo(halfW, -2);
    body.lineTo(halfW, 2);
    body.lineTo(halfW - 7, 3);
    body.quadTo(halfW - 14, 8, halfW - 26, 7);
    body.lineTo(-halfW + 30, 6);
    body.quadTo(-halfW + 15, 6, -halfW, 0);
    body.close();
    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(bodyColor));
    canvas.drawPath(body, bodyPaint);

    const limbPaint = Skia.Paint();
    limbPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.body));
    for (let leg = 0; leg < 2; leg += 1) {
      const legX = leg === 0 ? -width * 0.28 : width * 0.22;
      canvas.drawOval(Skia.XYWHRect(legX - 5.5, -13.8, 11, 7.6), limbPaint);
      canvas.drawOval(Skia.XYWHRect(legX - 5.5, 6.2, 11, 7.6), limbPaint);
    }

    const dorsalPaint = Skia.Paint();
    dorsalPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.dorsal));
    for (let band = 0; band < 4; band += 1) {
      const bandX = -width * 0.12 + band * width * 0.12;
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(bandX, -7, 5.5, 14), 2, 2), dorsalPaint);
    }

    const jawX = halfW - 24;
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(jawX, -7, 22, 10), 4, 4), bodyPaint);

    if (log?.mouthOpen) {
      const mouth = Skia.Path.Make();
      mouth.moveTo(jawX + 1, -1);
      mouth.lineTo(halfW, -1);
      mouth.lineTo(halfW, 5);
      mouth.lineTo(jawX + 3, 4);
      mouth.close();
      const mouthPaint = Skia.Paint();
      mouthPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.mouth));
      canvas.drawPath(mouth, mouthPaint);

      const teethPaint = Skia.Paint();
      teethPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.teeth));
      for (let tooth = 0; tooth < 3; tooth += 1) {
        const toothX = jawX + 5 + tooth * 5;
        const toothPath = Skia.Path.Make();
        toothPath.moveTo(toothX, -1);
        toothPath.lineTo(toothX + 2.2, -1);
        toothPath.lineTo(toothX + 1.1, 1.6);
        toothPath.close();
        canvas.drawPath(toothPath, teethPaint);
      }
    } else {
      const mouthLine = Skia.Paint();
      mouthLine.setStyle(Skia.PaintStyle.Stroke);
      mouthLine.setStrokeWidth(1.5);
      mouthLine.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.dorsal));
      canvas.drawLine(jawX + 2, 1.5, halfW - 2, 1.5, mouthLine);
    }

    const eyeRimPaint = Skia.Paint();
    eyeRimPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.underbelly));
    canvas.drawCircle(halfW - 23, -5.5, 3.8, eyeRimPaint);
    const eyePaint = Skia.Paint();
    eyePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.eyes));
    canvas.drawCircle(halfW - 23, -5.5, 1.8, eyePaint);

    canvas.restore();
  },
};

function drawSkiaGoalFrog(canvas: SkCanvas, half: number): void {
  const bodyPaint = Skia.Paint();
  bodyPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.body));
  canvas.drawOval(Skia.XYWHRect(-half * 0.43, 2 - half * 0.5, half * 0.86, half), bodyPaint);

  const eyePaint = Skia.Paint();
  eyePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.eyes));
  canvas.drawCircle(-half * 0.27, -half * 0.26, half * 0.17, eyePaint);
  canvas.drawCircle(half * 0.27, -half * 0.26, half * 0.17, eyePaint);

  const pupilPaint = Skia.Paint();
  pupilPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.pupils));
  canvas.drawCircle(-half * 0.27, -half * 0.29, half * 0.07, pupilPaint);
  canvas.drawCircle(half * 0.27, -half * 0.29, half * 0.07, pupilPaint);
}

export const drawLilyPadSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied, pad } = goalCtx;
    const { slotColor, occupiedColor } = resolveFroggerSlotColors(world);
    const hasCrocodile = !!pad.hasCrocodile;
    const hasFly = !!pad.hasFly;

    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.shadows.color));
    canvas.drawOval(Skia.XYWHRect(-half, -half * 0.83 + 3, half * 2, half * 1.66), shadowPaint);

    const leaf = Skia.Path.Make();
    leaf.moveTo(half * Math.cos(Math.PI * 0.25), half * Math.sin(Math.PI * 0.25));
    leaf.addArc(Skia.XYWHRect(-half, -half, half * 2, half * 2), 45, 315);
    leaf.lineTo(0, 0);
    leaf.close();
    const leafPaint = Skia.Paint();
    leafPaint.setColor(Skia.Color(occupied ? occupiedColor : slotColor));
    canvas.drawPath(leaf, leafPaint);

    const edgePaint = Skia.Paint();
    edgePaint.setStyle(Skia.PaintStyle.Stroke);
    edgePaint.setStrokeWidth(1.3);
    edgePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.lilyPads.edge));
    canvas.drawPath(leaf, edgePaint);

    const veinPaint = Skia.Paint();
    veinPaint.setStyle(Skia.PaintStyle.Stroke);
    veinPaint.setStrokeWidth(1.1);
    veinPaint.setStrokeCap(Skia.StrokeCap.Round);
    veinPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.lilyPads.vein));
    canvas.drawLine(0, 0, half * 0.35, -half * 0.48, veinPaint);
    canvas.drawLine(0, 0, half * 0.55, 0, veinPaint);
    canvas.drawLine(0, 0, half * 0.28, half * 0.5, veinPaint);
    canvas.drawLine(0, 0, -half * 0.48, half * 0.2, veinPaint);
    canvas.drawLine(0, 0, -half * 0.38, -half * 0.35, veinPaint);

    if (occupied) {
      drawSkiaGoalFrog(canvas, half);
    } else if (hasCrocodile) {
      const crocPaint = Skia.Paint();
      crocPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.body));
      canvas.drawOval(Skia.XYWHRect(-half * 0.68, -half * 0.24, half * 1.36, half * 0.48), crocPaint);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-half * 0.6, -half * 0.28, half * 0.7, half * 0.28), 2, 2), crocPaint);
      const dangerPaint = Skia.Paint();
      dangerPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.lilyPads.danger));
      canvas.drawCircle(half * 0.28, -half * 0.12, 1.8, dangerPaint);
    } else if (hasFly) {
      const wingPaint = Skia.Paint();
      wingPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.lilyPads.flower));
      canvas.drawOval(Skia.XYWHRect(-5.3, -2.8, 5.6, 3.6), wingPaint);
      canvas.drawOval(Skia.XYWHRect(-0.3, -2.8, 5.6, 3.6), wingPaint);
      const flyPaint = Skia.Paint();
      flyPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.dorsal));
      canvas.drawOval(Skia.XYWHRect(-1.3, -2.4, 2.6, 6.8), flyPaint);
    } else {
      const flowerPaint = Skia.Paint();
      flowerPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.lilyPads.flower));
      canvas.drawCircle(0, 0, 2, flowerPaint);
    }
  },
};

let cachedRiverShader: { grid: number; shader: SkShader } | null = null;

function getFroggerRiverShader(grid: number): SkShader | null {
  if (!Skia) return null;
  if (cachedRiverShader?.grid === grid) return cachedRiverShader.shader;

  const shader = Skia.Shader.MakeLinearGradient(
    Skia.Point(0, FROGGER_BACKGROUND_ROWS.riverStart * grid),
    Skia.Point(0, (FROGGER_BACKGROUND_ROWS.riverStart + FROGGER_BACKGROUND_ROWS.riverRows) * grid),
    [
      Skia.Color(FROGGER_VISUAL_TOKENS.surfaces.riverShallow),
      Skia.Color(FROGGER_VISUAL_TOKENS.surfaces.riverMid),
      Skia.Color(FROGGER_VISUAL_TOKENS.surfaces.riverDeep),
    ],
    [0, 0.55, 1],
    Skia.TileMode.Clamp
  );

  if (!shader) return null;
  cachedRiverShader = { grid, shader };
  return shader;
}

export const froggerBackgroundSkiaEffect: EffectDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
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

    canvas.save();

    const bankPaint = Skia.Paint();
    bankPaint.setColor(Skia.Color(palette.bank));
    canvas.drawRect(Skia.XYWHRect(0, 0, w, grid), bankPaint);

    const bankHighlightPaint = Skia.Paint();
    bankHighlightPaint.setColor(Skia.Color(palette.bankHighlight));
    canvas.drawRect(Skia.XYWHRect(0, 0, w, 3), bankHighlightPaint);

    const bankShadowPaint = Skia.Paint();
    bankShadowPaint.setColor(Skia.Color(palette.bankShadow));
    canvas.drawRect(Skia.XYWHRect(0, grid - 4, w, 4), bankShadowPaint);

    // River gradient shader is cached by cell size; it is not rebuilt every frame.
    const waterPaint = Skia.Paint();
    const riverShader = getFroggerRiverShader(grid);
    if (riverShader) {
      waterPaint.setShader(riverShader);
    } else {
      waterPaint.setColor(Skia.Color(palette.riverShallow));
    }
    canvas.drawRect(Skia.XYWHRect(0, riverY, w, riverHeight), waterPaint);

    const waterFlowPaint = Skia.Paint();
    waterFlowPaint.setStyle(Skia.PaintStyle.Stroke);
    waterFlowPaint.setColor(Skia.Color(palette.waterFlow));
    waterFlowPaint.setStrokeWidth(1.5);

    const waterGlintPaint = Skia.Paint();
    waterGlintPaint.setStyle(Skia.PaintStyle.Stroke);
    waterGlintPaint.setColor(Skia.Color(palette.waterGlint));
    waterGlintPaint.setStrokeWidth(1);

    const flowOffset = (world.tick * 0.35) % 96;
    for (let lane = 0; lane < rows.riverRows; lane += 1) {
      const lineY = riverY + lane * grid + grid * 0.34 + (lane % 2) * 5;
      const laneOffset = lane % 2 === 0 ? flowOffset : (flowOffset + 48) % 96;
      for (let x = -96 + laneOffset; x < w + 96; x += 96) {
        canvas.drawLine(x, lineY, x + 8, lineY - 2, waterFlowPaint);
        canvas.drawLine(x + 8, lineY - 2, x + 18, lineY, waterFlowPaint);
        canvas.drawLine(x + 38, lineY + 10, x + 50, lineY + 8, waterGlintPaint);
      }
    }

    // Safe median has its own bank surface and subdued seams.
    canvas.drawRect(Skia.XYWHRect(0, medianY, w, grid), bankPaint);
    canvas.drawRect(Skia.XYWHRect(0, medianY, w, 3), bankShadowPaint);
    canvas.drawRect(Skia.XYWHRect(0, medianY + grid - 3, w, 3), bankShadowPaint);

    const medianLinePaint = Skia.Paint();
    medianLinePaint.setStyle(Skia.PaintStyle.Stroke);
    medianLinePaint.setColor(Skia.Color(palette.medianDivider));
    medianLinePaint.setStrokeWidth(1);
    for (let x = 12; x < w; x += grid) {
      canvas.drawLine(x, medianY + 13, x + 10, medianY + 13, medianLinePaint);
      canvas.drawLine(x + 5, medianY + 25, x + 17, medianY + 25, medianLinePaint);
    }

    // Road surface and the four separators that define five traffic lanes.
    const roadPaint = Skia.Paint();
    roadPaint.setColor(Skia.Color(palette.asphalt));
    canvas.drawRect(Skia.XYWHRect(0, roadY, w, roadHeight), roadPaint);
    const roadEdgePaint = Skia.Paint();
    roadEdgePaint.setColor(Skia.Color(palette.roadEdge));
    canvas.drawRect(Skia.XYWHRect(0, roadY, w, 3), roadEdgePaint);
    canvas.drawRect(Skia.XYWHRect(0, roadY + roadHeight - 3, w, 3), roadEdgePaint);

    const lanePaint = Skia.Paint();
    lanePaint.setStyle(Skia.PaintStyle.Stroke);
    lanePaint.setColor(Skia.Color(palette.laneDivider));
    lanePaint.setStrokeWidth(2);
    for (let separator = 1; separator < rows.roadRows; separator += 1) {
      const lineY = roadY + separator * grid;
      for (let x = 0; x < w; x += 18) {
        canvas.drawLine(x, lineY, Math.min(x + 8, w), lineY, lanePaint);
      }
    }

    // Starting bank uses the same paving seams as Canvas.
    canvas.drawRect(Skia.XYWHRect(0, startY, w, startHeight), bankPaint);
    canvas.drawRect(Skia.XYWHRect(0, startY, w, 3), bankHighlightPaint);
    canvas.drawRect(Skia.XYWHRect(0, startY + startHeight - 4, w, 4), bankShadowPaint);

    const tilePaint = Skia.Paint();
    tilePaint.setStyle(Skia.PaintStyle.Stroke);
    tilePaint.setColor(Skia.Color(palette.bankTileLine));
    tilePaint.setStrokeWidth(1);
    for (let x = grid; x < w; x += grid) {
      canvas.drawLine(x, startY + 4, x, startY + startHeight - 4, tilePaint);
    }
    for (let y = startY + grid; y < startY + startHeight; y += grid) {
      canvas.drawLine(0, y, w, y, tilePaint);
    }

    canvas.restore();
  },
};
