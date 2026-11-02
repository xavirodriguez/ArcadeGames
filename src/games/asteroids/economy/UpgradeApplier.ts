import { World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { ROGUELITE_UPGRADES } from "./UpgradeCatalog";
import { PlayerInventoryComponent, MagneticCollectorComponent } from "../types/EconomyTypes";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";

/**
 * Purchases and applies a roguelite upgrade to the player ship during the active run.
 *
 * Requirements:
 * - Checks mineral and component costs.
 * - Deducts currency from PlayerInventory.
 * - Records upgrade in activeUpgrades.
 * - Modifies ship components (e.g. MagneticCollector) and active GameConfig parameters.
 * - Resets on run lifecycle (new run starts clean).
 *
 * @public
 */
export function purchaseRogueliteUpgrade(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  playerEntity: number,
  upgradeId: string
): boolean {
  const upgrade = ROGUELITE_UPGRADES[upgradeId];
  if (!upgrade) return false;

  const inventory = world.getMutableComponent(playerEntity, "PlayerInventory") as PlayerInventoryComponent | undefined;
  if (!inventory) return false;

  if (inventory.activeUpgrades.includes(upgradeId)) {
    return false; // Already acquired
  }

  const costMinerals = upgrade.cost.minerals ?? 0;
  const costComponents = upgrade.cost.components ?? 0;

  if (inventory.minerals < costMinerals || inventory.components < costComponents) {
    return false; // Insufficient resources
  }

  // Deduct resources
  inventory.minerals -= costMinerals;
  inventory.components -= costComponents;
  inventory.activeUpgrades.push(upgradeId);

  // Apply modifiers to GameConfig & ship
  const config = world.getResource<AsteroidConfig>("GameConfig");
  if (config) {
    if (upgrade.modifiers.thrustMultiplier !== undefined) {
      config.SHIP_THRUST *= upgrade.modifiers.thrustMultiplier;
    }
    if (upgrade.modifiers.rotationMultiplier !== undefined) {
      config.SHIP_ROTATION_SPEED *= upgrade.modifiers.rotationMultiplier;
    }
    if (upgrade.modifiers.frictionMultiplier !== undefined) {
      config.SHIP_FRICTION *= upgrade.modifiers.frictionMultiplier;
    }
    if (upgrade.modifiers.bulletSpeedMultiplier !== undefined) {
      config.BULLET_SPEED *= upgrade.modifiers.bulletSpeedMultiplier;
    }
    if (upgrade.modifiers.shootCooldownMultiplier !== undefined) {
      config.SHIP_SHOOT_COOLDOWN *= upgrade.modifiers.shootCooldownMultiplier;
    }
  }

  if (upgrade.modifiers.maxEnergyBonus !== undefined) {
    inventory.maxEnergy += upgrade.modifiers.maxEnergyBonus;
    inventory.energy = Math.min(inventory.maxEnergy, inventory.energy + upgrade.modifiers.maxEnergyBonus);
  }

  const collector = world.getMutableComponent(playerEntity, "MagneticCollector") as MagneticCollectorComponent | undefined;
  if (collector) {
    if (upgrade.modifiers.magneticRadiusMultiplier !== undefined) {
      collector.baseRadius *= upgrade.modifiers.magneticRadiusMultiplier;
    }
    if (upgrade.modifiers.magneticForceMultiplier !== undefined) {
      collector.pullForce *= upgrade.modifiers.magneticForceMultiplier;
    }
  }

  const eventBus = world.getEventBus();
  if (eventBus) {
    eventBus.emitDeferred("upgrade:purchased", { upgradeId });
  }

  return true;
}
