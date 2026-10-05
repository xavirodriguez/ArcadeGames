import type { ShapeDrawer } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

export const drawSkiaRacingCar: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas;
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 16;
    const color = render.color ?? "#00e5ff";
    const input = world.getComponent(entity, "Input");
    const boosting = input?.actions.boost === true;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(color));
    paint.setStyle(Skia.PaintStyle.Fill);

    const rrect = Skia.RRectXY(
      Skia.XYWHRect(-size, -size * 0.55, size * 2, size * 1.1),
      size * 0.3,
      size * 0.3
    );
    canvas.drawRRect(rrect, paint);

    const strokePaint = Skia.Paint();
    strokePaint.setColor(Skia.Color("#ffffff"));
    strokePaint.setStyle(Skia.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(1.5);
    canvas.drawRRect(rrect, strokePaint);

    const windshieldPaint = Skia.Paint();
    windshieldPaint.setColor(Skia.Color("#111827"));
    windshieldPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-size * 0.45, -size * 0.4, size * 0.9, size * 0.8), windshieldPaint);

    if (boosting) {
      const boostPaint = Skia.Paint();
      boostPaint.setColor(Skia.Color("#fbbf24"));
      boostPaint.setStyle(Skia.PaintStyle.Fill);
      const path = Skia.Path.Make();
      path.moveTo(-size, 0);
      path.lineTo(-size * 1.65, -size * 0.35);
      path.lineTo(-size * 1.65, size * 0.35);
      path.close();
      canvas.drawPath(path, boostPaint);
    }
  }
};

export const drawSkiaTrackWall: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas;
    const render = world.getComponent(entity, "Render");
    const wall = world.getComponent(entity, "RacingWall");
    if (!render || !wall) return;

    const rect = Skia.XYWHRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);

    const fillPaint = Skia.Paint();
    fillPaint.setColor(Skia.Color("#111827"));
    fillPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(rect, fillPaint);

    const strokePaint = Skia.Paint();
    strokePaint.setColor(Skia.Color(render.color ?? "#ff2a6d"));
    strokePaint.setStyle(Skia.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(3);
    canvas.drawRect(rect, strokePaint);
  }
};

export const drawSkiaCheckpoint: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas;
    const checkpoint = world.getComponent(entity, "Checkpoint");
    if (!checkpoint) return;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(checkpoint.isFinish ? "#fbbf24" : "rgba(255,255,255,0.2)"));
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(checkpoint.isFinish ? 4 : 2);

    const rect = Skia.XYWHRect(-checkpoint.width / 2, -checkpoint.height / 2, checkpoint.width, checkpoint.height);
    canvas.drawRect(rect, paint);
  }
};

export const drawSkiaTrackZone: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas;
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 80;

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(render.color ?? "rgba(255, 255, 255, 0.25)"));
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(0, 0, size, paint);
  }
};

export const drawSkiaTrackObstacle: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas;
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 30;

    const fillPaint = Skia.Paint();
    fillPaint.setColor(Skia.Color(render.color ?? "#f59e0b"));
    fillPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(0, 0, size, fillPaint);

    const strokePaint = Skia.Paint();
    strokePaint.setColor(Skia.Color("#ffffff"));
    strokePaint.setStyle(Skia.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(2);
    canvas.drawCircle(0, 0, size, strokePaint);
  }
};
