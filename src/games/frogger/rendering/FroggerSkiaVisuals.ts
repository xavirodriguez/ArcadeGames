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
    if (!playerCtx) return;

    const { half, isInvuln, primaryColor } = playerCtx;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(isInvuln ? FROGGER_VISUAL_TOKENS.frog.invulnerable : primaryColor));
    canvas.drawCircle(0, 0, half, paint);

    const eyePaint = Skia.Paint();
    eyePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.eyes));
    canvas.drawCircle(-half * 0.4, -half * 0.5, half * 0.35, eyePaint);
    canvas.drawCircle(half * 0.4, -half * 0.5, half * 0.35, eyePaint);

    const pupilPaint = Skia.Paint();
    pupilPaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.frog.pupils));
    canvas.drawCircle(-half * 0.4, -half * 0.55, half * 0.18, pupilPaint);
    canvas.drawCircle(half * 0.4, -half * 0.55, half * 0.18, pupilPaint);
  },
};

function drawSkiaRoundedRectAt(
  canvas: SkCanvas,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  radius = 2
): void {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y, width, height), radius, radius),
    paint
  );
}

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
    const render = getVisibleSkiaRender(_world, entity);
    if (!render) return;

    const width = render.size || 120;
    const logColor = render.color || FROGGER_VISUAL_TOKENS.logs.body;
    drawSkiaRoundedBox(canvas, width, 30, logColor, 10, 10);
  },
};

export const drawTurtleSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 80;
    const segments = resolveFroggerShellSegments(width);

    const log = world.getComponent(entity, "Log");
    const turtleColor = log?.divePhase === "warning"
      ? FROGGER_VISUAL_TOKENS.turtles.warning
      : log?.divePhase === "submerged"
        ? FROGGER_VISUAL_TOKENS.turtles.submerged
        : (render.color || FROGGER_VISUAL_TOKENS.turtles.body);
    const paintOuter = Skia.Paint();
    paintOuter.setColor(Skia.Color(turtleColor));
    const paintShell = Skia.Paint();
    paintShell.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.turtles.shell));

    for (let i = 0; i < segments.length; i++) {
      canvas.drawCircle(segments[i].segX, 0, 14, paintOuter);
      canvas.drawCircle(segments[i].segX, 0, 8, paintShell);
    }
  },
};

export const drawCrocodileSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, _world, entity) {
    const render = getVisibleSkiaRender(_world, entity);
    if (!render) return;

    const width = render.size || 100;
    const crocColor = render.color || FROGGER_VISUAL_TOKENS.crocodile.body;
    drawSkiaRoundedBox(canvas, width, 30, crocColor, 8, 8);
    const eyePaint = Skia.Paint();
    eyePaint.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.crocodile.eyes));
    canvas.drawCircle(width / 2 - 12, -5, 3, eyePaint);
  },
};

export const drawLilyPadSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied } = goalCtx;

    const { slotColor, occupiedColor } = resolveFroggerSlotColors(world);

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(occupied ? occupiedColor : slotColor));
    canvas.drawCircle(0, 0, half, paint);
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
