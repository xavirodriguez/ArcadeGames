import { WorldSnapshot, ComponentDataSnapshot } from "../snapshots/WorldSnapshot";
import { NetworkTransport } from "./NetworkTransport";
import { NullTransport } from "./NullTransport";

/**
 * Minimum subset of World methods needed by the replicator.
 * @public
 */
export interface INetworkableWorld {
  createEntity(): number;
  hasComponent(entity: number, type: string): boolean;
  mutateComponent(entity: number, type: string, updater: (existing: any) => void): boolean;
  addComponent(entity: number, component: any): void;
}

/**
 * Interface representing a state replicator.
 * @public
 */
export interface IStateReplicator {
  getMappings(): Map<string, number>;
  getLocalId(serverId: string): number | undefined;
  removeMapping(serverId: string): void;
  resolveEntity(serverId: string, world: INetworkableWorld, serverComponents?: Record<string, any>): number;
  replicate(world: INetworkableWorld, snapshot: WorldSnapshot): void;
}

/**
 * Robust, modular implementation of state replication.
 * @public
 */
export class NetworkReplicator implements IStateReplicator {
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

  public resolveEntity(serverId: string, world: INetworkableWorld, serverComponents: Record<string, any> = {}): number {
    let localId = this.serverToLocal.get(serverId);
    if (localId === undefined) {
      const newEntityId = world.createEntity();
      this.serverToLocal.set(serverId, newEntityId);
      localId = newEntityId;
    }

    const actualLocalId = localId as number;

    for (const [type, comp] of Object.entries(serverComponents)) {
      if (comp) {
        const componentToSet = { ...comp, type };
        if (world.hasComponent(actualLocalId, type)) {
          world.mutateComponent(actualLocalId, type, (existing: any) => {
            Object.assign(existing, componentToSet);
          });
        } else {
          world.addComponent(actualLocalId, componentToSet);
        }
      }
    }

    return actualLocalId;
  }

  public replicate(world: INetworkableWorld, snapshot: WorldSnapshot): void {
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

      this.resolveEntity(serverId, world, serverComponents);
    }
  }
}

/**
 * Legacy class alias for backward compatibility.
 * @public
 */
export class Replicator extends NetworkReplicator {}

/**
 * Coordinator for network synchronization, prediction, and state reconciliation.
 * @public
 */
export class NetworkManager<
  TServerEvents extends Record<string, any> = Record<string, any>,
  TClientEvents extends Record<string, any> = Record<string, any>
> {
  private transport: NetworkTransport<TServerEvents, TClientEvents>;
  private replicator: IStateReplicator = new NetworkReplicator();
  public world?: INetworkableWorld;

  constructor(transport?: NetworkTransport<TServerEvents, TClientEvents>) {
    this.transport = transport || new NullTransport<TServerEvents, TClientEvents>();
  }

  public static registerGame<
    TServer extends Record<string, any> = Record<string, any>,
    TClient extends Record<string, any> = Record<string, any>
  >(_gameId: string, _game: unknown, options: any = {}): NetworkManager<TServer, TClient> {
    const manager = new NetworkManager<TServer, TClient>(options.transport || new NullTransport<TServer, TClient>());
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

  public getReplicator(): IStateReplicator {
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
    this.replicator = new NetworkReplicator();
  }
}

/** @public */
export interface INetworkGame {
  readonly gameId: string;
}

/** @public */
export class NetworkReplicationUtils {
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

  return snapshot.componentData;
}
