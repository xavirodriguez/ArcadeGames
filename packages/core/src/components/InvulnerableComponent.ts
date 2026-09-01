import { Component } from "../ecs/Component";

/**
 * Component marking an entity as invulnerable for a remaining duration.
 * @public
 */
export interface InvulnerableComponent extends Component {
  type: "Invulnerable";
  /** Remaining invulnerability duration in seconds. */
  remaining: number;
}
