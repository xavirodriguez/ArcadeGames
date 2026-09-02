import { World, ComponentRegistry, BlueprintRegistryMap } from "./World";
import { Entity } from "./Entity";
import { ComponentType } from "./Component";
import { EventRegistry } from "../events/EventBus";
import { BlueprintRegistry } from "./BlueprintRegistry";

/**
 * Creates or reserves an entity and provides a unified helper function `add` to attach components,
 * automatically handling whether structural mutations must be deferred via `WorldCommandBuffer`
 * or applied directly to `World`.
 *
 * @param world - The ECS World instance.
 * @param deferred - Explicit flag to force deferred creation. If omitted or false, defers if `world.isUpdating` is true.
 * @param entityId - Optional pre-reserved or explicit entity ID.
 * @returns Object containing the created or reserved entity ID and an `add` component helper.
 *
 * @public
 */
export function beginEntity<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  deferred?: boolean,
  entityId?: Entity
): {
  entity: Entity;
  add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => void;
} {
  const isDeferred = !!(deferred || world.isUpdating);
  const commands = world.getCommandBuffer();

  let entity: Entity;

  if (entityId !== undefined) {
    entity = entityId;
    if (isDeferred) {
      commands.createEntity(entity);
    } else {
      world.activateEntity(entity);
    }
  } else if (isDeferred) {
    entity = world.reserveEntityId();
    commands.createEntity(entity);
  } else {
    entity = world.createEntity();
  }

  const add = <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }): void => {
    if (isDeferred) {
      commands.addComponent(entity, comp);
    } else {
      world.addComponent(entity, comp);
    }
  };

  return { entity, add };
}

/**
 * Spawns an entity from a blueprint registered in `BlueprintRegistry`, automatically delegating to
 * deferred execution via `WorldCommandBuffer` when `world.isUpdating` is true or `deferred` is set.
 *
 * @param world - The ECS World instance.
 * @param blueprintId - The registered blueprint identifier.
 * @param args - Arguments passed to the blueprint spawn function.
 * @param deferred - Explicit flag to force deferred execution.
 * @returns The entity ID (either immediately created or pre-reserved and queued).
 *
 * @public
 */
export function spawnViaBlueprint<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>,
  TId extends keyof TBlueprints & string = keyof TBlueprints & string
>(
  world: World<TComponents, TEvents, TBlueprints>,
  blueprintId: TId,
  args: any,
  deferred?: boolean
): Entity {
  const isDeferred = !!(deferred || world.isUpdating);

  if (isDeferred) {
    const entity = world.reserveEntityId();
    world.commands.createEntity(entity);
    world.commands.spawnFromBlueprintForEntity(entity, blueprintId, args);
    return entity;
  }

  const entity = world.createEntity();
  const registry = world.getResource<BlueprintRegistry<TComponents, TEvents, TBlueprints>>("BlueprintRegistry");
  const blueprint = registry?.get(blueprintId);
  if (blueprint) {
    blueprint.spawn(world, entity, args);
  }
  return entity;
}
