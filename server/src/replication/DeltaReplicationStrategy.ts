import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";
import type { AsteroidsRoom } from "../AsteroidsRoom";
import type { Client } from "@colyseus/core";
import type { AsteroidsState } from "../schema/GameState";

interface DetailedInterestNode {
  entityId: string | number;
  priority?: number;
}

export class DeltaReplicationStrategy implements ReplicationStrategy<AsteroidsRoom, Client, AsteroidsState> {
  replicate(room: AsteroidsRoom, clients: Client[], state: AsteroidsState, tick: number): ReplicationResult {
    let totalBytesSentThisTick = 0;
    let totalSerializationMs = 0;
    let totalEntitiesFiltered = 0;
    const totalEntitiesInWorld = room.world.entities.length;

    const detailedInterestMap = room.world.getResource<Map<string, DetailedInterestNode[]>>("DetailedInterestMap");

    clients.forEach((client: Client) => {
      const isNew = room.newClients.has(client.sessionId);
      const interest = detailedInterestMap?.get(client.sessionId) || [];
      const interestIds = new Set(interest.map((e) => typeof e.entityId === "number" ? e.entityId : parseInt(e.entityId || "0", 10)));

      totalEntitiesFiltered += (totalEntitiesInWorld - interestIds.size);

      const serializationStart = Date.now();

      const sequence = room.ackTracker.nextSequence(client.sessionId);
      const baselineAck = room.ackTracker.getLastAckedSequence(client.sessionId);
      const idleTime = room.ackTracker.getIdleTime(client.sessionId);
      const forceFull = idleTime > 3000 || baselineAck === 0;

      const deltaPacket = room.deltaSystem.generateDelta(
        room.world,
        client.sessionId,
        sequence,
        baselineAck,
        interestIds,
        forceFull
      );

      const serialized = JSON.stringify(deltaPacket);
      totalSerializationMs += (Date.now() - serializationStart);
      totalBytesSentThisTick += serialized.length;

      client.send("world_delta", {
        protocolVersion: state.protocolVersion,
        tick: tick,
        delta: serialized
      });

      if (isNew) {
        room.newClients.delete(client.sessionId);
      }
    });

    return {
      totalBytesSentThisTick,
      totalSerializationMs,
      totalEntitiesFiltered,
    };
  }
}
