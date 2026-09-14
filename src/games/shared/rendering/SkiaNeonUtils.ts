import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "./ProceduralShapeUtils";
import { Skia } from "./SkiaContext";

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
