/**
 * CanvasNeonUtils.ts
 * Reusable, high-fidelity, zero-allocation retro cyber-neon rendering utilities for HTML5 Canvas.
 */

import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "./ProceduralShapeUtils";

export interface TrailPoint {
  x: number;
  y: number;
  active: boolean;
}

/**
 * Zero-allocation, high-performance motion trail tracker and renderer.
 * Keeps a pre-allocated pool of trail points per entity to avoid GC overhead.
 */
export class CanvasMotionTrail {
  private readonly trails = new Map<number, TrailPoint[]>();
  protected readonly maxPoints: number;

  constructor(maxPoints: number = 30) {
    this.maxPoints = maxPoints;
  }

  /**
   * Retrieves or initializes the trail points buffer for a specific entity ID.
   */
  public getTrail(entityId: number): TrailPoint[] {
    let trail = this.trails.get(entityId);
    if (!trail) {
      trail = [];
      for (let i = 0; i < this.maxPoints; i++) {
        trail.push({ x: 0, y: 0, active: false });
      }
      this.trails.set(entityId, trail);
    }
    return trail;
  }

  /**
   * Updates the trail coordinates when the entity moves beyond a small threshold.
   */
  public update(entityId: number, x: number, y: number, minDistanceSq: number = 4): void {
    const trail = this.getTrail(entityId);
    const lastPoint = trail[0];
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distSq = dx * dx + dy * dy;

    if (!lastPoint.active || distSq > minDistanceSq) {
      for (let i = this.maxPoints - 1; i > 0; i--) {
        trail[i].x = trail[i - 1].x;
        trail[i].y = trail[i - 1].y;
        trail[i].active = trail[i - 1].active;
      }
      trail[0].x = x;
      trail[0].y = y;
      trail[0].active = true;
    }
  }

  /**
   * Draws a fading motion trail with dynamic length, scaling, and colors.
   */
  // TODO(refactor): código duplicado detectado (método) con pong/rendering/PongSkiaVisuals.ts:38-49. Considerar extraer a función compartida. Ref: 813ea086
  public draw(
    ctx: CanvasRenderingContext2D,
    entityId: number,
    currentX: number,
    currentY: number,
    length: number,
    size: number,
    outerColor: string,
    innerColor: string
  ): void {
    const trail = this.getTrail(entityId);
    const drawLength = Math.min(length, this.maxPoints);

    for (let i = drawLength - 1; i >= 0; i--) {
      const p = trail[i];
      if (!p.active) continue;

      const ratio = 1 - (i / drawLength);
      const alpha = ratio * 0.4;
      const trailSize = size * (0.3 + 0.7 * ratio);

      ctx.save();
      ctx.translate(p.x - currentX, p.y - currentY);

      ctx.fillStyle = outerColor;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(0, 0, trailSize * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = innerColor;
      ctx.beginPath();
      ctx.arc(0, 0, trailSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

/**
 * Generic shape drawing helper that handles pulsing neon glows, body fills,
 * and bright white high-tech inner cores.
 */
export function drawNeonShape(
  ctx: CanvasRenderingContext2D,
  tick: number,
  color: string,
  glowAlphaColor: string,
  drawOutline: (ctx: CanvasRenderingContext2D, widthScale: number, heightScale: number) => void,
  drawCore: (ctx: CanvasRenderingContext2D) => void
): void {
  ctx.save();

  // 1. Draw outer glowing outline
  const pulseFactor = computeNeonPulse(tick);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2.0;

  ctx.beginPath();
  drawOutline(ctx, pulseFactor, 1.0);
  ctx.stroke();

  // 2. Draw outer glowing semi-transparent body fill
  ctx.fillStyle = glowAlphaColor;
  ctx.beginPath();
  drawOutline(ctx, 1.0, 1.0);
  ctx.fill();

  // 3. Draw bright white core
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.white;
  ctx.beginPath();
  drawCore(ctx);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders a slow scrolling neon-cyber grid along with soft CRT scanlines and screen vignette.
 */
export function drawProceduralGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tick: number,
  gridSize: number = 40,
  scrollSpeed: number = 0.3
): void {
  ctx.save();

  // 1. Solid deep space dark background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  // 2. Scrolling cyber-neon grid lines
  const scrollOffset = (tick * scrollSpeed) % gridSize;

  ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
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

  ctx.restore();

  // 3. Soft procedural CRT scanlines
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1.5);
  }

  // 4. Screen Vignette border
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, width, 12); // Top edge
  ctx.fillRect(0, height - 12, width, 12); // Bottom edge
  ctx.fillRect(0, 0, 12, height); // Left edge
  ctx.fillRect(width - 12, 0, 12, height); // Right edge
}

/**
 * Shared utility to calculate high-fidelity reactive color, trail lengths,
 * and hues depending on the player's active combo multiplier.
 * Generalizes the heat-shift effect across retro games.
 */
export function getComboReaction(multiplier: number): {
  trailLength: number;
  trailColor: string;
  trailColorInner: string;
  mainColor: string;
} {
  let trailLength = 8;
  let trailColor = "rgba(0, 240, 255, 0.4)"; // Default: Cyan
  let trailColorInner = "rgba(255, 255, 255, 0.2)";
  let mainColor: string = colors.cyan;

  if (multiplier === 2) {
    trailLength = 16;
    trailColor = "rgba(255, 0, 85, 0.5)"; // Pink/Magenta (colors.pink)
    trailColorInner = "rgba(255, 255, 255, 0.3)";
    mainColor = colors.pink;
  } else if (multiplier >= 3) {
    trailLength = 24;
    trailColor = "rgba(255, 215, 0, 0.6)"; // Gold (colors.gold)
    trailColorInner = "rgba(255, 255, 255, 0.4)";
    mainColor = colors.gold;
  }

  return { trailLength, trailColor, trailColorInner, mainColor };
}
