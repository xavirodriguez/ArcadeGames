import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";
import type { AsteroidsRoom } from "../AsteroidsRoom";
import type { Client } from "@colyseus/core";
import type { AsteroidsState } from "../schema/GameState";

export class LegacyReplicationStrategy implements ReplicationStrategy<AsteroidsRoom, Client, AsteroidsState> {
  replicate(room: AsteroidsRoom, clients: Client[], state: AsteroidsState, _tick: number): ReplicationResult {
    const fullSerializationStart = Date.now();
    const snapshot = room.world.snapshot();
    const serialized = JSON.stringify(snapshot);
    const totalSerializationMs = Date.now() - fullSerializationStart;
    state.fullWorldState = serialized;
    const totalBytesSentThisTick = serialized.length;

    return {
      totalBytesSentThisTick,
      totalSerializationMs,
      totalEntitiesFiltered: 0,
    };
  }
}
