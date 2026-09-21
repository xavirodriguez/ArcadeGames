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

  /**
   * Decrements a remaining duration timer by deltaTime down to a lower bound of 0.
   *
   * @param remaining - Current remaining duration timer in seconds.
   * @param deltaTime - Elapsed frame time step in seconds.
   * @returns Decremented remaining time clamped to 0.
   */
  public static tickTimer(remaining: number, deltaTime: number): number {
    return remaining > 0 ? Math.max(0, remaining - deltaTime) : 0;
  }

  /**
   * Applies a linear and angular force or impulse to a rigid body's velocity component.
   *
   * @remarks
   * Zero heap allocation helper that safely checks body status and mutates `Velocity`.
   *
   * @param world - Simulation world containing the entity.
   * @param entity - Target entity ID.
   * @param hasVelocity - Truthy if entity has a Velocity component.
   * @param isStatic - True if body is static or has zero inverse mass.
   * @param invMass - Inverse mass of the body (0 if static).
   * @param invInertia - Inverse rotational inertia of the body (0 if static/infinite).
   * @param rx - X offset of force/impulse application point relative to center of mass.
   * @param ry - Y offset of force/impulse application point relative to center of mass.
   * @param fx - Force or impulse X component.
   * @param fy - Force or impulse Y component.
   * @param scale - Scaling factor (e.g. `+deltaTime` / `-deltaTime` for forces, or `+1.0` / `-1.0` for impulses).
   */
  public static applyBodyImpulse(
    world: import("../../ecs/World").World<import("../../ecs/CoreComponents").CoreComponentRegistry>,
    entity: import("../../ecs/Entity").Entity,
    hasVelocity: unknown,
    isStatic: boolean,
    invMass: number,
    invInertia: number,
    rx: number,
    ry: number,
    fx: number,
    fy: number,
    scale: number
  ): void {
    if (hasVelocity && !isStatic) {
      const v = world.getMutableComponent(entity, "Velocity");
      if (v) {
        v.vx += fx * invMass * scale;
        v.vy += fy * invMass * scale;
        if (invInertia > 0) {
          v.angularVelocity += (rx * fy - ry * fx) * invInertia * scale;
        }
      }
    }
  }
}
