import { Component } from "@tiny-aster/core";

/**
 * Policy for how a DamageComponent is consumed after successfully dealing damage.
 * @public
 */
export type DamageConsumptionPolicy = "destroy-entity" | "remove-component" | "none";

/**
 * Represents damage that an entity can deal on contact/collision.
 * @public
 */
export interface DamageComponent extends Component {
  type: "Damage";
  /** Amount of health points to deduct. */
  amount: number;
  /** Optional reference to the entity that dealt the damage. */
  sourceEntity?: number;
  /** Category or type of damage (e.g. "bullet", "kamikaze", "collision"). */
  category?: string;
  /** If explicitly true, allows damaging entities of the same faction. */
  friendlyFire?: boolean;
  /** Consumption policy after damage is successfully dealt. Defaults to "none". */
  consumption?: DamageConsumptionPolicy;
}

/**
 * Identifies the faction/group of an entity to prevent or manage friendly fire.
 * @public
 */
export interface FactionComponent extends Component {
  type: "Faction";
  /** Faction ID or name (e.g., "player", "enemy", "neutral"). */
  faction: string;
}
