import type { Client } from "@colyseus/core";

export interface ReplicationResult {
  totalBytesSentThisTick: number;
  totalSerializationMs: number;
  totalEntitiesFiltered: number;
}

/**
 * Interface representing a network state replication strategy.
 */
export interface ReplicationStrategy<TRoom = any, TClient = Client, TState = any> {
  replicate(room: TRoom, clients: TClient[], state: TState, tick: number): ReplicationResult;
}
