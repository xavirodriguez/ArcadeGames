import { Component } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";

/**
 * Distance constraint configuration options for {@link JointComponent}.
 * @public
 */
export interface DistanceJointOptions {
  /** Discriminator joint type. */
  jointType: "distance";
  /** Rest length between anchors. */
  restLength: number;
  /** Maximum distance allowed (optional upper bound constraint). */
  maxDistance?: number;
  /** Minimum distance allowed (optional lower bound constraint). */
  minLength?: number;
  /** Joint stiffness (spring frequency coefficient for soft distance joints). Defaults to 0 (rigid). */
  stiffness?: number;
  /** Joint damping coefficient. Defaults to 0. */
  damping?: number;
}

/**
 * Spring constraint configuration options for {@link JointComponent}.
 * @public
 */
export interface SpringJointOptions {
  /** Discriminator joint type. */
  jointType: "spring";
  /** Rest length of spring at equilibrium. */
  restLength: number;
  /** Spring stiffness coefficient (k). */
  stiffness: number;
  /** Damping coefficient (c). */
  damping: number;
}

/**
 * Revolute / Pin constraint configuration options for {@link JointComponent}.
 * @public
 */
export interface RevoluteJointOptions {
  /** Discriminator joint type. */
  jointType: "revolute";
  /** Optional joint motor target speed in radians per second. */
  motorSpeed?: number;
  /** Maximum motor torque impulse limit. */
  maxMotorTorque?: number;
  /** Whether joint motor drive is active. */
  enableMotor?: boolean;
}

/**
 * Component specifying a physical joint or spring constraint connecting two entities.
 *
 * @example
 * ```ts
 * const joint: JointComponent = {
 *   type: "Joint",
 *   entityA: 1,
 *   entityB: 2,
 *   anchorA: { x: 0, y: 0 },
 *   anchorB: { x: 0, y: 10 },
 *   jointType: "distance",
 *   restLength: 10
 * };
 * world.addComponent(jointEntity, joint);
 * ```
 *
 * @public
 */
export type JointComponent = Component & {
  /** Component discriminator type. */
  type: "Joint";
  /** First connected entity ID. */
  entityA: Entity;
  /** Second connected entity ID. */
  entityB: Entity;
  /** Local anchor point offset on entity A. */
  anchorA: { x: number; y: number };
  /** Local anchor point offset on entity B. */
  anchorB: { x: number; y: number };
} & (
  | DistanceJointOptions
  | SpringJointOptions
  | RevoluteJointOptions
);

/**
 * Helper factory function creating a distance joint constraint.
 *
 * @param entityA - First attached entity ID.
 * @param entityB - Second attached entity ID.
 * @param anchorA - Local anchor point offset on entity A.
 * @param anchorB - Local anchor point offset on entity B.
 * @param restLength - Target rest length between anchors.
 * @param options - Additional distance joint options (maxDistance, minLength, stiffness, damping).
 * @returns Initialized JointComponent.
 * @public
 */
export function createDistanceJoint(
  entityA: Entity,
  entityB: Entity,
  anchorA: { x: number; y: number },
  anchorB: { x: number; y: number },
  restLength: number,
  options?: Omit<Partial<DistanceJointOptions>, "jointType" | "restLength">
): JointComponent {
  return {
    type: "Joint",
    jointType: "distance",
    entityA,
    entityB,
    anchorA: { ...anchorA },
    anchorB: { ...anchorB },
    restLength,
    maxDistance: options?.maxDistance,
    minLength: options?.minLength,
    stiffness: options?.stiffness ?? 0,
    damping: options?.damping ?? 0
  };
}

/**
 * Helper factory function creating a spring joint constraint.
 *
 * @param entityA - First attached entity ID.
 * @param entityB - Second attached entity ID.
 * @param anchorA - Local anchor point offset on entity A.
 * @param anchorB - Local anchor point offset on entity B.
 * @param restLength - Target spring rest length at equilibrium.
 * @param stiffness - Spring constant stiffness coefficient k.
 * @param damping - Spring damping coefficient c.
 * @returns Initialized JointComponent.
 * @public
 */
export function createSpringJoint(
  entityA: Entity,
  entityB: Entity,
  anchorA: { x: number; y: number },
  anchorB: { x: number; y: number },
  restLength: number,
  stiffness: number,
  damping: number
): JointComponent {
  return {
    type: "Joint",
    jointType: "spring",
    entityA,
    entityB,
    anchorA: { ...anchorA },
    anchorB: { ...anchorB },
    restLength,
    stiffness,
    damping
  };
}

/**
 * Helper factory function creating a revolute (pin) joint constraint.
 *
 * @param entityA - First attached entity ID.
 * @param entityB - Second attached entity ID.
 * @param anchorA - Local anchor point offset on entity A.
 * @param anchorB - Local anchor point offset on entity B.
 * @param options - Optional motor drive settings.
 * @returns Initialized JointComponent.
 * @public
 */
export function createRevoluteJoint(
  entityA: Entity,
  entityB: Entity,
  anchorA: { x: number; y: number },
  anchorB: { x: number; y: number },
  options?: Omit<Partial<RevoluteJointOptions>, "jointType">
): JointComponent {
  return {
    type: "Joint",
    jointType: "revolute",
    entityA,
    entityB,
    anchorA: { ...anchorA },
    anchorB: { ...anchorB },
    motorSpeed: options?.motorSpeed,
    maxMotorTorque: options?.maxMotorTorque,
    enableMotor: options?.enableMotor
  };
}
