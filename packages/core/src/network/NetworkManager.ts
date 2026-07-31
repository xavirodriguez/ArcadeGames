import { WorldSnapshot, ComponentDataSnapshot } from "../snapshots/WorldSnapshot";
import { NetworkTransport } from "./NetworkTransport";
import { NullTransport } from "./NullTransport";
import { World, ComponentRegistry, BlueprintRegistryMap } from "../ecs/World";
import { EventRegistry } from "../events/EventBus";

/** @public */
export class Replicator<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private serverToLocal = new Map<string, number>();

  constructor() {}

  public getMappings(): Map<string, number> {
    return this.serverToLocal;
  }

  public getLocalId(serverId: string): number | undefined {
    return this.serverToLocal.get(serverId);
  }

  public removeMapping(serverId: string): void {
    this.serverToLocal.delete(serverId);
  }

  public resolveEntity(
    serverId: string,
    world?: World<TComponents, TEvents, TBlueprints>,
    serverComponents: Record<string, any> = {}
  ): number {
    let localId = this.serverToLocal.get(serverId);
    if (localId === undefined) {
      const newEntityId = (world && typeof world.createEntity === "function") ? world.createEntity() : 0;
      this.serverToLocal.set(serverId, newEntityId);
      localId = newEntityId;
    }

    const actualLocalId = localId as number;

    if (world) {
      for (const [type, comp] of Object.entries(serverComponents)) {
        if (comp) {
          const componentToSet = { ...comp, type };
          if (world.hasComponent(actualLocalId, type as any)) {
            world.mutateComponent(actualLocalId, type as any, (existing: any) => {
              Object.assign(existing, componentToSet);
            });
          } else {
            world.addComponent(actualLocalId, componentToSet as any);
          }
        }
      }
    }

    return actualLocalId;
  }
}

/**
 * Coordinator for network synchronization, prediction, and state reconciliation.
 * @public
 */
export class NetworkManager<
  TServerEvents extends Record<string, any> = Record<string, any>,
  TClientEvents extends Record<string, any> = Record<string, any>,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private transport: NetworkTransport<TServerEvents, TClientEvents>;
  private replicator = new Replicator<TComponents, any, TBlueprints>();
  public world?: World<TComponents, any, TBlueprints>;

  constructor(transport?: NetworkTransport<TServerEvents, TClientEvents>) {
    this.transport = transport || new NullTransport<TServerEvents, TClientEvents>();
  }

  public static registerGame<
    TServer extends Record<string, any> = Record<string, any>,
    TClient extends Record<string, any> = Record<string, any>,
    TComponents extends ComponentRegistry = ComponentRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(_gameId: string, _game: unknown, options: any = {}): NetworkManager<TServer, TClient, TComponents, TBlueprints> {
    const manager = new NetworkManager<TServer, TClient, TComponents, TBlueprints>(options.transport || new NullTransport<TServer, TClient>());
    if (options.world) {
      manager.world = options.world as World<TComponents, TEvents, TBlueprints>;
    }
    return manager;
  }

  public getTransport(): NetworkTransport<TServerEvents, TClientEvents> {
    return this.transport;
  }

  public setTransport(transport: NetworkTransport<TServerEvents, TClientEvents>): void {
    this.transport = transport;
  }

  public getReplicator(): Replicator<TComponents, any, TBlueprints> {
    return this.replicator;
  }

  public getStrategy(): unknown {
    return {
      recordPrediction: (_input: unknown, _world: unknown) => {}
    };
  }

  public processServerUpdate(_tick: number, snapshot: WorldSnapshot, _sessionId?: string): void {
    if (this.transport.isOffline) {
      return;
    }

    if (!snapshot || !snapshot.entities) return;

    const componentData = reconstructComponentData(snapshot);

    for (const serverIdNum of snapshot.entities) {
      const serverId = String(serverIdNum);
      const serverComponents: Record<string, any> = {};

      for (const [type, entityMap] of Object.entries(componentData)) {
        if (entityMap && entityMap[serverIdNum] !== undefined) {
          serverComponents[type] = entityMap[serverIdNum];
        }
      }

      if (this.world) {
        this.replicator.resolveEntity(serverId, this.world, serverComponents);
      }
    }
  }

  public reset(): void {
    this.replicator = new Replicator<TComponents, any, TBlueprints>();
  }
}

