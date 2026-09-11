import { Component } from "../ecs/Component";

/**
 * Component marking an entity as invulnerable for a remaining duration.
 *
 * @remarks
 * Decremented by damage or combat systems during simulation updates. While `remaining` is greater than 0,
 * incoming collision or damage events are ignored or reflected.
 *
 * @example
 * ```ts
 * const invulnerable: InvulnerableComponent = {
 *   type: "Invulnerable",
 *   remaining: 2.0
 * };
 * world.addComponent(entity, invulnerable);
 * ```
 *
 * @public
 */
export interface InvulnerableComponent extends Component {
  /** Discriminator type tag identifying this component as Invulnerable. */
  type: "Invulnerable";
  /** Remaining invulnerability duration in seconds. */
  remaining: number;
}
