import { World, HealthComponent } from "@tiny-aster/core";
import { FactionComponent } from "@tiny-aster/gameplay-kit";

/**
 * Options for attaching standard enemy default components.
 * @public
 */
export interface EnemyDefaultsOptions {
  currentHp?: number;
  maxHp?: number;
  faction?: string;
  tableId?: string;
}

/**
 * Helper function to attach standard enemy default components (`Health`, `Faction`, `LootTable`)
 * to a given entity in the ECS world.
 *
 * @param world - Target ECS World instance.
 * @param entity - Target Entity ID.
 * @param options - Configuration options for health, faction, and loot table.
 * @public
 */
export function attachEnemyDefaults(
  world: World<any, any, any>,
  entity: number,
  options: EnemyDefaultsOptions = {}
): void {
  const currentHp = options.currentHp ?? 1;
  const maxHp = options.maxHp ?? 1;
  const factionName = options.faction ?? "enemy";
  const tableId = options.tableId ?? "default";

  world.addComponent(entity, {
    type: "Health",
    current: currentHp,
    max: maxHp
  } as HealthComponent);

  world.addComponent(entity, {
    type: "Faction",
    faction: factionName,
    value: factionName
  } as FactionComponent);

  world.addComponent(entity, {
    type: "LootTable",
    tableId
  } as any);
}
