import { ShapeDrawer, EffectDrawer, World, TransformComponent } from "@tiny-aster/core";
import { PongComponentRegistry, BallComponent } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { ComboComponent } from "../../shared/arcade/components/ComboComponent";

interface TrailPoint {
  x: number;
  y: number;
  active: boolean;
}

const MAX_TRAIL_POINTS = 30;
const ballTrails = new Map<number, TrailPoint[]>();

function getBallTrail(entity: number): TrailPoint[] {
  let trail = ballTrails.get(entity);
  if (!trail) {
    trail = [];
    for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
      trail.push({ x: 0, y: 0, active: false });
    }
    ballTrails.set(entity, trail);
  }
  return trail;
}

/**
 * Upgraded, high-fidelity ball shape drawer with a swirling core and dynamic fading afterimage trails.
 * Zero-allocation in the render loop.
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

    // 1. Manage and update the pre-allocated trail buffer
    const trail = getBallTrail(entity);
    const lastPoint = trail[0];
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distSq = dx * dx + dy * dy;

    if (!lastPoint.active || distSq > 4) {
      for (let i = MAX_TRAIL_POINTS - 1; i > 0; i--) {
        trail[i].x = trail[i - 1].x;
        trail[i].y = trail[i - 1].y;
        trail[i].active = trail[i - 1].active;
      }
      trail[0].x = x;
      trail[0].y = y;
      trail[0].active = true;
    }

    // 2. Fetch Combo component to dynamically shift trail length and color
    const comboComponent = world.getSingleton("Combo") as ComboComponent | undefined;
    const multiplier = comboComponent?.multiplier ?? 1;

    let trailLength = 8;
    let trailColor = "rgba(0, 255, 255, 0.4)"; // Default: Cyan
    let trailColorInner = "rgba(255, 255, 255, 0.2)";

    if (multiplier === 2) {
      trailLength = 16;
      trailColor = "rgba(255, 0, 255, 0.5)"; // Pink/Magenta
      trailColorInner = "rgba(255, 255, 255, 0.3)";
    } else if (multiplier >= 3) {
      trailLength = 24;
      trailColor = "rgba(255, 215, 0, 0.6)"; // Gold
      trailColorInner = "rgba(255, 255, 255, 0.4)";
    }

    // 3. Render fading motion trail afterimages (relative coordinates)
    for (let i = trailLength - 1; i >= 0; i--) {
      const p = trail[i];
      if (!p.active) continue;

      const ratio = 1 - (i / trailLength);
      const alpha = ratio * 0.4;
      const trailSize = size * (0.3 + 0.7 * ratio);

      ctx.save();
      ctx.translate(p.x - x, p.y - y);

      ctx.fillStyle = trailColor;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(0, 0, trailSize * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = trailColorInner;
      ctx.beginPath();
      ctx.arc(0, 0, trailSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 4. Render the ball with a swirling core reflecting actual spinFactor
    ctx.save();

    const spin = ballComp ? ballComp.spinFactor : 0;
    const swirlRotation = (world.tick * spin * 0.08) % (Math.PI * 2);
    ctx.rotate(swirlRotation);

    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = multiplier >= 3 ? "#FFD700" : multiplier === 2 ? "#FF00FF" : "#00FFFF";

    // Outer neon ring
    ctx.strokeStyle = multiplier >= 3 ? "#FFD700" : multiplier === 2 ? "#FF00FF" : "#00FFFF";
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
 * inner cores, and pulsing contours.
 * Zero-allocation in the render loop.
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

    ctx.save();

    // Side-specific glowing hues (Left = Pink/Magenta, Right = Cyan)
    const isLeft = paddle.side === "left";
    const neonColor = isLeft ? "#FF00FF" : "#00FFFF";

    // Pulsing contour factor based on tick
    const pulseFactor = 1.0 + 0.08 * Math.sin(world.tick / 6);

    // 1. Draw outer glowing contour
    ctx.strokeStyle = neonColor;
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.0;

    const pw = w * pulseFactor;
    const ph = h;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 4);
    } else {
      ctx.rect(-pw / 2, -ph / 2, pw, ph);
    }
    ctx.stroke();

    // 2. Draw semi-transparent neon body fill
    ctx.fillStyle = isLeft ? "rgba(255, 0, 255, 0.15)" : "rgba(0, 255, 255, 0.15)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.fill();

    // 3. Draw bright white inner core
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFFFFF";
    const coreW = w * 0.4;
    const coreH = h * 0.9;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-coreW / 2, -coreH / 2, coreW, coreH, 2);
    } else {
      ctx.rect(-coreW / 2, -coreH / 2, coreW, coreH);
    }
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Procedural retro space-grid background effect drawer with scrolling grid, CRT scanlines, and screen vignette.
 * Zero-allocation in the render loop.
 * @public
 */
export const drawPongBackground: EffectDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world) {
    const config = world.getResource<PongConfig>("GameConfig") || { WIDTH: 800, HEIGHT: 600 };
    const width = config.WIDTH;
    const height = config.HEIGHT;

    ctx.save();

    // 1. Solid deep space background
    ctx.fillStyle = "#0A0A0F";
    ctx.fillRect(0, 0, width, height);

    // 2. Scrolling cyber-neon grid lines
    const gridSize = 40;
    const scrollOffset = (world.tick * 0.3) % gridSize;

    ctx.strokeStyle = "rgba(0, 255, 255, 0.04)";
    ctx.lineWidth = 1.0;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = scrollOffset; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Glowing neon dashed center divider
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

    // 4. Soft procedural CRT scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.5);
    }

    // 5. Screen Vignette border
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, width, 12); // Top edge
    ctx.fillRect(0, height - 12, width, 12); // Bottom edge
    ctx.fillRect(0, 0, 12, height); // Left edge
    ctx.fillRect(width - 12, 0, 12, height); // Right edge
  }
};
