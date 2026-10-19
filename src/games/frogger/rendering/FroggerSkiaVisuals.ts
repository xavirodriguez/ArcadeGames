import { ShapeDrawer, EffectDrawer, resolveThemeColorWithFallback } from "@tiny-aster/core";
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
    const frogger = world.getComponent(entity, "Frogger");
    const playerCtx = resolveFroggerPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { half, isInvuln, primaryColor } = playerCtx;

    const facing = frogger?.facing ?? "up";
    const facingDeg =
      facing === "up" ? 0 :
      facing === "right" ? 90 :
      facing === "down" ? 180 :
      -90;

    canvas.save();
    if (facingDeg !== 0) canvas.rotate(facingDeg, 0, 0);

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(isInvuln ? "#A3FF80" : primaryColor));
    canvas.drawCircle(0, 0, half, paint);

    const eyePaint = Skia.Paint();
    eyePaint.setColor(Skia.Color("#FFFFFF"));
    canvas.drawCircle(-half * 0.4, -half * 0.5, half * 0.35, eyePaint);
    canvas.drawCircle(half * 0.4, -half * 0.5, half * 0.35, eyePaint);

    const pupilPaint = Skia.Paint();
    pupilPaint.setColor(Skia.Color("#000000"));
    canvas.drawCircle(-half * 0.4, -half * 0.55, half * 0.18, pupilPaint);
    canvas.drawCircle(half * 0.4, -half * 0.55, half * 0.18, pupilPaint);

    canvas.restore();
  },
};

export const drawCarSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 48;
    const carColor = resolveThemeColorWithFallback(world, render.color || "#00F3FF", "car", "secondary");
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

    const truckColor = resolveThemeColorWithFallback(world, "#FF2A6D", "truck", "accent");
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(truckColor));
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, width * 0.7, height), paint);

    const cabPaint = Skia.Paint();
    cabPaint.setColor(Skia.Color("#D3D9E2"));
    canvas.drawRect(Skia.XYWHRect(halfW - width * 0.28, -halfH + 2, width * 0.28, height - 4), cabPaint);
  },
};

export const drawLogSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 120;
    const logColor = resolveThemeColorWithFallback(world, "#8B5A2B", "log", "secondary");
    drawSkiaRoundedBox(canvas, width, 30, logColor, 10, 10);
  },
};

export const drawTurtleSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const log = world.getComponent(entity, "Log");
    const divePhase = log?.divePhase ?? "float";
    if (divePhase === "submerged") return;

    const width = render.size || 80;
    const segments = resolveFroggerShellSegments(width);
    const isWarning = divePhase === "warning";
    const yOffset = isWarning ? 8 : 0;

    const turtleColor = resolveThemeColorWithFallback(world, "#00D2FF", "turtle", "secondary");
    const paintOuter = Skia.Paint();
    paintOuter.setColor(Skia.Color(turtleColor));
    if (isWarning) paintOuter.setAlphaf(0.45);

    canvas.save();
    canvas.translate(0, yOffset);
    for (let i = 0; i < segments.length; i++) {
      canvas.drawCircle(segments[i].segX, 0, 14, paintOuter);
    }
    canvas.restore();
  },
};

/** River crocodile (Skia). */
export const drawCrocodileSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const log = world.getComponent(entity, "Log");
    const width = render.size || 120;
    const height = 28;
    const mouthOpen = !!log?.mouthOpen;
    const bodyColor = resolveThemeColorWithFallback(world, "#2E8B57", "crocodile", "secondary");
    const headColor = mouthOpen ? "#1A5C38" : "#3CB371";

    drawSkiaRoundedBox(canvas, width * 0.7, height, bodyColor, 8, 8);

    const headPaint = Skia.Paint();
    headPaint.setColor(Skia.Color(headColor));
    const headW = width * 0.3;
    const dir = log?.direction ?? 1;
    const headX = dir > 0 ? width / 2 - headW : -width / 2;
    const headRect = Skia.RRectXY(
      Skia.XYWHRect(headX, -height / 2 + 2, headW, height - 4),
      6,
      6
    );
    canvas.drawRRect(headRect, headPaint);
  },
};

export const drawLilyPadSkia: ShapeDrawer<SkCanvas, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied, pad } = goalCtx;

    const { slotColor, occupiedColor } = resolveFroggerSlotColors(world);

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(occupied ? occupiedColor : slotColor));
    canvas.drawCircle(0, 0, half, paint);

    if (!occupied && pad.hasCrocodile) {
      const crocPaint = Skia.Paint();
      crocPaint.setColor(Skia.Color("#1A5C38"));
      canvas.drawCircle(0, 2, half * 0.55, crocPaint);
    } else if (!occupied && pad.hasFly) {
      const flyPaint = Skia.Paint();
      flyPaint.setColor(Skia.Color("#FFD700"));
      canvas.drawCircle(0, -2, 5, flyPaint);
    }
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
