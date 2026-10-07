/**
 * Pure mathematical utilities for touch input calculations.
 * Platform-agnostic (no React Native or DOM dependencies).
 * @public
 */

/**
 * Restricts a numeric value to a specified [min, max] range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Applies deadzone processing to a scalar value in [-1, 1].
 */
export function applyDeadzone(value: number, deadzone: number): number {
  const absVal = Math.abs(value);
  if (absVal <= deadzone) return 0;
  const sign = value < 0 ? -1 : 1;
  const remapped = (absVal - deadzone) / (1 - deadzone);
  return sign * clamp(remapped, 0, 1);
}

/**
 * Normalizes a 2D vector (x, y) to unit length if magnitude exceeds 1.
 */
export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  if (len <= 1) return { x, y };
  return { x: x / len, y: y / len };
}

/**
 * Snaps continuous (x, y) input vector to 4 cardinal directions (Up, Down, Left, Right) or neutral.
 */
export function snapTo4Way(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len < 0.2) return { x: 0, y: 0 };

  const angle = Math.atan2(y, x);
  // Angles: Right (0), Down (pi/2), Left (pi or -pi), Up (-pi/2)
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return { x: 1, y: 0 };
  } else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return { x: 0, y: 1 };
  } else if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) {
    return { x: 0, y: -1 };
  } else {
    return { x: -1, y: 0 };
  }
}

/**
 * Snaps continuous (x, y) input vector to 8 directional sectors or neutral.
 */
export function snapTo8Way(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len < 0.2) return { x: 0, y: 0 };

  const step = Math.PI / 4; // 45 degrees
  const angle = Math.atan2(y, x);
  const normalizedAngle = angle < -step / 2 ? angle + 2 * Math.PI : angle;

  const sector = Math.floor((normalizedAngle + step / 2) / step) % 8;

  switch (sector) {
    case 0: return { x: 1, y: 0 };       // Right
    case 1: return { x: 1, y: 1 };       // Down-Right
    case 2: return { x: 0, y: 1 };       // Down
    case 3: return { x: -1, y: 1 };      // Down-Left
    case 4: return { x: -1, y: 0 };      // Left
    case 5: return { x: -1, y: -1 };     // Up-Left
    case 6: return { x: 0, y: -1 };      // Up
    case 7: return { x: 1, y: -1 };      // Up-Right
    default: return { x: 0, y: 0 };
  }
}

/**
 * Maps screen/touch pointer X coordinate to paddle center position, constrained within playfield bounds.
 */
export function mapPointerToPaddle(
  pointerX: number,
  minX: number,
  maxX: number,
  paddleWidth: number
): number {
  const halfWidth = paddleWidth / 2;
  const minTarget = minX + halfWidth;
  const maxTarget = maxX - halfWidth;
  return clamp(pointerX, minTarget, maxTarget);
}
