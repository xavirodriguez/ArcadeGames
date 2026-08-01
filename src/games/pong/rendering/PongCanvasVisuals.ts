import { World, TransformComponent, VelocityComponent, ColliderComponent, ShapeType, BoxShape, EffectDrawer, ShapeDrawer } from "@tiny-aster/core";
import { BallComponent, PaddleComponent, PongComponentRegistry } from "../types";

/**
 * Procedural helper to draw a rounded rectangle in canvas context without creating objects.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * specialized ShapeDrawer to render the Ball as a high-tech glowing plasma core with rotating lines and trailing afterimages.
 */
export const drawPongBall: ShapeDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world, entity) {
    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const ballComp = world.getComponent(entity, "Ball" as any) as BallComponent;
    const velocity = world.getComponent(entity, "Velocity") as VelocityComponent;
    const size = 8; // Ball size

    const comboEntities = world.query("Combo" as any);
    let comboMultiplier = 1;
    if (comboEntities.length > 0) {
      const comboComp = world.getComponent(comboEntities[0], "Combo" as any) as any;
      if (comboComp) {
        comboMultiplier = comboComp.multiplier || 1;
      }
    }

    // 1. Dynamic Trail/Afterimage effect (procedural, zero-allocation)
    if (velocity && (Math.abs(velocity.vx) > 0.1 || Math.abs(velocity.vy) > 0.1)) {
      ctx.save();
      // Determine trail colors and length depending on combo multiplier
      let trailColor = "#00E5FF"; // Combo x1: Icy blue
      let maxTrailLength = 5;
      if (comboMultiplier === 2) {
        trailColor = "#FF007F"; // Combo x2: Vibrant Magenta
        maxTrailLength = 8;
      } else if (comboMultiplier >= 3) {
        trailColor = "#FFD700"; // Combo x3+: Solar Gold
        maxTrailLength = 12;
      }

      // Draw mathematical segments tracing back along the inverse velocity vector
      const vxNorm = velocity.vx;
      const vyNorm = velocity.vy;
      const dt = 0.016; // Simulated step for frame offset

      for (let i = 1; i <= maxTrailLength; i++) {
        const factor = i / maxTrailLength;
        const opacity = 0.5 * (1 - factor);
        const trailX = transform.x - vxNorm * dt * i * 0.7;
        const trailY = transform.y - vyNorm * dt * i * 0.7;
        const trailSize = size * (1 - factor * 0.4);

        ctx.fillStyle = trailColor;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(transform.x, transform.y);

    // Dynamic rotation of the ball's interior core based on spinFactor
    const spin = ballComp ? ballComp.spinFactor : 0;
    // Add time pulsing to rotation for idle interest
    const pulseRotation = spin * Math.PI + (world.tick / 30);
    ctx.rotate(pulseRotation);

    // 2. Neon Outer Plasma Ring Glow
    let glowColor = "#FFFFFF";
    if (comboMultiplier === 1) {
      glowColor = "#00E5FF";
    } else if (comboMultiplier === 2) {
      glowColor = "#FF007F";
    } else {
      glowColor = "#FFD700";
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = glowColor;

    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, size + 2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Hot White Core
    ctx.shadowBlur = 0; // Reset shadow for inner sharp core
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(0, 0, size - 1, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rotating Energy Swirl Detail (High-tech oscilloscope style)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    // Swirling curves
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.4, 0, 0, size);
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(-size * 0.4, 0, 0, size);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Specialized ShapeDrawer to render the paddle as a futuristic sci-fi bumper.
 */
export const drawPongPaddle: ShapeDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world, entity) {
    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    // Fetch actual dimensions from Collider or fall back to default
    const collider = world.getComponent(entity, "Collider") as ColliderComponent;
    let width = 14;
    let height = 75;
    if (collider && collider.shape && collider.shape.type === ShapeType.Box) {
      const box = collider.shape as BoxShape;
      width = box.width;
      height = box.height;
    }

    const paddleComp = world.getComponent(entity, "Paddle" as any) as PaddleComponent;
    const isLeft = paddleComp ? paddleComp.side === "left" : true;

    ctx.save();
    ctx.translate(transform.x, transform.y);

    const cornerRadius = 5;

    // 1. Sleek Neon Energy Shield Overlay (pulsing neon hull)
    const neonColor = isLeft ? "#FF0055" : "#00FF66"; // Left is Neon Red/Pink, Right is Neon Emerald
    ctx.strokeStyle = neonColor;
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;

    // Draw the outer pulsing outline
    const pulseFactor = 1.0 + Math.sin(world.tick / 8) * 0.05;
    ctx.save();
    ctx.scale(pulseFactor, pulseFactor);
    drawRoundedRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
    ctx.stroke();
    ctx.restore();

    // 2. Energy Glass Core (procedural dark gradient fill with a bright central power tube)
    ctx.shadowBlur = 0; // Clear blur for core fill
    ctx.fillStyle = "rgba(10, 10, 15, 0.95)";
    drawRoundedRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
    ctx.fill();

    // Draw the bright center glass light strip
    ctx.fillStyle = "#FFFFFF";
    ctx.globalAlpha = 0.9;
    drawRoundedRect(ctx, -2, -height / 2 + 6, 4, height - 12, 1.5);
    ctx.fill();

    // Draw side panels to give physical weight
    ctx.fillStyle = neonColor;
    ctx.globalAlpha = 0.55;
    if (isLeft) {
      // Left paddle: heavy metallic plate on back (left side)
      ctx.fillRect(-width / 2, -height / 2 + 4, 3, height - 8);
    } else {
      // Right paddle: heavy metallic plate on back (right side)
      ctx.fillRect(width / 2 - 3, -height / 2 + 4, 3, height - 8);
    }

    ctx.restore();
  }
};

/**
 * Cyberpunk Grid background with center glowing divider, CRT Scanlines and Screen Vignette.
 */
let cachedBgGradient: CanvasGradient | null = null;
let lastBgHeight = 0;

export const drawPongBackground: EffectDrawer<CanvasRenderingContext2D, PongComponentRegistry> = {
  draw(ctx, world) {
    const { width = 800, height = 600 } = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const tick = world.tick;

    // 1. Deep space background gradient
    if (!cachedBgGradient || lastBgHeight !== height) {
      cachedBgGradient = ctx.createLinearGradient(0, 0, 0, height);
      cachedBgGradient.addColorStop(0, "#080612"); // Very dark violet core
      cachedBgGradient.addColorStop(0.5, "#020108"); // Near black middle
      cachedBgGradient.addColorStop(1, "#070c14"); // Cyber blue deep bottom
      lastBgHeight = height;
    }
    ctx.fillStyle = cachedBgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Cyberpunk Scrolling Neon Grid Lines
    ctx.save();
    ctx.strokeStyle = "rgba(0, 229, 255, 0.05)"; // Deep faint cyan
    ctx.lineWidth = 1.0;

    const gridSpacing = 40;
    const gridOffsetY = (tick * 0.3) % gridSpacing;

    // Horizontal scrolling grid lines
    for (let y = gridOffsetY; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines (static or slightly pulsing)
    const pulseIntensity = 0.05 + Math.sin(tick / 15) * 0.015;
    ctx.strokeStyle = `rgba(0, 229, 255, ${pulseIntensity})`;
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Glowing Center division dashed line
    ctx.save();
    ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
    ctx.shadowColor = "#00E5FF";
    ctx.shadowBlur = 8;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 16]); // Classic retro dash pattern
    ctx.beginPath();
    ctx.moveTo(width / 2, 10);
    ctx.lineTo(width / 2, height - 10);
    ctx.stroke();
    ctx.restore();

    // 4. CRT Retro Scanline Grid (drawn procedurally)
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.5);
    }
    ctx.restore();

    // 5. High-fidelity Screen Vignette border shadow
    ctx.save();
    const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.4, width / 2, height / 2, Math.max(width, height) * 0.7);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.65)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
};
