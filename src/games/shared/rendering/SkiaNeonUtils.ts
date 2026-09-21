import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "./ProceduralShapeUtils";
import { Skia } from "./SkiaContext";

export interface TrailPoint {
  x: number;
  y: number;
  active: boolean;
}

/**
 * Generic shape drawing helper for Skia that handles pulsing neon glows,
 * body fills, and bright white high-tech inner cores.
 *
 * @param canvas - Skia Canvas instance.
 * @param paint - Skia Paint instance from `getPaint()`.
 * @param tick - Simulation tick count used for neon pulse timing.
 * @param color - Main stroke color string.
 * @param glowAlphaColor - Semi-transparent body fill color string.
 * @param drawOutline - Callback that constructs/draws the outer shape contour onto the canvas with the given paint.
 * @param drawCore - Callback that constructs/draws the inner core shape onto the canvas with the given paint.
 * @public
 */
export function drawNeonShapeSkia(
  canvas: any,
  paint: any,
  tick: number,
  color: string,
  glowAlphaColor: string,
  drawOutline: (canvas: any, paint: any, widthScale: number, heightScale: number) => void,
  drawCore: (canvas: any, paint: any) => void
): void {
  if (!Skia) return;

  canvas.save();

  const pulseFactor = computeNeonPulse(tick);

  // 1. Draw outer glowing outline
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setColor(Skia.Color(color));
  paint.setStrokeWidth(2.0);
  drawOutline(canvas, paint, pulseFactor, 1.0);

  // 2. Draw outer glowing semi-transparent body fill
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(glowAlphaColor));
  drawOutline(canvas, paint, 1.0, 1.0);

  // 3. Draw bright white core
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(colors.white));
  drawCore(canvas, paint);

  canvas.restore();
}

/**
 * Zero-allocation, high-performance Skia motion trail tracker and renderer.
 * Pure Skia utility with zero Canvas dependencies.
 * @public
 */
export class SkiaMotionTrail {
  private readonly trails = new Map<number, TrailPoint[]>();
  protected readonly maxPoints: number;

  constructor(maxPoints: number = 30) {
    this.maxPoints = maxPoints;
  }

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

  public drawSkia(
    canvas: any,
    paint: any,
    entityId: number,
    currentX: number,
    currentY: number,
    length: number,
    size: number,
    outerColorStr: string,
    innerColorStr: string
  ): void {
    if (!Skia) return;
    const trail = this.getTrail(entityId);
    const drawLength = Math.min(length, this.maxPoints);

    for (let i = drawLength - 1; i >= 0; i--) {
      const p = trail[i];
      if (!p.active) continue;

      const ratio = 1 - (i / drawLength);
      const alpha = ratio * 0.4;
      const trailSize = size * (0.3 + 0.7 * ratio);

      canvas.save();
      canvas.translate(p.x - currentX, p.y - currentY);

      // Outer glow circle
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(outerColorStr));
      paint.setAlphaf(alpha);
      canvas.drawCircle(0, 0, trailSize * 1.5, paint);

      // Inner core circle
      paint.setColor(Skia.Color(innerColorStr));
      paint.setAlphaf(alpha * 0.5);
      canvas.drawCircle(0, 0, trailSize, paint);

      canvas.restore();
    }
  }
}

/**
 * Draws a glowing orb with an outer neon stroke and a bright white inner core in Skia.
 * @public
 */
export function drawGlowOrbSkia(
  canvas: any,
  paint: any,
  size: number,
  color: string,
  coreScale: number = 0.4,
  strokeWidth: number = 2.0
): void {
  if (!Skia) return;
  canvas.save();

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setColor(Skia.Color(color));
  paint.setStrokeWidth(strokeWidth);
  canvas.drawCircle(0, 0, size, paint);

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(colors.white));
  canvas.drawCircle(0, 0, size * coreScale, paint);

  canvas.restore();
}
