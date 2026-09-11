import { World, BlueprintRegistryMap } from "./World";
import { ComponentRegistry, ComponentType } from "./Component";
import { BlueprintArgs, BlueprintRegistry } from "./BlueprintRegistry";
import { EventRegistry } from "../events/EventBus";
import { Entity } from "./Entity";

/**
 * Command unit encapsulating a deferred world modification.
 *
 * @remarks
 * Encapsulates structural mutations (spawning, component mutation, entity destruction)
 * to be executed sequentially during `WorldCommandBuffer.flush`.
 *
 * @example
 * ```ts
 * const customCmd: Command<CoreComponentRegistry, EventRegistry, BlueprintRegistryMap> = {
 *   execute: (world) => world.removeEntity(targetEntity)
 * };
 * ```
 *
 * @public
 */
export interface Command<
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents>
> {
  /**
   * Executes the deferred operation against the specified ECS world.
   *
   * @param world - Target ECS world instance.
   * @returns Void.
   *
   * @example
   * ```ts
   * cmd.execute(world);
   * ```
   */
  execute(world: World<TComponents, TEvents, TBlueprints>): void;
}

/**
 * Buffer for deferring world modifications until the end of an update cycle.
 *
 * @remarks
 * Using the command buffer is the recommended way to modify the world
 * (e.g., spawning/removing entities, adding/removing components) from within systems.
 *
 * This approach is designed to help maintain a stable world state throughout the frame's update
 * phases and helps minimize issues like iterator invalidation or inconsistent
 * query results caused by mid-frame structural changes.
 *
 * @warning
 * **Deferred execution**: Commands are not executed immediately. Changes will only
 * be reflected in the world state after `WorldCommandBuffer.flush` is
 * called (typically at the end of the `World.update` cycle).
 *
 * @public
 */
export class WorldCommandBuffer<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private commands: Command<TComponents, TEvents, TBlueprints>[] = [];
  private commandsPool: Command<TComponents, TEvents, TBlueprints>[] = [];

  private trySpawnBlueprint<TId extends keyof TBlueprints & string>(
    world: World<TComponents, TEvents, TBlueprints>,
    entity: number,
    blueprintId: TId,
    args: BlueprintArgs<TBlueprints, TId>,
    contextSuffix: string = ""
  ): void {
    const registry = world.getResource<BlueprintRegistry<TComponents, TEvents, TBlueprints>>("BlueprintRegistry");
    const blueprint = registry?.get(blueprintId);
    if (blueprint) {
      try {
        blueprint.spawn(world, entity, args);
      } catch (err) {
        console.error(`[WorldCommandBuffer] Error spawning blueprint '${blueprintId}'${contextSuffix}:`, err);
        throw err;
      }
    } else {
      console.warn(`[WorldCommandBuffer] Blueprint '${blueprintId}' not found in registry.`);
    }
  }

  /**
   * Schedules an entity to be spawned from a blueprint.
   *
   * @param blueprintId - Unique registered blueprint key identifier.
   * @param args - Arguments passed to the blueprint spawn handler.
   * @returns Void.
   *
   * @example
   * ```ts
   * commandBuffer.spawnFromBlueprint("bullet", { x: 10, y: 20 });
   * ```
   */
  public spawnFromBlueprint<TId extends keyof TBlueprints & string>(
    blueprintId: TId,
    args: BlueprintArgs<TBlueprints, TId>
  ): void {
    this.commands.push({
      execute: (world) => {
        const entity = world.createEntity();
        this.trySpawnBlueprint(world, entity, blueprintId, args);
      }
    });
  }

  /**
   * Schedules a pre-reserved entity ID to be spawned from a blueprint.
   *
   * @param entity - Pre-reserved entity ID.
   * @param blueprintId - Unique registered blueprint key identifier.
   * @param args - Arguments passed to the blueprint spawn handler.
   * @returns Void.
   *
   * @example
   * ```ts
   * commandBuffer.spawnFromBlueprintForEntity(reservedId, "bullet", { x: 10, y: 20 });
   * ```
   */
  public spawnFromBlueprintForEntity<TId extends keyof TBlueprints & string>(
    entity: number,
    blueprintId: TId,
    args: BlueprintArgs<TBlueprints, TId>
  ): void {
    this.commands.push({
      execute: (world) => {
        world.activateEntity(entity);
        this.trySpawnBlueprint(world, entity, blueprintId, args, ` for entity ${entity}`);
      }
    });
  }

  /**
   * Schedules a component to be attached to a target entity.
   *
   * @param entity - Target entity ID.
   * @param component - Component instance to attach.
   * @returns Void.
   *
   * @example
   * ```ts
   * commandBuffer.addComponent(entityId, { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 });
   * ```
   */
  public addComponent<K extends ComponentType<TComponents>>(
    entity: number,
    component: TComponents[K] & { type: K }
  ): void {
    this.commands.push({
      execute: (world) => world.addComponent(entity, component)
    });
  }

  /**
   * Schedules a component type to be removed from a target entity.
   *
   * @param entity - Target entity ID.
   * @param type - Discriminator type tag of component to remove.
   * @returns Void.
   *
   * @example
   * ```ts
   * commandBuffer.removeComponent(entityId, "Velocity");
   * ```
   */
  public removeComponent<K extends ComponentType<TComponents>>(
    entity: number,
    type: K
  ): void {
    this.commands.push({
      execute: (world) => world.removeComponent(entity, type)
    });
  }

  /**
   * Schedules an entity and all its attached components to be removed from the world.
   *
   * @param entity - Target entity ID to destroy.
   * @returns Void.
   *
   * @example
   * ```ts
   * commandBuffer.removeEntity(entityId);
   * ```
   */
  public removeEntity(entity: number): void {
    this.commands.push({
      execute: (world) => world.removeEntity(entity)
    });
  }

  /**
   * Executes all buffered commands on the provided world in order.
   *
   * @param world - Target ECS world.
   * @returns Void.
   *
   * @example
   * ```ts
   * commandBuffer.flush(world);
   * ```
   */
  public flush(world: World<TComponents, TEvents, TBlueprints>): void {
    const len = this.commands.length;
    if (len === 0) return;

    // Zero-allocation commands swap. Queued commands during execution are cleanly routed to the next flush.
    const temp = this.commands;
    this.commands = this.commandsPool;
    this.commandsPool = temp;

    for (let i = 0; i < len; i++) {
      temp[i].execute(world);
    }
    temp.length = 0;
  }

  /**
   * Schedules a specific pre-reserved entity ID to be activated in the world.
   *
   * @remarks
   * Useful when an ID has been pre-reserved via `World.reserveEntityId`.
   *
   * @param entity - Pre-reserved entity ID to activate.
   * @returns Void.
   *
   * @example
   * ```ts
   * commandBuffer.createEntity(reservedId);
   * ```
   */
  public createEntity(entity: number): void {
    this.commands.push({
      execute: (world) => {
        // Since the ID is already reserved, we just need to ensure it's marked as active.
        world.activateEntity(entity);
      }
    });
  }
}
