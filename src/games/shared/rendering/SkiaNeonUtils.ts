import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "./ProceduralShapeUtils";
import { Skia } from "./SkiaContext";
import { MotionTrailBuffer, computeMotionTrailSegment, TrailPoint } from "./MotionTrailBuffer";

export { TrailPoint };

/**
 * Creates and initializes a Skia Paint configured for Fill operations.
 *
 * @param colorStr - Color string or hex token.
 * @param alpha - Optional opacity scaling factor between 0.0 and 1.0. Defaults to 1.0.
 * @param existingPaint - Optional pre-allocated Skia Paint instance to reset and reuse.
 * @returns Configured Skia Paint object.
 * @public
 */
export function makeFillPaint(colorStr: string, alpha: number = 1.0, existingPaint?: any): any {
  if (!Skia) return undefined;
  const paint = existingPaint || Skia.Paint();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(colorStr));
  if (alpha < 1.0) {
    paint.setAlphaf(alpha);
  }
  return paint;
}

/**
 * Creates and initializes a Skia Paint configured for Stroke operations.
 *
 * @param colorStr - Color string or hex token.
 * @param strokeWidth - Width of stroke lines. Defaults to 1.0.
 * @param alpha - Optional opacity scaling factor between 0.0 and 1.0. Defaults to 1.0.
 * @param existingPaint - Optional pre-allocated Skia Paint instance to reset and reuse.
 * @returns Configured Skia Paint object.
 * @public
 */
export function makeStrokePaint(colorStr: string, strokeWidth: number = 1.0, alpha: number = 1.0, existingPaint?: any): any {
  if (!Skia) return undefined;
  const paint = existingPaint || Skia.Paint();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setColor(Skia.Color(colorStr));
  paint.setStrokeWidth(strokeWidth);
  if (alpha < 1.0) {
    paint.setAlphaf(alpha);
  }
  return paint;
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
  makeStrokePaint(color, 2.0, 1.0, paint);
  drawOutline(canvas, paint, pulseFactor, 1.0);

  // 2. Draw outer glowing semi-transparent body fill
  makeFillPaint(glowAlphaColor, 1.0, paint);
  drawOutline(canvas, paint, 1.0, 1.0);

  // 3. Draw bright white core
  makeFillPaint(colors.white, 1.0, paint);
  drawCore(canvas, paint);

  canvas.restore();
}

/**
 * Zero-allocation, high-performance Skia motion trail tracker and renderer.
 * Delegates buffer tracking and update logic to MotionTrailBuffer.
 * Pure Skia utility with zero Canvas dependencies.
 * @public
 */
export class SkiaMotionTrail {
  private readonly trailBuffer: MotionTrailBuffer;
  protected readonly maxPoints: number;

  constructor(maxPoints: number = 30) {
    this.maxPoints = maxPoints;
    this.trailBuffer = new MotionTrailBuffer(maxPoints);
  }

  public getTrail(entityId: number): TrailPoint[] {
    return this.trailBuffer.getTrail(entityId);
  }

  public update(entityId: number, x: number, y: number, minDistanceSq: number = 4): void {
    this.trailBuffer.update(entityId, x, y, minDistanceSq);
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

      const { alpha, trailSize } = computeMotionTrailSegment(i, drawLength, size);

      canvas.save();
      canvas.translate(p.x - currentX, p.y - currentY);

      // Outer glow circle
      makeFillPaint(outerColorStr, alpha, paint);
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

  makeStrokePaint(color, strokeWidth, 1.0, paint);
  canvas.drawCircle(0, 0, size, paint);

  makeFillPaint(colors.white, 1.0, paint);
  canvas.drawCircle(0, 0, size * coreScale, paint);

  canvas.restore();
}
