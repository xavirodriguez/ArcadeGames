import { ShapeDrawer, EffectDrawer, World, TransformComponent } from "@tiny-aster/core";
import { PongComponentRegistry, BallComponent } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { ComboComponent } from "../../shared/arcade/components/ComboComponent";
import { CanvasMotionTrail, drawNeonShape, drawProceduralGrid, getComboReaction } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";

// Instantiate the reusable, zero-allocation motion trail helper
const ballMotionTrail = new CanvasMotionTrail(30);

/**
 * Upgraded, high-fidelity ball shape drawer with a swirling core and dynamic fading afterimage trails.
 * @public
 */
export const drawPongBall: ShapeDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const ballComp = world.getComponent(entity, "Ball") as BallComponent | undefined;
    const size = render.size ?? 8;

    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    // 1. Fetch Combo component to dynamically shift trail length and color using shared getComboReaction utility
    const comboComponent = world.getSingleton("Combo") as ComboComponent | undefined;
    const multiplier = comboComponent?.multiplier ?? 1;

    const { trailLength, trailColor, trailColorInner, mainColor: ballColor } = getComboReaction(multiplier);

    // 2. Update and draw trails using the generic zero-allocation motion trail tracker
    ballMotionTrail.update(entity, x, y, 4);
    ballMotionTrail.draw(ctx, entity, x, y, trailLength, size, trailColor, trailColorInner);

    // 3. Render the ball with a swirling core reflecting actual spinFactor
    ctx.save();

    const spin = ballComp ? ballComp.spinFactor : 0;
    const swirlRotation = (world.tick * spin * 0.08) % (Math.PI * 2);
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
 * inner cores, and pulsing contours. Leverages the generic drawNeonShape utility.
 * @public
 */
export const drawPongPaddle: ShapeDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const paddle = world.getComponent(entity, "Paddle");
    if (!paddle) return;

    const config = world.getResource<PongConfig>("GameConfig") || { PADDLE_WIDTH: 15, PADDLE_HEIGHT: 80 };
    const w = config.PADDLE_WIDTH;
    const h = config.PADDLE_HEIGHT;

    const isLeft = paddle.side === "left";
    const color = isLeft ? colors.pink : colors.cyan;
    const glowAlphaColor = isLeft ? "rgba(255, 0, 85, 0.15)" : "rgba(0, 240, 255, 0.15)";

    drawNeonShape(
      ctx,
      world.tick,
      color,
      glowAlphaColor,
      // 1. Draw outline path
      (ctx, widthScale, heightScale) => {
        const pw = w * widthScale;
        const ph = h * heightScale;
        if (ctx.roundRect) {
          ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 4);
        } else {
          ctx.rect(-pw / 2, -ph / 2, pw, ph);
        }
      },
      // 2. Draw white core path
      (ctx) => {
        const coreW = w * 0.4;
        const coreH = h * 0.9;
        if (ctx.roundRect) {
          ctx.roundRect(-coreW / 2, -coreH / 2, coreW, coreH, 2);
        } else {
          ctx.rect(-coreW / 2, -coreH / 2, coreW, coreH);
        }
      }
    );
  }
};

/**
 * Procedural retro space-grid background effect drawer with scrolling grid, CRT scanlines, screen vignette,
 * scored freeze neon overlays, and protective neon shield rendering.
 * @public
 */
export const drawPongBackground: EffectDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world) {
    const config = world.getResource<PongConfig>("GameConfig") || { WIDTH: 800, HEIGHT: 600 };
    const width = config.WIDTH;
    const height = config.HEIGHT;

    // Draw the generic space grid
    drawProceduralGrid(ctx, width, height, world.tick, 40, 0.3);

    // Add Pong-specific decorative overlay (Neon Center Divider)
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

    // Inner bright white divider line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    ctx.restore();

    // Draw floating neon "GOAL!" transition freeze text and countdown overlays if active
    const state = world.getSingleton("PongState");
    if (state && state.scoreFreezeRemaining !== undefined && state.scoreFreezeRemaining > 0) {
      ctx.save();
      const text = state.lastScorer === "p1" ? "P1 SCORES!" : "P2 SCORES!";
      const neonColor = state.lastScorer === "p1" ? colors.pink : colors.cyan;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Drawing Pulsing Glow drop shadow text
      const pulseFactor = 1.0 + 0.1 * Math.sin(world.tick / 4);
      ctx.font = `bold ${Math.round(48 * pulseFactor)}px monospace`;

      ctx.shadowColor = neonColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = neonColor;
      ctx.fillText(text, width / 2, height / 2);

      // White inner text
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.white;
      ctx.fillText(text, width / 2, height / 2);

      ctx.restore();
    }

    // Draw the glowing neon shield barrier behind Player 1 if shield_pulse is active
    if (state && state.shieldPulseRemaining !== undefined && state.shieldPulseRemaining > 0) {
      ctx.save();
      ctx.strokeStyle = colors.cyan;
      ctx.shadowColor = colors.cyan;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 4.0;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(world.tick / 5);

      ctx.beginPath();
      // Draw a sleek curved arc barrier right at the P1 defensive line
      ctx.arc(0, height / 2, height * 0.8, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.restore();
    }
  }
};
