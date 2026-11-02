import { Component } from "@tiny-aster/core";

/**
 * Fundamental resource categories in the Asteroids roguelite economy.
 * - Energy: Tactical resource for defensive abilities, shield recharge, and overcharge.
 * - Minerals: Run progression currency for general ship upgrades between waves.
 * - Components: Specialized currency for modules, weapons, and special capabilities.
 * @public
 */
export type ResourceType = "energy" | "minerals" | "components";

/**
 * Attached to physical in-world collectible resource entities.
 * @public
 */
export interface CollectibleResourceComponent extends Component {
  type: "CollectibleResource";
  resourceType: ResourceType;
  amount: number;
  lifetimeTicks: number;
  maxLifetimeTicks: number;
  collectionRadius: number;
  isCollected: boolean;
}

/**
 * State of ship magnetic resource attraction field.
 * @public
 */
export type MagneticCollectorMode = "off" | "active" | "overcharged";

/**
 * Attached to entities capable of attracting resources (e.g. player ship, salvager drone).
 * @public
 */
export interface MagneticCollectorComponent extends Component {
  type: "MagneticCollector";
  mode: MagneticCollectorMode;
  baseRadius: number;
  overchargeRadiusMultiplier: number;
  pullForce: number;
  energyDrainPerSecond: number;
}

/**
 * Player run-bound inventory and upgrade state.
 * Resets entirely upon run completion or game over.
 * @public
 */
export interface PlayerInventoryComponent extends Component {
  type: "PlayerInventory";
  energy: number;
  maxEnergy: number;
  minerals: number;
  components: number;
  activeUpgrades: string[];
}

/**
 * Upgrade definition contract with tactical behavioral trade-offs.
 * @public
 */
export interface RogueliteUpgradeDefinition {
  id: string;
  name: string;
  family: "propulsion" | "defense" | "combat_salvage";
  cost: {
    minerals?: number;
    components?: number;
  };
  description: string;
  /**
   * Numeric or behavioral modifiers applied to GameConfig or ship stats during the run.
   */
  modifiers: {
    thrustMultiplier?: number;
    rotationMultiplier?: number;
    frictionMultiplier?: number;
    maxEnergyBonus?: number;
    shieldCapacityBonus?: number;
    bulletSpeedMultiplier?: number;
    shootCooldownMultiplier?: number;
    magneticRadiusMultiplier?: number;
    magneticForceMultiplier?: number;
    penetratingProjectiles?: boolean;
    energyDrainMultiplier?: number;
  };
}
