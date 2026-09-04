import { WorldSnapshot, AoSWorldSnapshot, SoAWorldSnapshot, ComponentDataSnapshot, SnapshotDelta, SerializedComponent, SoAComponentTypeData } from "../snapshots/WorldSnapshot";
import { SoADeserializer } from "../snapshots/SoADeserializer";
import { NetworkTransport } from "./NetworkTransport";
import { NullTransport } from "./NullTransport";
import { ComponentRegistry } from "../ecs/Component";

/**
 * Interface with exact ECS signatures for world mutations.
 * @public
 */
export interface WorldLike<TComponents extends ComponentRegistry = ComponentRegistry> {
  createEntity(): number;
  hasComponent(entity: number, type: string): boolean;
  mutateComponent<K extends Extract<keyof TComponents, string>>(entity: number, type: K, updater: (existing: TComponents[K]) => void): boolean;
  addComponent<K extends Extract<keyof TComponents, string>>(entity: number, component: TComponents[K]): void;
}

/**
 * Minimum subset of World methods needed by the replicator.
 * @public
 */
export type INetworkableWorld<TComponents extends ComponentRegistry = ComponentRegistry> = WorldLike<TComponents>;

/**
 * Interface representing a state replicator.
 * @public
 */
export interface IStateReplicator<TComponents extends ComponentRegistry = ComponentRegistry> {
  getMappings(): Map<string, number>;
  getLocalId(serverId: string): number | undefined;
  removeMapping(serverId: string): void;
  resolveEntity(serverId: string, world: WorldLike<TComponents>, serverComponents?: Record<string, Record<string, unknown>>): number;
  replicate(world: WorldLike<TComponents>, snapshot: WorldSnapshot): void;
}

/**
 * Robust, modular implementation of state replication.
 * @public
 */
export class NetworkReplicator<TComponents extends ComponentRegistry = ComponentRegistry> implements IStateReplicator<TComponents> {
  private serverToLocal = new Map<string, number>();

  public getMappings(): Map<string, number> {
    return this.serverToLocal;
  }

  public getLocalId(serverId: string): number | undefined {
    return this.serverToLocal.get(serverId);
  }

  public removeMapping(serverId: string): void {
    this.serverToLocal.delete(serverId);
  }

  public resolveEntity(serverId: string, world: WorldLike<TComponents>, serverComponents: Record<string, Record<string, unknown>> = {}): number {
    let localId = this.serverToLocal.get(serverId);
    if (localId === undefined) {
      const newEntityId = world.createEntity();
      this.serverToLocal.set(serverId, newEntityId);
      localId = newEntityId;
    }

    const actualLocalId = localId as number;

    for (const [type, comp] of Object.entries(serverComponents)) {
      if (comp) {
        const componentToSet = { ...comp, type } as unknown as TComponents[Extract<keyof TComponents, string>];
        const typeKey = type as Extract<keyof TComponents, string>;
        if (world.hasComponent(actualLocalId, typeKey)) {
          world.mutateComponent(actualLocalId, typeKey, (existing) => {
            Object.assign(existing as any, componentToSet);
          });
        } else {
          world.addComponent(actualLocalId, componentToSet);
        }
      }
    }

    return actualLocalId;
  }

  public replicate(world: WorldLike<TComponents>, snapshot: WorldSnapshot): void {
    if (!snapshot || !snapshot.entities) return;

    const componentData = reconstructComponentData(snapshot);

    for (const serverIdNum of snapshot.entities) {
      const serverId = String(serverIdNum);
      const serverComponents: Record<string, Record<string, unknown>> = {};

      for (const [type, entityMap] of Object.entries(componentData)) {
        if (entityMap && entityMap[serverIdNum] !== undefined) {
          serverComponents[type] = entityMap[serverIdNum] as Record<string, unknown>;
        }
      }

      this.resolveEntity(serverId, world, serverComponents);
    }
  }
}

/**
 * Legacy class alias for backward compatibility.
 * @public
 */
export class Replicator<TComponents extends ComponentRegistry = ComponentRegistry> extends NetworkReplicator<TComponents> {}

/**
 * Options for registering a game with the network manager.
 * @public
 */
export interface RegisterGameOptions<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TServerEvents extends Record<string, any> = Record<string, any>,
  TClientEvents extends Record<string, any> = Record<string, any>
> {
  transport?: NetworkTransport<TServerEvents, TClientEvents>;
  world?: INetworkableWorld<TComponents>;
  [key: string]: unknown;
}

/**
 * Coordinator for network synchronization, prediction, and state reconciliation.
 * @public
 */
export class NetworkManager<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TServerEvents extends Record<string, any> = Record<string, any>,
  TClientEvents extends Record<string, any> = Record<string, any>
