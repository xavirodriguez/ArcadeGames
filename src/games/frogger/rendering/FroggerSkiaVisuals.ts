import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

export const drawFroggerSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity, Skia) {
    const render = world.getComponent(entity, "Render");
    if (!render || !Skia) return;

    const size = render.size || 32;
    const half = size / 2;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#39FF14"));
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
  draw(canvas, world, entity, Skia) {
    const render = world.getComponent(entity, "Render");
    if (!render || !Skia) return;

    const width = render.size || 48;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(render.color || "#00F3FF"));
    const rect = Skia.RRectXY(Skia.XYWHRect(-halfW, -halfH, width, height), 6, 6);
    canvas.drawRRect(rect, paint);
  },
};

export const drawTruckSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity, Skia) {
    const render = world.getComponent(entity, "Render");
    if (!render || !Skia) return;

    const width = render.size || 80;
    const height = 32;
    const halfW = width / 2;
    const halfH = height / 2;

    const paintTrailer = Skia.Paint();
    paintTrailer.setColor(Skia.Color("#FF2A6D"));
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, width * 0.7, height), paintTrailer);

    const paintCab = Skia.Paint();
    paintCab.setColor(Skia.Color("#D3D9E2"));
    canvas.drawRect(Skia.XYWHRect(halfW - width * 0.28, -halfH + 2, width * 0.28, height - 4), paintCab);
  },
};

export const drawLogSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity, Skia) {
    const render = world.getComponent(entity, "Render");
    if (!render || !Skia) return;

    const width = render.size || 120;
    const height = 30;
    const halfW = width / 2;
    const halfH = height / 2;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#8B5A2B"));
    const rect = Skia.RRectXY(Skia.XYWHRect(-halfW, -halfH, width, height), 10, 10);
    canvas.drawRRect(rect, paint);
  },
};

export const drawTurtleSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity, Skia) {
    const render = world.getComponent(entity, "Render");
    if (!render || !Skia) return;

    const width = render.size || 80;
    const halfW = width / 2;

    const paintOuter = Skia.Paint();
    paintOuter.setColor(Skia.Color("#00D2FF"));

    const segmentCount = Math.floor(width / 35);
    const step = width / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const segX = -halfW + i * step + step / 2;
      canvas.drawCircle(segX, 0, 14, paintOuter);
    }
  },
};

export const drawLilyPadSkia: ShapeDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, entity, Skia) {
    const pad = world.getComponent(entity, "GoalLilyPad");
    const render = world.getComponent(entity, "Render");
    if (!render || !pad || !Skia) return;

    const size = render.size || 36;
    const half = size / 2;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(pad.occupied ? "#39FF14" : "#00AA44"));
    canvas.drawCircle(0, 0, half, paint);
  },
};

export const froggerBackgroundSkiaEffect: EffectDrawer<any, FroggerComponentRegistry> = {
  draw(canvas, world, Skia) {
    if (!Skia) return;
    const config = world.getResource<typeof DEFAULT_FROGGER_CONFIG>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const w = config.SCREEN_WIDTH;
    const grid = config.GRID_SIZE;

    const grassPaint = Skia.Paint();
    grassPaint.setColor(Skia.Color("#0B2B16"));

    const waterPaint = Skia.Paint();
    waterPaint.setColor(Skia.Color("#051C33"));

    const roadPaint = Skia.Paint();
    roadPaint.setColor(Skia.Color("#121218"));

    canvas.drawRect(Skia.XYWHRect(0, 0, w, grid), grassPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 1, w, grid * 5), waterPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 6, w, grid), grassPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 7, w, grid * 5), roadPaint);
    canvas.drawRect(Skia.XYWHRect(0, grid * 12, w, grid * 3), grassPaint);
  },
};
