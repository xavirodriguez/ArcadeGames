import { Component } from "../ecs/Component";
import { Entity } from "../ecs/Entity";

/**
 * Component representing steering behaviors (Seek or Flee).
 * Uses target faction or direct target entity.
 * @public
 */
export interface SteeringComponent extends Component {
  type: "Steering";
  /**
   * Steering mode: "seek" (move towards target) or "flee" (move away from target).
   */
  mode: "seek" | "flee";
  /**
   * The faction to target. The system will look for the closest entity with this Faction value.
   */
  targetFaction?: string;
  /**
   * Explicit target entity, if already resolved or locked externally.
   */
  targetEntity?: Entity;
  /**
   * Maximum movement speed.
   */
  maxSpeed: number;
  /**
   * Maximum force / acceleration magnitude.
   */
  maxAcceleration: number;
  /**
   * Optional radius within which the entity slows down to arrive smoothly at the target (Seek only).
   */
  arrivalRadius?: number;
}
