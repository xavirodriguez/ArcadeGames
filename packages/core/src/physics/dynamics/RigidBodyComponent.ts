import { Component } from "../../ecs/Component";

/**
 * Component specifying mass, moment of inertia, surface friction, and restitution material properties for rigid body dynamics.
 *
 * @example
 * ```ts
 * const body: RigidBodyComponent = {
 *   type: "RigidBody",
 *   mass: 10,
 *   invMass: 0.1,
 *   inertia: 100,
 *   invInertia: 0.01,
 *   restitution: 0.5,
 *   friction: 0.3,
 *   isStatic: false
 * };
 * world.addComponent(entity, body);
 * ```
 *
 * @public
 */
export interface RigidBodyComponent extends Component {
  /** Component discriminator type. */
  type: "RigidBody";
  /** Mass in kilograms or arbitrary units. */
  mass: number;
  /** Inverse mass (1 / mass), or 0 if static or immovable. */
  invMass: number;
  /** Moment of inertia. */
  inertia: number;
  /** Inverse moment of inertia (1 / inertia), or 0 if static or rotation-fixed. */
  invInertia: number;
  /** Restitution coefficient between 0.0 (inelastic) and 1.0 (perfectly elastic). */
  restitution: number;
  /** Friction coefficient between 0.0 (frictionless) and 1.0 (high friction). */
  friction: number;
  /** Whether the body is immovable (static/kinematic). */
  isStatic: boolean;
}

/**
 * Factory options for creating a {@link RigidBodyComponent}.
 * @public
 */
export interface RigidBodyOptions {
  /** Mass in arbitrary physics units. Defaults to 1.0. */
  mass?: number;
  /** Moment of inertia. Defaults to mass * 0.5. */
  inertia?: number;
  /** Restitution coefficient (0.0 to 1.0). Defaults to 0.0. */
  restitution?: number;
  /** Friction coefficient (0.0 to 1.0). Defaults to 0.2. */
  friction?: number;
  /** Whether the body is static/immovable. Defaults to false. */
  isStatic?: boolean;
}

/**
 * Factory helper for instantiating a new {@link RigidBodyComponent}.
 *
 * @param options - Configuration options.
 * @returns Initialized RigidBodyComponent with precomputed inverse mass and inertia.
 * @public
 */
export function createRigidBody(options: RigidBodyOptions = {}): RigidBodyComponent {
  const isStatic = options.isStatic ?? false;
  const mass = isStatic ? 0 : (options.mass ?? 1.0);
  const invMass = isStatic || mass <= 0 ? 0 : 1 / mass;
  const inertia = isStatic ? 0 : (options.inertia ?? (mass > 0 ? mass * 0.5 : 0));
  const invInertia = isStatic || inertia <= 0 ? 0 : 1 / inertia;

  return {
    type: "RigidBody",
    mass,
    invMass,
    inertia,
    invInertia,
    restitution: options.restitution ?? 0,
    friction: options.friction ?? 0.2,
    isStatic
  };
}
