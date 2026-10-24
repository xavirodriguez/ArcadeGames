import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { Skia, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { getVisibleSkiaRender } from "../../shared/rendering/renderingUtils";
import {
  resolveFroggerPlayerDrawContext,
  resolveFroggerShellSegments,
  resolveFroggerGoalContext,
  resolveFroggerBackgroundContext,
  resolveFroggerSlotColors,
} from "./FroggerRenderUtils";
import { FROGGER_VISUAL_TOKENS } from "./FroggerVisualTokens";

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

export const drawCarSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 48;
    const carColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.cars[0];
    drawSkiaRoundedBox(canvas, width, 30, carColor, 6, 6);
  },
};

export const drawTruckSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 80;
    const height = 32;
    const halfW = width / 2;
    const halfH = height / 2;

    const truckColor = render.color || FROGGER_VISUAL_TOKENS.vehicles.truck;
    const paintTrailer = Skia.Paint();
    paintTrailer.setColor(Skia.Color(truckColor));
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, width * 0.7, height), paintTrailer);

    const paintCab = Skia.Paint();
    paintCab.setColor(Skia.Color(FROGGER_VISUAL_TOKENS.vehicles.truckCab));
    canvas.drawRect(Skia.XYWHRect(halfW - width * 0.28, -halfH + 2, width * 0.28, height - 4), paintCab);
  },
};

export const drawLogSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
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
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
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

export const froggerBackgroundSkiaEffect: EffectDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { w, grid, grassColor, waterColor, roadColor } = resolveFroggerBackgroundContext(world);

    const grassPaint = Skia.Paint();
    grassPaint.setColor(Skia.Color(grassColor));

    const waterPaint = Skia.Paint();
    waterPaint.setColor(Skia.Color(waterColor));

    const roadPaint = Skia.Paint();
    roadPaint.setColor(Skia.Color(roadColor));

    canvas.drawRect(Skia.XYWHRect(0, 0, w, grid), grassPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 1, w, grid * 5), waterPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 6, w, grid), grassPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 7, w, grid * 5), roadPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 12, w, grid * 3), grassPaint);
  },
};
