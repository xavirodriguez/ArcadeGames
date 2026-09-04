import { ComponentRegistry, ComponentType } from "./Component";
import { World, BlueprintRegistryMap } from "./World";
import { BlueprintArgs, BlueprintRegistry } from "./BlueprintRegistry";
import { Entity } from "./Entity";
import { EventRegistry } from "../events/EventBus";

/**
 * Creates an entity and provides a component addition function that automatically
 * redirects to the CommandBuffer if the World is currently in its update phase.
 *
 * @typeParam TComponents - Component registry map type.
 * @typeParam TEvents - Event registry map type.
 * @typeParam TBlueprints - Blueprint registry map type.
 *
 * @param world - Target ECS World instance.
 * @param deferred - Force deferred creation using the command buffer even when not in updating phase.
 * @returns Object containing reserved entity ID and typed component addition helper.
 *
 * @public
 */
export function createDeferredEntity<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  deferred?: boolean
): {
  entity: Entity;
  add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => void;
} {
  const isDeferred = !!(deferred || world.isUpdating);
  const commands = world.getCommandBuffer();

  if (isDeferred) {
    const entity = world.reserveEntityId();
    commands.createEntity(entity);
    return {
      entity,
      add: (comp) => commands.addComponent(entity, comp)
    };
  }

  const entity = world.createEntity();
  return {
    entity,
    add: (comp) => world.addComponent(entity, comp)
  };
}

/**
 * Instantiates an entity from a registered Blueprint.
 *
 * @remarks
 * If the World is currently updating (`world.isUpdating === true`), delegates entity creation
 * and blueprint spawning to `WorldCommandBuffer.spawnFromBlueprintForEntity` to safely execute during flush.
 *
 * @typeParam TComponents - Component registry map type.
 * @typeParam TEvents - Event registry map type.
 * @typeParam TBlueprints - Blueprint registry map type.
 * @typeParam TId - Specific blueprint identifier string key.
 *
 * @param world - Target ECS World instance.
 * @param blueprintId - Identifier key of registered blueprint.
 * @param args - Arguments expected by blueprint spawn method.
 * @returns Reserved or created entity ID.
 *
 * @public
 */
export function spawnBlueprintEntity<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>,
  TId extends Extract<keyof TBlueprints, string> = Extract<keyof TBlueprints, string>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  blueprintId: TId,
  args: BlueprintArgs<TBlueprints, TId>
): Entity {
  if (world.isUpdating) {
    const entity = world.reserveEntityId();
    world.commands.createEntity(entity);
    world.commands.spawnFromBlueprintForEntity(entity, blueprintId, args);
    return entity;
  }

  const entity = world.createEntity();
  const registry = world.getResource<BlueprintRegistry<TComponents, TEvents, TBlueprints>>("BlueprintRegistry");
  registry?.get(blueprintId)?.spawn(world, entity, args);
  return entity;
}
