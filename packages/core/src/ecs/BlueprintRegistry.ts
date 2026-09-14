import { World, BlueprintRegistryMap, ComponentRegistry } from "./World";
import { EventRegistry } from "../events/EventBus";

/**
 * Utility type to extract arguments for a specific blueprint ID from a registry map.
 * @public
 */
export type BlueprintArgs<TBlueprints, TId extends keyof TBlueprints> =
  TBlueprints[TId] extends BlueprintDefinition<ComponentRegistry, EventRegistry, infer TArgs>
    ? TArgs
    : never;

/**
 * Interface defining an entity blueprint factory capable of populating an entity with components.
 * @public
 */
export interface BlueprintDefinition<
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry,
  TArgs
> {
  spawn(world: World<TComponents, TEvents, BlueprintRegistryMap<TComponents>>, entity: number, args: TArgs): void;
}

/**
 * Registry container storing and resolving entity creation blueprints by ID.
 * @public
 */
export class BlueprintRegistry<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private blueprints = new Map<string, BlueprintDefinition<TComponents, TEvents, unknown>>();

  register<TId extends keyof TBlueprints & string>(
    id: TId,
    blueprint: 0 extends 1 & TBlueprints
      ? BlueprintDefinition<TComponents, TEvents, unknown>
      : TBlueprints[TId]
  ): void {
    this.blueprints.set(id, blueprint as BlueprintDefinition<TComponents, TEvents, unknown>);
  }

  get<TId extends keyof TBlueprints & string>(
    id: TId
  ): TBlueprints[TId] | undefined {
    return this.blueprints.get(id) as TBlueprints[TId] | undefined;
  }

  has<TId extends keyof TBlueprints & string>(id: TId): boolean;
  has(id: string): boolean {
    return this.blueprints.has(id);
  }

  clear(): void {
    this.blueprints.clear();
  }
}
