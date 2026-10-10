/**
 * Pure input transformation and normalization utility functions for touch controls.
 * @public
 */

/**
 * Clamps a numerical value between a minimum and maximum threshold.
 * @public
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Applies a linear deadzone threshold to a 1D scalar value.
 * @public
 */
export function applyDeadzone(value: number, deadzone: number): number {
  const absVal = Math.abs(value);
  if (absVal <= deadzone) {
    return 0;
  }
  const norm = (absVal - deadzone) / (1 - deadzone);
  const clamped = clamp(norm, 0, 1);
  return Math.sign(value) * clamped;
}

/**
 * Applies a radial deadzone threshold to a 2D axis vector.
 * @public
 */
export function applyDeadzone2D(
  x: number,
  y: number,
  deadzone: number
): { x: number; y: number } {
  const dist = Math.sqrt(x * x + y * y);
  if (dist <= deadzone || dist === 0) {
    return { x: 0, y: 0 };
  }
  const norm = Math.min(1.0, (dist - deadzone) / (1 - deadzone));
  const angle = Math.atan2(y, x);
  return {
    x: norm * Math.cos(angle),
    y: norm * Math.sin(angle),
  };
}

/**
 * Normalizes a raw positional value within [min, max] to a [-1, 1] range.
 * @public
 */
export function normalizeAxis(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const t = (value - min) / (max - min);
  return clamp(t * 2 - 1, -1, 1);
}

/**
 * Snaps a 2D axis vector to 4 cardinal or 8 cardinal/diagonal directions.
 * @public
 */
export function snapDirections(
  x: number,
  y: number,
  count: 4 | 8
): { x: number; y: number } {
  const dist = Math.sqrt(x * x + y * y);
  if (dist === 0) {
    return { x: 0, y: 0 };
  }

  const step = (Math.PI * 2) / count;
  const angle = Math.atan2(y, x);
  const snappedAngle = Math.round(angle / step) * step;

  return {
    x: Math.cos(snappedAngle) * dist,
    y: Math.sin(snappedAngle) * dist,
  };
}

/**
 * Maps finger screen coordinates into clamped paddle/pointer position within specified bounds.
 * @public
 */
export function mapFingerToPaddle(
  fingerX: number,
  fingerY: number,
  bounds: { minX: number; maxX: number; minY?: number; maxY?: number }
): { x: number; y: number } {
  const x = clamp(fingerX, bounds.minX, bounds.maxX);
  const y =
    bounds.minY !== undefined && bounds.maxY !== undefined
      ? clamp(fingerY, bounds.minY, bounds.maxY)
      : fingerY;

  return { x, y };
}
