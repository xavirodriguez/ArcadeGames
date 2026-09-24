import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { ArkanoidComponentRegistry } from "../types/ArkanoidTypes";
import { ArkanoidConfig } from "../types/ArkanoidConfigSchema";
import { drawGlowOrbCanvas, drawNeonShape, drawProceduralGrid, canvasRoundRectPath } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";
import {
  resolveArkanoidBallContext,
  resolveArkanoidPaddleContext,
  resolveArkanoidBrickContext,
} from "./ArkanoidRenderUtils";

export const drawArkanoidBall: ShapeDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world, entity) {
    const ballCtx = resolveArkanoidBallContext(world, entity);
    if (!ballCtx) return;

    drawGlowOrbCanvas(ctx, ballCtx.size, ballCtx.color, 0.4, 2.0, "fill");
  }
};

export const drawArkanoidPaddle: ShapeDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world, entity) {
    const paddleCtx = resolveArkanoidPaddleContext(world, entity);
    if (!paddleCtx) return;

    const { w, h, primaryColor, glowColor } = paddleCtx;

    drawNeonShape(
      ctx,
      world.tick,
      primaryColor,
      glowColor,
      (ctx, widthScale, heightScale) => {
        const pw = w * widthScale;
        const ph = h * heightScale;
        canvasRoundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, 4);
      },
      (ctx) => {
        const coreW = w * 0.6;
        const coreH = h * 0.5;
        canvasRoundRectPath(ctx, -coreW / 2, -coreH / 2, coreW, coreH, 2);
      }
    );
  }
};

export const drawArkanoidCapsule: ShapeDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const capsule = world.getComponent(entity, "Capsule");
    const capsuleType = capsule?.capsuleType || "E";
    const capsuleColor = render.color || colors.cyan;

    const w = 24;
    const h = 14;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = capsuleColor;
    ctx.fillStyle = capsuleColor;

    ctx.beginPath();
    canvasRoundRectPath(ctx, -w / 2, -h / 2, w, h, 7);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.background;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(capsuleType, 0, 1);

    ctx.restore();
  }
};

export const drawArkanoidBrick: ShapeDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world, entity) {
    const brickCtx = resolveArkanoidBrickContext(world, entity);
    if (!brickCtx) return;

    const { w, h, brickColor } = brickCtx;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = brickColor;
    ctx.fillStyle = brickColor;

    ctx.beginPath();
    canvasRoundRectPath(ctx, -w / 2, -h / 2, w, h, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 3);

    ctx.restore();
  }
};

export const drawArkanoidBackground: EffectDrawer<CanvasRenderingContext2D, ArkanoidComponentRegistry> = {
  draw(ctx, world) {
    const config = world.getResource<ArkanoidConfig>("GameConfig") || { worldWidth: 800, worldHeight: 600 };
    const width = config.worldWidth;
    const height = config.worldHeight;

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
