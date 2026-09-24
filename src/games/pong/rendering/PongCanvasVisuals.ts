import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { PongComponentRegistry } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { CanvasMotionTrail, drawNeonShape, drawProceduralGrid, canvasRoundRectPath } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";
import { resolvePongBallContext, resolvePongPaddleContext } from "./PongRenderUtils";

// Instantiate the reusable, zero-allocation motion trail helper
const ballMotionTrail = new CanvasMotionTrail(30);

/**
 * Upgraded, high-fidelity ball shape drawer with a swirling core and dynamic fading afterimage trails.
 * @public
 */
export const drawPongBall: ShapeDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world, entity) {
    const ballCtx = resolvePongBallContext(world, entity);
    if (!ballCtx) return;

    const { size, x, y, spin, swirlRotation, trailLength, trailColor, trailColorInner, ballColor } = ballCtx;

    // Update and draw trails using the generic zero-allocation motion trail tracker
    ballMotionTrail.update(entity, x, y, 4);
    ballMotionTrail.draw(ctx, entity, x, y, trailLength, size, trailColor, trailColorInner);

    // Render the ball with a swirling core reflecting actual spinFactor
    ctx.save();

    ctx.rotate(swirlRotation);

    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = ballColor;

    // Outer neon ring
    ctx.strokeStyle = ballColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.stroke();

    // Swirling lines
    ctx.shadowBlur = 0;
    ctx.strokeStyle = colors.white;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * spin * 1.5, 0, 0, size);
    ctx.moveTo(-size, 0);
    ctx.quadraticCurveTo(0, size * spin * 1.5, size, 0);
    ctx.stroke();

    // Hot inner core
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Upgraded, high-fidelity paddle shape drawer with side-specific neon glowing hues,
 * inner cores, and pulsing contours.
 * @public
 */
export const drawPongPaddle: ShapeDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world, entity) {
    const paddleCtx = resolvePongPaddleContext(world, entity);
    if (!paddleCtx) return;

    const { w, h, color, glowAlphaColor } = paddleCtx;

    drawNeonShape(
      ctx,
      world.tick,
      color,
      glowAlphaColor,
      (ctx, widthScale, heightScale) => {
        const pw = w * widthScale;
        const ph = h * heightScale;
        canvasRoundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, 4);
      },
      (ctx) => {
        const coreW = w * 0.4;
        const coreH = h * 0.9;
        canvasRoundRectPath(ctx, -coreW / 2, -coreH / 2, coreW, coreH, 2);
      }
    );
  }
};

/**
 * Procedural retro space-grid background effect drawer.
 * @public
 */
export const drawPongBackground: EffectDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world) {
    const config = world.getResource<PongConfig>("GameConfig") || { worldWidth: 800, worldHeight: 600 };
    const width = config.worldWidth;
    const height = config.worldHeight;

    drawProceduralGrid(ctx, width, height, world.tick, 40, 0.3);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 0, 85, 0.3)";
    ctx.shadowColor = colors.pink;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3.0;
    ctx.setLineDash([10, 15]);

    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    ctx.restore();

    const state = world.getSingleton("PongState");
    if (state && state.scoreFreezeRemaining !== undefined && state.scoreFreezeRemaining > 0) {
      ctx.save();
      const text = state.lastScorer === "p1" ? "P1 SCORES!" : "P2 SCORES!";
      const neonColor = state.lastScorer === "p1" ? colors.pink : colors.cyan;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const pulseFactor = 1.0 + 0.1 * Math.sin(world.tick / 4);
      ctx.font = `bold ${Math.round(48 * pulseFactor)}px monospace`;

      ctx.shadowColor = neonColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = neonColor;
      ctx.fillText(text, width / 2, height / 2);

      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.white;
      ctx.fillText(text, width / 2, height / 2);

      ctx.restore();
    }

    if (state && state.shieldPulseRemaining !== undefined && state.shieldPulseRemaining > 0) {
      ctx.save();
      ctx.strokeStyle = colors.cyan;
      ctx.shadowColor = colors.cyan;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 4.0;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(world.tick / 5);

      ctx.beginPath();
      ctx.arc(0, height / 2, height * 0.8, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.restore();
    }
  }
};
