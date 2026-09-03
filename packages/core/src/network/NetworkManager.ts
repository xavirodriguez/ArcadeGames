import { WorldSnapshot, ComponentDataSnapshot } from "../snapshots/WorldSnapshot";
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

  public static applyDelta(base: WorldSnapshot, delta: Partial<WorldSnapshot>): void {
    const d = delta as any;
    if (d.tick !== undefined) base.tick = d.tick;
    if (d.stateVersion !== undefined) base.stateVersion = d.stateVersion;
    if (d.structureVersion !== undefined) base.structureVersion = d.structureVersion;
    if (d.seed !== undefined) base.seed = d.seed;
    if (d.rngState !== undefined) base.rngState = d.rngState;
    if (d.nextEntityId !== undefined) base.nextEntityId = d.nextEntityId;
    if (d.entities !== undefined) {
      base.entities = [...d.entities];
    }
    if (d.freeEntities !== undefined) {
      base.freeEntities = [...d.freeEntities];
    }

    if (d.componentData) {
      if (!base.isSoA) {
        if (!base.componentData) {
          (base as any).componentData = {};
        }
        for (const [type, entityMap] of Object.entries(d.componentData)) {
          if (!base.componentData[type]) {
            base.componentData[type] = {};
          }
          for (const [entityId, comp] of Object.entries(entityMap as any)) {
            const entityIdNum = Number(entityId);
            if (comp === null || comp === undefined) {
              delete base.componentData[type][entityIdNum];
            } else {
              base.componentData[type][entityIdNum] = {
                ...base.componentData[type][entityIdNum],
                ...comp as any
              };
            }
          }
        }
      }
    }

    if (d.isSoA !== undefined) {
      (base as any).isSoA = d.isSoA;
    }
    if (d.soaComponentData) {
      if (base.isSoA) {
        if (!base.soaComponentData) {
          (base as any).soaComponentData = {};
        }
        for (const [type, soaData] of Object.entries(d.soaComponentData)) {
          base.soaComponentData[type] = {
            ...base.soaComponentData[type],
            ...soaData as any
          } as any;
        }
      }
    }
  }
}

function reconstructComponentData(snapshot: WorldSnapshot): ComponentDataSnapshot {
  if (snapshot.isSoA) {
    return NetworkReplicationUtils.processSoAPacket(snapshot.soaComponentData);
  }

  return snapshot.componentData;
}
