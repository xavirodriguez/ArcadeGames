import { ShapeDrawer } from "@tiny-aster/core";
import { NebulaDashComponentRegistry } from "../types/NebulaDashRegistry";

let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {}

let cachedPaint: any = null;
function getPaint(): any {
  if (!cachedPaint && Skia) {
    cachedPaint = Skia.Paint();
  }
  return cachedPaint;
}

export const drawSkiaNebulaPlayer: ShapeDrawer<any, NebulaDashComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 16;
    const paint = getPaint();

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#00f0ff"));

    const path = Skia.Path.Make();
    path.moveTo(0, -size);
    path.lineTo(size * 0.8, size);
    path.lineTo(0, size * 0.6);
    path.lineTo(-size * 0.8, size);
    path.close();

    canvas.drawPath(path, paint);
  }
};

export const drawSkiaNebulaGap: ShapeDrawer<any, NebulaDashComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    const gap = world.getComponent(entity, "ObstacleGap");
    if (!render || !gap) return;

    const gapWidth = gap.gapWidth || 120;
    const halfGap = gapWidth / 2;
    const barrierWidth = 400;

    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(gap.passed ? "#00ff88" : "#ff0055"));

    // Left barrier
    canvas.drawRect(Skia.XYWHRect(-halfGap - barrierWidth, -10, barrierWidth, 20), paint);
    // Right barrier
    canvas.drawRect(Skia.XYWHRect(halfGap, -10, barrierWidth, 20), paint);
  }
};

export const drawSkiaNebulaAsteroid: ShapeDrawer<any, NebulaDashComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 30;
    const radius = size / 2;

    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#888888"));

    canvas.drawCircle(0, 0, radius, paint);
  }
};

export const drawSkiaNebulaPlasmaWall: ShapeDrawer<any, NebulaDashComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(255, 0, 255, 0.9)"));

    canvas.drawRect(Skia.XYWHRect(-1000, -50, 2000, 200), paint);
  }
};
