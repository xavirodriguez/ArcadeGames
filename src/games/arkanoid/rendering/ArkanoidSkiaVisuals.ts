import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { ArkanoidComponentRegistry } from "../types/ArkanoidTypes";
import { ArkanoidConfig } from "../types/ArkanoidConfigSchema";
import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "../../shared/rendering/ProceduralShapeUtils";
import { drawGlowOrbSkia, drawSkiaBackgroundGrid } from "../../shared/rendering/SkiaNeonUtils";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { getVisibleSkiaRender } from "../../shared/rendering/renderingUtils";
import {
  resolveArkanoidBallContext,
  resolveArkanoidPaddleContext,
  resolveArkanoidBrickContext,
} from "./ArkanoidRenderUtils";

export const drawSkiaArkanoidBall: ShapeDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const ballCtx = resolveArkanoidBallContext(world, entity);
    if (!ballCtx) return;

    const paint = getPaint();
    drawGlowOrbSkia(canvas, paint, ballCtx.size, ballCtx.color, 0.4, 2.0);
  }
};

export const drawSkiaArkanoidPaddle: ShapeDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const paddleCtx = resolveArkanoidPaddleContext(world, entity);
    if (!paddleCtx) return;

    const { w, h, primaryColor } = paddleCtx;
    const paint = getPaint();

    canvas.save();

    const pulseFactor = computeNeonPulse(world.tick);
    const pw = w * pulseFactor;
    const ph = h;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(primaryColor));
    paint.setStrokeWidth(2.0);
    canvas.drawRoundRect(
      Skia.RRectXY(Skia.XYWHRect(-pw / 2, -ph / 2, pw, ph), 4, 4),
      paint
    );

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(colors.white));
    const coreW = w * 0.6;
    const coreH = h * 0.5;
    canvas.drawRoundRect(
      Skia.RRectXY(Skia.XYWHRect(-coreW / 2, -coreH / 2, coreW, coreH), 2, 2),
      paint
    );

    canvas.restore();
  }
};

function drawFilledSkiaRoundRect(
  canvas: any,
  w: number,
  h: number,
  color: string,
  rx: number,
  ry: number
): void {
  const paint = getPaint();
  canvas.save();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(color));

  canvas.drawRoundRect(
    Skia.RRectXY(Skia.XYWHRect(-w / 2, -h / 2, w, h), rx, ry),
    paint
  );

  canvas.restore();
}

export const drawSkiaArkanoidCapsule: ShapeDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const capsuleColor = render.color || colors.cyan;
    drawFilledSkiaRoundRect(canvas, 24, 14, capsuleColor, 7, 7);
  }
};

export const drawSkiaArkanoidBrick: ShapeDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const brickCtx = resolveArkanoidBrickContext(world, entity);
    if (!brickCtx) return;

    const { w, h, brickColor } = brickCtx;
    drawFilledSkiaRoundRect(canvas, w, h, brickColor, 3, 3);
  }
};

export const drawSkiaArkanoidBackground: EffectDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const config = world.getResource<ArkanoidConfig>("GameConfig") || { worldWidth: 800, worldHeight: 600 };
    const width = config.worldWidth;
    const height = config.worldHeight;
    const paint = getPaint();

    drawSkiaBackgroundGrid(canvas, paint, width, height, world.tick, 50, 0.25, "rgba(0, 240, 255, 0.05)");
  }
};