/** @public */
export interface INetworkGame {
  readonly gameId: string;
}

/** @public */
export class NetworkReplicationUtils {
  public static applyDelta(base: WorldSnapshot, delta: Partial<WorldSnapshot>): void {
    const b = base as any;
    const d = delta as any;
    if (d.tick !== undefined) b.tick = d.tick;
    if (d.stateVersion !== undefined) b.stateVersion = d.stateVersion;
    if (d.structureVersion !== undefined) b.structureVersion = d.structureVersion;
    if (d.seed !== undefined) b.seed = d.seed;
    if (d.rngState !== undefined) b.rngState = d.rngState;
    if (d.nextEntityId !== undefined) b.nextEntityId = d.nextEntityId;
    if (d.entities !== undefined) {
      b.entities = [...d.entities];
    }
    if (d.freeEntities !== undefined) {
      b.freeEntities = [...d.freeEntities];
    }

    if (d.componentData) {
      if (!b.componentData) {
        b.componentData = {};
      }
      for (const [type, entityMap] of Object.entries(d.componentData)) {
        if (!b.componentData[type]) {
          b.componentData[type] = {};
        }
        for (const [entityId, comp] of Object.entries(entityMap as Record<string, any>)) {
          const entityIdNum = Number(entityId);
          if (comp === null || comp === undefined) {
            delete b.componentData[type][entityIdNum];
          } else {
            b.componentData[type][entityIdNum] = {
              ...b.componentData[type][entityIdNum],
              ...comp
            };
          }
        }
      }
    }

    if (d.isSoA !== undefined) b.isSoA = d.isSoA;
    if (d.soaComponentData) {
      if (!b.soaComponentData) {
        b.soaComponentData = {};
      }
      for (const [type, soaData] of Object.entries(d.soaComponentData)) {
        b.soaComponentData[type] = {
          ...b.soaComponentData[type],
          ...soaData as any
        };
      }
    }
  }
}

function reconstructComponentData(snapshot: WorldSnapshot): ComponentDataSnapshot {
  if (snapshot.isSoA === true && snapshot.soaComponentData) {
    const componentData: ComponentDataSnapshot = {};
    const soaComponentData = snapshot.soaComponentData;

    for (const type in soaComponentData) {
      componentData[type] = {};
      const soaData = soaComponentData[type];
      const keys = soaData.keys;
      const numKeys = keys.length;
      const entities = soaData.entities;

      let numEntities = 0;
      if (entities) {
        if (typeof (entities as any).length === "number") {
          numEntities = (entities as any).length;
        } else {
          numEntities = Object.keys(entities).filter(k => !isNaN(Number(k))).length;
        }
      }

      const valArray = soaData.values;
      const nonNumericValues = soaData.nonNumericValues;
      const booleanKeys = soaData.booleanKeys ? new Set(soaData.booleanKeys) : null;

      for (let i = 0; i < numEntities; i++) {
        const entityId = (entities as any)[i];
        const component: Record<string, any> = { type };

        for (let j = 0; j < numKeys; j++) {
          const key = keys[j];
          const offset = i * numKeys + j;
          const nonNumericVal = nonNumericValues ? nonNumericValues[offset] : undefined;

          if (nonNumericVal !== undefined && nonNumericVal !== null) {
            component[key] = nonNumericVal;
          } else {
            const rawVal = valArray[offset];
            if (booleanKeys && booleanKeys.has(key)) {
              component[key] = rawVal === 1;
            } else {
              component[key] = rawVal;
            }
          }
        }
        componentData[type][entityId] = component;
      }
    }
    return componentData;
  }

  return snapshot.componentData || {};
}
