import { Component } from "@tiny-aster/core";

/**
 * Component specifying a loot table identifier for an entity to spawn drops upon destruction.
 * @public
 */
export interface LootTableComponent extends Component {
  /** Discriminator type tag identifying this component. */
  type: "LootTable";
  /** Identifier matching a loot drop table definition. */
  tableId: string;
}

/**
 * Component specifying a power-up effect classification for collectible entities.
 * @public
 */
export interface PowerUpComponent extends Component {
  /** Discriminator type tag identifying this component. */
  type: "PowerUp";
  /** Identifier matching a registered power-up effect handler. */
  powerUpType: string;
}
