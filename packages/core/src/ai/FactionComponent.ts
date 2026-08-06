import { Component } from "../ecs/Component";

/**
 * Component representing the faction affiliation of an entity.
 * Used for AI targeting, combat, and alignment.
 * @public
 */
export interface FactionComponent extends Component {
  type: "Faction";
  /**
   * The faction name or identifier (e.g., "player", "enemy", "neutral").
   */
  value: string;
}
