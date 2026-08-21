/**
 * Collection of generic physics and collision utility functions.
 * @public
 */
export class PhysicsUtils {
  /**
   * Checks if two circles overlap in 2D space.
   *
   * @param x1 - Center X of first circle.
   * @param y1 - Center Y of first circle.
   * @param r1 - Radius of first circle.
   * @param x2 - Center X of second circle.
   * @param y2 - Center Y of second circle.
   * @param r2 - Radius of second circle.
   * @returns `true` if distance between centers is less than or equal to the sum of radii.
   */
  public static circleOverlap(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = r1 + r2;
    return distanceSq <= radiusSum * radiusSum;
  }

  /**
   * Clamps a numerical value within specified lower and upper bounds.
   *
   * @param value - Value to clamp.
   * @param min - Lower bound.
   * @param max - Upper bound.
   * @returns Clamped scalar value.
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Linearly interpolates between two scalar values.
   *
   * @param a - Start value.
   * @param b - Target value.
   * @param t - Interpolation factor between 0 and 1.
   * @returns Interpolated scalar value.
   */
  public static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
