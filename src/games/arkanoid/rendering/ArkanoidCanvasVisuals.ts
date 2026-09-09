import { ShapeDrawer, EffectDrawer, TransformComponent } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, BrickComponent } from "../types/ArkanoidTypes";
import { ArkanoidConfig } from "../types/ArkanoidConfigSchema";
import { drawNeonShape, drawProceduralGrid } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";

export const drawArkanoidBall: ShapeDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const size = render.size ?? 8;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = render.color || colors.cyan;

    ctx.fillStyle = render.color || colors.cyan;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawArkanoidPaddle: ShapeDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const config = world.getResource<ArkanoidConfig>("GameConfig") || { PADDLE_WIDTH: 100, PADDLE_HEIGHT: 16 };
    const w = config.PADDLE_WIDTH;
    const h = config.PADDLE_HEIGHT;

    const primaryColor = render.color || colors.cyan;
    const glowColor = "rgba(0, 243, 255, 0.25)";

    drawNeonShape(
      ctx,
      world.tick,
      primaryColor,
      glowColor,
      (ctx, widthScale, heightScale) => {
        const pw = w * widthScale;
        const ph = h * heightScale;
        if (ctx.roundRect) {
          ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 4);
        } else {
          ctx.rect(-pw / 2, -ph / 2, pw, ph);
        }
      },
      (ctx) => {
        const coreW = w * 0.6;
        const coreH = h * 0.5;
        if (ctx.roundRect) {
          ctx.roundRect(-coreW / 2, -coreH / 2, coreW, coreH, 2);
        } else {
          ctx.rect(-coreW / 2, -coreH / 2, coreW, coreH);
        }
      }
    );
  }
};

export const drawArkanoidBrick: ShapeDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world, entity) {
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

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = brickColor;
    ctx.fillStyle = brickColor;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 3);
      ctx.fill();
    } else {
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 3);

    ctx.restore();
  }
};

export const drawArkanoidBackground: EffectDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world) {
    const config = world.getResource<ArkanoidConfig>("GameConfig") || { SCREEN_WIDTH: 800, SCREEN_HEIGHT: 600 };
    const width = config.SCREEN_WIDTH;
    const height = config.SCREEN_HEIGHT;

    drawProceduralGrid(ctx, width, height, world.tick, 50, 0.25);

    const state = world.getSingleton("ArkanoidState");
    if (state) {
      ctx.save();
      ctx.font = "14px monospace";
      ctx.fillStyle = colors.cyan;
      ctx.shadowColor = colors.cyan;
      ctx.shadowBlur = 5;

      ctx.fillText(`SCORE: ${state.score}`, 20, 30);
      ctx.fillText(`LIVES: ${state.lives}`, width - 120, 30);
      ctx.fillText(`LEVEL: ${state.level}`, width / 2 - 30, 30);

      ctx.restore();
    }
  }
};
