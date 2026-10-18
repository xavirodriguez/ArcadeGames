import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { ArkanoidComponentRegistry } from "../types/ArkanoidTypes";
import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "../../shared/rendering/ProceduralShapeUtils";
import { drawGlowOrbSkia, drawSkiaBackgroundGrid } from "../../shared/rendering/SkiaNeonUtils";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { getVisibleSkiaRender, drawSkiaFilledRoundRect, fillSkiaPaint } from "../../shared/rendering/renderingUtils";
import {
  resolveArkanoidBallContext,
  resolveArkanoidPaddleContext,
  resolveArkanoidBrickContext,
} from "./ArkanoidRenderUtils";

export const drawSkiaArkanoidBall: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const ballCtx = resolveArkanoidBallContext(world, entity);
    if (!ballCtx) return;

    const paint = getPaint();
    drawGlowOrbSkia(canvas, paint, ballCtx.size, ballCtx.color, 0.4, 2.0);
  }
};

export const drawSkiaArkanoidPaddle: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const paddleCtx = resolveArkanoidPaddleContext(world, entity);
    if (!paddleCtx) return;

    const { w, h, primaryColor } = paddleCtx;
    const paint = getPaint();

    canvas.save();

    const pulseFactor = computeNeonPulse(world.tick);
    const pw = w * pulseFactor;
    const ph = h;

    fillSkiaPaint(paint, "stroke", primaryColor, 2.0);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-pw / 2, -ph / 2, pw, ph), 4, 4),
      paint
    );

    fillSkiaPaint(paint, "fill", colors.white);
    const coreW = w * 0.6;
    const coreH = h * 0.5;
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-coreW / 2, -coreH / 2, coreW, coreH), 2, 2),
      paint
    );

    canvas.restore();
  }
};

export const drawSkiaArkanoidCapsule: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const capsuleColor = render.color || colors.cyan;
    drawSkiaFilledRoundRect(canvas, 24, 14, capsuleColor, 7, 7);
  }
};

export const drawSkiaArkanoidBrick: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const brickCtx = resolveArkanoidBrickContext(world, entity);
    if (!brickCtx) return;

    const { w, h, brickColor } = brickCtx;
    drawSkiaFilledRoundRect(canvas, w, h, brickColor, 3, 3);
  }
};

export const drawSkiaArkanoidBackground: EffectDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const config = world.getResource<{ worldWidth?: number; worldHeight?: number }>("GameConfig");
    const width = config?.worldWidth ?? 800;
    const height = config?.worldHeight ?? 600;
    const paint = getPaint();

    drawSkiaBackgroundGrid(canvas, paint, width, height, world.tick, 50, 0.25, colors.border);
  }
};
