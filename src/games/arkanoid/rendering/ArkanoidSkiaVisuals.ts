import { ShapeDrawer, EffectDrawer, TransformComponent } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, BrickComponent } from "../types/ArkanoidTypes";
import { ArkanoidConfig } from "../types/ArkanoidConfigSchema";
import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "../../shared/rendering/ProceduralShapeUtils";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

export const drawSkiaArkanoidBall: ShapeDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const size = render.size ?? 8;
    const ballColor = render.color || colors.cyan;
    const paint = getPaint();

    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ballColor));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size, paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(colors.white));
    canvas.drawCircle(0, 0, size * 0.4, paint);

    canvas.restore();
  }
};

export const drawSkiaArkanoidPaddle: ShapeDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const config = world.getResource<ArkanoidConfig>("GameConfig") || { PADDLE_WIDTH: 100, PADDLE_HEIGHT: 16 };
    const w = config.PADDLE_WIDTH;
    const h = config.PADDLE_HEIGHT;

    const color = render.color || colors.cyan;
    const paint = getPaint();

    canvas.save();

    const pulseFactor = computeNeonPulse(world.tick);
    const pw = w * pulseFactor;
    const ph = h;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(color));
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

export const drawSkiaArkanoidBrick: ShapeDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const brick = world.getComponent(entity, "Brick") as BrickComponent | undefined;
    const config = world.getResource<ArkanoidConfig>("GameConfig") || { BRICK_WIDTH: 70, BRICK_HEIGHT: 20 };
    const w = config.BRICK_WIDTH;
    const h = config.BRICK_HEIGHT;

    let brickColor: string = colors.cyan;
    if (brick) {
      if (brick.kind === "explosive") brickColor = colors.orange;
      else if (brick.kind === "regenerable") brickColor = colors.green;
      else if (brick.kind === "gravitational") brickColor = colors.purple;
    }

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      brickColor = colors.white;
    }

    const paint = getPaint();

    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(brickColor));

    canvas.drawRoundRect(
      Skia.RRectXY(Skia.XYWHRect(-w / 2, -h / 2, w, h), 3, 3),
      paint
    );

    canvas.restore();
  }
};

export const drawSkiaArkanoidBackground: EffectDrawer<any, ArkanoidComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const config = world.getResource<ArkanoidConfig>("GameConfig") || { SCREEN_WIDTH: 800, SCREEN_HEIGHT: 600 };
    const width = config.SCREEN_WIDTH;
    const height = config.SCREEN_HEIGHT;

    const paint = getPaint();

    paint.reset();
    paint.setColor(Skia.Color(colors.background));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    const gridSize = 50;
    const scrollOffset = (world.tick * 0.25) % gridSize;

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 240, 255, 0.05)"));
    paint.setStrokeWidth(1.0);

    for (let x = 0; x < width; x += gridSize) {
      canvas.drawLine(x, 0, x, height, paint);
    }

    for (let y = scrollOffset; y < height; y += gridSize) {
      canvas.drawLine(0, y, width, y, paint);
    }
  }
};
