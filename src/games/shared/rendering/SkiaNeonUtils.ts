import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "./ProceduralShapeUtils";
import { Skia } from "./SkiaContext";
import type { SkCanvas, SkPaint } from "./SkiaContext";
import { MotionTrailBase, computeMotionTrailSegment, TrailPoint } from "./MotionTrailBuffer";

export { TrailPoint };

function initSkiaPaint(style: unknown, colorStr: string, alpha = 1.0, existingPaint?: SkPaint | null): SkPaint | undefined {
  if (!Skia) return undefined;
  const paint = existingPaint || Skia.Paint();
  paint.reset();
  paint.setAntiAlias(true);
  if (style !== undefined) {
    paint.setStyle(style);
  }
  paint.setColor(Skia.Color(colorStr));
  if (alpha < 1.0) {
    paint.setAlphaf(alpha);
  }
  return paint;
}

/**
 * Creates and initializes a Skia Paint configured for Fill operations.
 *
 * @param colorStr - Color string or hex token.
 * @param alpha - Optional opacity scaling factor between 0.0 and 1.0. Defaults to 1.0.
 * @param existingPaint - Optional pre-allocated Skia Paint instance to reset and reuse.
 * @returns Configured Skia Paint object.
 * @public
 */
export function makeFillPaint(colorStr: string, alpha = 1.0, existingPaint?: SkPaint | null): SkPaint | undefined {
  return initSkiaPaint(Skia?.PaintStyle.Fill, colorStr, alpha, existingPaint);
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
export function makeStrokePaint(colorStr: string, strokeWidth = 1.0, alpha = 1.0, existingPaint?: SkPaint | null): SkPaint | undefined {
  const paint = initSkiaPaint(Skia?.PaintStyle.Stroke, colorStr, alpha, existingPaint);
  if (paint) {
    paint.setStrokeWidth(strokeWidth);
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
  canvas: SkCanvas,
  paint: SkPaint,
  tick: number,
  color: string,
  glowAlphaColor: string,
  drawOutline: (canvas: SkCanvas, paint: SkPaint, widthScale: number, heightScale: number) => void,
  drawCore: (canvas: SkCanvas, paint: SkPaint) => void
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
export class SkiaMotionTrail extends MotionTrailBase {
  public drawSkia(
    canvas: SkCanvas,
    paint: SkPaint,
    entityId: number,
    currentX: number,
    currentY: number,
    length: number,
    size: number,
    outerColorStr: string,
    innerColorStr: string
  ): void {
    if (!Skia) return;
        // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/CanvasNeonUtils.ts:51-58. Considerar extraer a función compartida. Ref: 93a5763f
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
  canvas: SkCanvas,
  paint: SkPaint,
  size: number,
  color: string,
  coreScale = 0.4,
  strokeWidth = 2.0
): void {
  if (!Skia) return;
  canvas.save();

  makeStrokePaint(color, strokeWidth, 1.0, paint);
  canvas.drawCircle(0, 0, size, paint);

  makeFillPaint(colors.white, 1.0, paint);
  canvas.drawCircle(0, 0, size * coreScale, paint);

  canvas.restore();
}

/**
 * Renders background rectangle and scrolling grid lines for Skia canvas.
 * @public
 */
export function drawSkiaBackgroundGrid(
  canvas: SkCanvas,
  paint: SkPaint,
  width: number,
  height: number,
  tick: number,
  gridSize = 40,
  scrollSpeed = 0.3,
  gridColorStr = "rgba(0, 240, 255, 0.04)",
  bgColorStr: string = colors.background
): void {
  if (!Skia) return;

  // 1. Solid background
  paint.reset();
  paint.setColor(Skia.Color(bgColorStr));
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

  // 2. Scrolling cyber-neon grid lines
  const scrollOffset = (tick * scrollSpeed) % gridSize;

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setColor(Skia.Color(gridColorStr));
  paint.setStrokeWidth(1.0);

  for (let x = 0; x < width; x += gridSize) {
    canvas.drawLine(x, 0, x, height, paint);
  }

  for (let y = scrollOffset; y < height; y += gridSize) {
    canvas.drawLine(0, y, width, y, paint);
  }
}
