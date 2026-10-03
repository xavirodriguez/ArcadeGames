import { ShapeDrawer, Skia } from "@tiny-aster/core";
import { getPaint } from "../../shared/rendering/SkiaContext";
import type { RacingComponentRegistry } from "../types/RacingRegistry";

export const drawSkiaRacingCar: ShapeDrawer<any, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 16;
    const color = render.color ?? "#00e5ff";
    const input = world.getComponent(entity, "Input");
    const transform = world.getComponent(entity, "Transform");
    const paint = getPaint();

    canvas.save();
    canvas.rotate(((transform?.rotation ?? 0) * 180) / Math.PI, 0, 0);
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-size, -size * 0.55, size * 2, size * 1.1), size * 0.3, size * 0.3), paint);
    paint.setColor(Skia.Color("#111827"));
    canvas.drawRect(Skia.XYWHRect(-size * 0.45, -size * 0.4, size * 0.9, size * 0.8), paint);
    if (input?.actions.boost) {
      paint.setColor(Skia.Color("#fbbf24"));
      const path = Skia.Path.Make();
      path.moveTo(-size, 0);
      path.lineTo(-size * 1.65, -size * 0.35);
      path.lineTo(-size * 1.65, size * 0.35);
      path.close();
      canvas.drawPath(path, paint);
    }
    canvas.restore();
  }
};

export const drawSkiaTrackWall: ShapeDrawer<any, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const wall = world.getComponent(entity, "RacingWall");
    if (!render || !wall) return;
    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#111827"));
    canvas.drawRect(Skia.XYWHRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height), paint);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    paint.setColor(Skia.Color(render.color ?? "#ff2a6d"));
    canvas.drawRect(Skia.XYWHRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height), paint);
  }
};

export const drawSkiaCheckpoint: ShapeDrawer<any, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    const checkpoint = world.getComponent(entity, "Checkpoint");
    if (!checkpoint) return;
    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(checkpoint.isFinish ? 4 : 2);
    paint.setColor(Skia.Color(checkpoint.isFinish ? "#fbbf24" : "#64748b"));
    canvas.drawRect(Skia.XYWHRect(-checkpoint.width / 2, -checkpoint.height / 2, checkpoint.width, checkpoint.height), paint);
  }
};