> {
  private transport: NetworkTransport<TServerEvents, TClientEvents>;
  private replicator: IStateReplicator<TComponents> = new NetworkReplicator<TComponents>();
  public world?: INetworkableWorld<TComponents>;

  constructor(transport?: NetworkTransport<TServerEvents, TClientEvents>) {
    this.transport = transport || new NullTransport<TServerEvents, TClientEvents>();
  }

  public static registerGame<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TServer extends Record<string, any> = Record<string, any>,
    TClient extends Record<string, any> = Record<string, any>
  >(_gameId: string, _game: unknown, options: RegisterGameOptions<TComponents, TServer, TClient> = {}): NetworkManager<TComponents, TServer, TClient> {
    const manager = new NetworkManager<TComponents, TServer, TClient>(options.transport || new NullTransport<TServer, TClient>());
    if (options.world) {
      manager.world = options.world;
    }
    return manager;
  }

  public getTransport(): NetworkTransport<TServerEvents, TClientEvents> {
    return this.transport;
  }

  public setTransport(transport: NetworkTransport<TServerEvents, TClientEvents>): void {
    this.transport = transport;
  }

  public getReplicator(): IStateReplicator<TComponents> {
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

    if (this.world) {
      this.replicator.replicate(this.world, snapshot);
    }
  }

  public reset(): void {
    this.replicator = new NetworkReplicator<TComponents>();
  }
}

/** @public */
export interface INetworkGame {
  readonly gameId: string;
}

/** @public */
export class NetworkReplicationUtils {
  /**
   * Processes an SoA packet into standard ComponentDataSnapshot using SoADeserializer.
   *
   * @param soaComponentData - Raw SoA component block map.
   * @returns Reconstructed component data dictionary.
   */
  public static processSoAPacket(soaComponentData: Record<string, any>): ComponentDataSnapshot {
    const componentData: ComponentDataSnapshot = {};
    for (const type in soaComponentData) {
      componentData[type] = {};
      const soaData = soaComponentData[type];
      SoADeserializer.hydrateEntities(soaData.entities, soaData, type, (entityId, component) => {
        componentData[type][entityId] = component;
      });
    }
    return componentData;
  }

  public static applyDelta(base: WorldSnapshot, delta: SnapshotDelta): void {
    if (delta.tick !== undefined) base.tick = delta.tick;
    if (delta.stateVersion !== undefined) base.stateVersion = delta.stateVersion;
    if (delta.structureVersion !== undefined) base.structureVersion = delta.structureVersion;
    if (delta.seed !== undefined) base.seed = delta.seed;
    if (delta.rngState !== undefined) base.rngState = delta.rngState;
    if (delta.nextEntityId !== undefined) base.nextEntityId = delta.nextEntityId;
    if (delta.entities !== undefined) base.entities = [...delta.entities];
    if (delta.freeEntities !== undefined) base.freeEntities = [...delta.freeEntities];

    if (delta.isSoA !== undefined && base.isSoA !== delta.isSoA) {
      (base as { isSoA?: boolean }).isSoA = delta.isSoA;
    }

    if (base.isSoA) {
      if (delta.soaComponentData) {
        const soaBase = base as SoAWorldSnapshot;
        if (!soaBase.soaComponentData) soaBase.soaComponentData = {};
        for (const [type, soaData] of Object.entries(delta.soaComponentData)) {
          soaBase.soaComponentData[type] = {
            ...soaBase.soaComponentData[type],
            ...soaData
          } as SoAComponentTypeData;
        }
      }
    } else {
      if (delta.componentData) {
        const aosBase = base as AoSWorldSnapshot;
        if (!aosBase.componentData) aosBase.componentData = {};
        for (const [type, entityMap] of Object.entries(delta.componentData)) {
          if (!aosBase.componentData[type]) aosBase.componentData[type] = {};
          for (const [entityIdStr, comp] of Object.entries(entityMap)) {
            const entityIdNum = Number(entityIdStr);
            if (comp === null || comp === undefined) {
              delete aosBase.componentData[type][entityIdNum];
            } else {
              aosBase.componentData[type][entityIdNum] = {
                ...aosBase.componentData[type][entityIdNum],
                ...comp
              };
            }
          }
        }
      }
    }
  }
}

function reconstructComponentData(snapshot: WorldSnapshot): ComponentDataSnapshot {
  if (snapshot.isSoA) {
    const componentData: ComponentDataSnapshot = {};
    const soaComponentData = snapshot.soaComponentData;

    for (const type in soaComponentData) {
      componentData[type] = {};
      const soaData = soaComponentData[type];
      const keys = soaData.keys;
      const numKeys = keys.length;
      const rawEntities = soaData.entities;

      const entities: number[] = Array.isArray(rawEntities)
        ? rawEntities
        : Object.keys(rawEntities || {}).map(Number).filter(n => !isNaN(n));

      const numEntities = entities.length;
      const valArray = soaData.values;
      const nonNumericValues = soaData.nonNumericValues;
      const booleanKeys = soaData.booleanKeys ? new Set(soaData.booleanKeys) : null;

      for (let i = 0; i < numEntities; i++) {
        const entityId = entities[i];
        const component: Record<string, unknown> = { type };

        for (let j = 0; j < numKeys; j++) {
          const key = keys[j];
          const offset = i * numKeys + j;
          const nonNumericVal = nonNumericValues ? nonNumericValues[offset] : undefined;

          if (nonNumericVal !== undefined && nonNumericVal !== null) {
            component[key] = nonNumericVal;
          } else {
            const rawVal = valArray[offset];
            component[key] = booleanKeys && booleanKeys.has(key) ? rawVal === 1 : rawVal;
          }
        }
        componentData[type][entityId] = component as SerializedComponent;
      }
    }
    return componentData;
  }

  return snapshot.componentData;
}
