import { ShapeDrawer, EffectDrawer, World, TransformComponent } from "@tiny-aster/core";
import { PongComponentRegistry, BallComponent } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { ComboComponent } from "../../shared/arcade/components/ComboComponent";
import { CanvasMotionTrail, drawNeonShape, drawProceduralGrid } from "../../shared/rendering/CanvasNeonUtils";

// Instantiate the reusable, zero-allocation motion trail helper
const ballMotionTrail = new CanvasMotionTrail(30);

/**
 * Upgraded, high-fidelity ball shape drawer with a swirling core and dynamic fading afterimage trails.
 * Leverages generic, zero-allocation motion trail utilities.
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

    // 1. Fetch Combo component to dynamically shift trail length and color
    const comboComponent = world.getSingleton("Combo") as ComboComponent | undefined;
    const multiplier = comboComponent?.multiplier ?? 1;

    let trailLength = 8;
    let trailColor = "rgba(0, 255, 255, 0.4)"; // Default: Cyan
    let trailColorInner = "rgba(255, 255, 255, 0.2)";
    let ballColor = "#00FFFF";

    if (multiplier === 2) {
      trailLength = 16;
      trailColor = "rgba(255, 0, 255, 0.5)"; // Pink/Magenta
      trailColorInner = "rgba(255, 255, 255, 0.3)";
      ballColor = "#FF00FF";
    } else if (multiplier >= 3) {
      trailLength = 24;
      trailColor = "rgba(255, 215, 0, 0.6)"; // Gold
      trailColorInner = "rgba(255, 255, 255, 0.4)";
      ballColor = "#FFD700";
    }

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
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * spin * 1.5, 0, 0, size);
    ctx.moveTo(-size, 0);
    ctx.quadraticCurveTo(0, size * spin * 1.5, size, 0);
    ctx.stroke();

    // Hot inner core
    ctx.fillStyle = "#FFFFFF";
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
    const color = isLeft ? "#FF00FF" : "#00FFFF";
    const glowAlphaColor = isLeft ? "rgba(255, 0, 255, 0.15)" : "rgba(0, 255, 255, 0.15)";

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
 * Procedural retro space-grid background effect drawer with scrolling grid, CRT scanlines, and screen vignette.
 * Leverages the generic drawProceduralGrid utility.
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
    ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
    ctx.shadowColor = "#FF00FF";
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
  }
};
