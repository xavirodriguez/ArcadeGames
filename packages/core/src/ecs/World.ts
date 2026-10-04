import { ComponentRegistry, ComponentType, DeepReadonly } from "./Component";
import type { CoreComponentRegistry } from "./CoreComponents";
import { Entity, packEntity, unpackEntityIndex, unpackEntityGeneration } from "./Entity";
import { EventRegistry, EventBus } from "../events/EventBus";
import { Query } from "./Query";
import { System, SystemConfig } from "./System";
import { Schedule } from "./Schedule";
import { RandomService } from "../utils/RandomService";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { SnapshotSerializer } from "../snapshots/SnapshotSerializer";
import { SnapshotRestore } from "../snapshots/SnapshotRestore";
import { SnapshotSerializerSoA } from "../snapshots/SnapshotSerializerSoA";
import { SnapshotRestoreSoA } from "../snapshots/SnapshotRestoreSoA";
import { WorldCommandBuffer } from "./WorldCommandBuffer";
import { BlueprintDefinition, BlueprintRegistry } from "./BlueprintRegistry";
import { ComponentCloner } from "./ComponentCloner";
import type { InternalWorldAccess } from "../snapshots/SnapshotInternalAccess";

// NOTE: Full file restored via local patch - see PR body if truncated
export type BlueprintRegistryMap<
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> = Record<string, BlueprintDefinition<TComponents, TEvents, unknown>>;

export class World<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private resources = new Map<string, unknown>();
  private commandBuffer = new WorldCommandBuffer<TComponents, TEvents, TBlueprints>();

  public get blueprints(): BlueprintRegistry<TComponents, TEvents, TBlueprints> {
    const registry = this.getResource<BlueprintRegistry<TComponents, TEvents, TBlueprints>>("BlueprintRegistry");
    if (!registry) {
      throw new Error(
        "[World] BlueprintRegistry resource is missing. It is registered by BaseGame.registerInternalResources()."
      );
    }
    return registry;
  }

  public getCommandBuffer(): WorldCommandBuffer<TComponents, TEvents, TBlueprints> {
    return this.commandBuffer;
  }

  public getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T | undefined;
  }

  public setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }
}
