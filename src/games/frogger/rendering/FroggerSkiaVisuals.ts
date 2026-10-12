import { ShapeDrawer, EffectDrawer, resolveThemeColor, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import { Skia } from "../../shared/rendering/SkiaContext";
import { getVisibleSkiaRender } from "../../shared/rendering/renderingUtils";
import {
  resolveFroggerPlayerDrawContext,
  resolveFroggerShellSegments,
  resolveFroggerGoalContext,
} from "./FroggerRenderUtils";

function drawSkiaRoundedBox(
  canvas: any,
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

export const drawFroggerSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const playerCtx = resolveFroggerPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { half, isInvuln, primaryColor } = playerCtx;

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
  },
};

export const drawCarSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 48;
    const carColor = resolveThemeColorWithFallback(world, render.color || "#00F3FF", "car", "secondary");
    drawSkiaRoundedBox(canvas, width, 30, carColor, 6, 6);
  },
};

export const drawTruckSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 80;
    const height = 32;
    const halfW = width / 2;
    const halfH = height / 2;

    const truckColor = resolveThemeColorWithFallback(world, "#FF2A6D", "truck", "accent");
    const paintTrailer = Skia.Paint();
    paintTrailer.setColor(Skia.Color(truckColor));
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, width * 0.7, height), paintTrailer);

    const paintCab = Skia.Paint();
    paintCab.setColor(Skia.Color("#D3D9E2"));
    canvas.drawRect(Skia.XYWHRect(halfW - width * 0.28, -halfH + 2, width * 0.28, height - 4), paintCab);
  },
};

export const drawLogSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 120;
    const logColor = resolveThemeColorWithFallback(world, "#8B5A2B", "log", "secondary");
    drawSkiaRoundedBox(canvas, width, 30, logColor, 10, 10);
  },
};

export const drawTurtleSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const width = render.size || 80;
    const segments = resolveFroggerShellSegments(width);

    const turtleColor = resolveThemeColorWithFallback(world, "#00D2FF", "turtle", "secondary");
    const paintOuter = Skia.Paint();
    paintOuter.setColor(Skia.Color(turtleColor));

    for (let i = 0; i < segments.length; i++) {
      canvas.drawCircle(segments[i].segX, 0, 14, paintOuter);
    }
  },
};

export const drawLilyPadSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const goalCtx = resolveFroggerGoalContext(world, entity);
    if (!goalCtx) return;

    const { half, occupied } = goalCtx;

    const slotColor = resolveThemeColorWithFallback(world, "#00AA44", "home_slot", "secondary");
    const occupiedColor = resolveThemeColorWithFallback(world, "#39FF14", "home_slot_occupied", "primary");

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(occupied ? occupiedColor : slotColor));
    canvas.drawCircle(0, 0, half, paint);
  },
};

export const froggerBackgroundSkiaEffect: EffectDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const config = world.getResource<typeof DEFAULT_FROGGER_CONFIG>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const w = config.worldWidth;
    const grid = config.GRID_SIZE;

    const grassColor = resolveThemeColorWithFallback(world, "#0B2B16", "frogger_grass", "secondary");
    const waterColor = resolveThemeColorWithFallback(world, "#051C33", "water", "secondary");
    const roadColor = resolveThemeColorWithFallback(world, "#121218", "frogger_road");

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
