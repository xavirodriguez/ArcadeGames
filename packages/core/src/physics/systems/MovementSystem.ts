import { PhysicsIntegrateSystem } from '../dynamics/PhysicsIntegrateSystem';

/**
 * System that integrates forces and velocities.
 *
 * @remarks
 * `MovementSystem` has been replaced by `PhysicsIntegrateSystem` to unify Euler integration, drag forces, and damping parameters across all physics simulations.
 *
 * @deprecated Superceded by `PhysicsIntegrateSystem` for unified physics integration. Use {@link PhysicsIntegrateSystem} instead.
 *
 * @example
 * ```ts
 * // Before (deprecated)
 * const system = new MovementSystem();
 * world.addSystem(system);
 *
 * // After
 * const system = new PhysicsIntegrateSystem();
 * world.addSystem(system);
 * ```
 *
 * @public
 */
export class MovementSystem extends PhysicsIntegrateSystem {}
