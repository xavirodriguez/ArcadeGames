import { Component } from "../../ecs/Component";

/**
 * Configuration options for vehicle traction, acceleration, and steering dynamics.
 * @public
 */
export interface VehicleSteeringOptions {
  /** Maximum forward acceleration force magnitude in units/s². */
  acceleration: number;
  /** Top forward speed limit in units/s. */
  maxSpeed: number;
  /** Angular steering rotation speed in radians/s. */
  steeringRate: number;
  /** Grip/traction coefficient between 0.0 (frictionless ice) and 1.0 (perfect grip). */
  traction: number;
  /** Drift factor between 0.0 (no drift) and 1.0 (full lateral slide persistence). */
  driftFactor: number;
}

/**
 * Component modeling vehicle steering, acceleration, traction, and lateral drift physics.
 *
 * @example
 * ```ts
 * const vehicle: VehicleSteeringComponent = {
 *   type: "VehicleSteering",
 *   acceleration: 300,
 *   maxSpeed: 400,
 *   steeringRate: Math.PI,
 *   traction: 0.8,
 *   driftFactor: 0.3,
 *   throttle: 1.0,
 *   steering: 0.5,
 * };
 * world.addComponent(entity, vehicle);
 * ```
 *
 * @public
 */
export interface VehicleSteeringComponent extends Component {
  /** Component discriminator type. */
  type: "VehicleSteering";
  /** Forward acceleration in units/s². */
  acceleration: number;
  /** Maximum forward/reverse speed limit. */
  maxSpeed: number;
  /** Steering rotation rate in radians/s. */
  steeringRate: number;
  /** Lateral traction grip coefficient [0..1]. */
  traction: number;
  /** Drift retention coefficient [0..1]. */
  driftFactor: number;
  /** Normalized throttle input (-1.0 reverse, 0.0 neutral, 1.0 forward). */
  throttle: number;
  /** Normalized steering input (-1.0 left, 0.0 straight, 1.0 right). */
  steering: number;
}

/**
 * Creates a new {@link VehicleSteeringComponent} with default or custom configuration.
 *
 * @param config - Vehicle steering configuration parameters.
 * @returns Initialized VehicleSteeringComponent instance.
 * @public
 */
export function createVehicleSteering(
  config: VehicleSteeringOptions
): VehicleSteeringComponent {
  return {
    type: "VehicleSteering",
    acceleration: config.acceleration,
    maxSpeed: config.maxSpeed,
    steeringRate: config.steeringRate,
    traction: config.traction,
    driftFactor: config.driftFactor,
    throttle: 0,
    steering: 0,
  };
}
