import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";
import { filterSoASnapshot, BinaryCompression, SnapshotSerializer } from "@tiny-aster/core";
import type { AsteroidsRoom } from "../AsteroidsRoom";
import type { Client } from "@colyseus/core";
import type { AsteroidsState } from "../schema/GameState";

interface DetailedInterestNode {
  entityId: string | number;
  priority?: number;
}

export class BinaryReplicationStrategy implements ReplicationStrategy<AsteroidsRoom, Client, AsteroidsState> {
  replicate(room: AsteroidsRoom, clients: Client[], state: AsteroidsState, tick: number): ReplicationResult {
    let totalBytesSentThisTick = 0;
    let totalSerializationMs = 0;
    let totalEntitiesFiltered = 0;
    const totalEntitiesInWorld = room.world.entities.length;

    const detailedInterestMap = room.world.getResource<Map<string, DetailedInterestNode[]>>("DetailedInterestMap");

    clients.forEach((client: Client) => {
      const isNew = room.newClients.has(client.sessionId);
      const interest = detailedInterestMap?.get(client.sessionId) || [];

      const selfEntityId = room.playerEntities.get(client.sessionId)?.toString();
      const prioritized = room.budgetManager.prioritize(client.sessionId, interest, selfEntityId);
      const interestIds = new Set<number>(prioritized.map((e) => typeof e.entityId === "number" ? e.entityId : parseInt(e.entityId || "0", 10)));

      totalEntitiesFiltered += (totalEntitiesInWorld - interestIds.size);

      const serializationStart = Date.now();

      const snapshot = room.world.snapshot();
      const filteredSnapshot = isNew ? snapshot : filterSoASnapshot(snapshot, interestIds);
      const binaryPacket = BinaryCompression.pack(filteredSnapshot);
      totalSerializationMs += (Date.now() - serializationStart);
      totalBytesSentThisTick += binaryPacket.length;

      // Compute AoS equivalent size to record compression statistics (sampled once every 120 ticks (~2s) to avoid performance regression)
      const shouldSampleCompression = tick % 120 === 0;
      if (shouldSampleCompression) {
        try {
          const aosSnapshot = SnapshotSerializer.snapshot(room.world);
          if (!isNew) {
            aosSnapshot.entities = aosSnapshot.entities.filter((id: number) => interestIds.has(id));
            for (const type in aosSnapshot.componentData) {
              for (const id in aosSnapshot.componentData[type]) {
                if (!interestIds.has(parseInt(id, 10))) {
                  delete aosSnapshot.componentData[type][id];
                }
              }
            }
          }
          const aosSerialized = JSON.stringify(aosSnapshot);
          room.networkMetrics.recordCompression(binaryPacket.length, aosSerialized.length);
        } catch (err) {
          console.warn("[BinaryReplicationStrategy] Failed to compute AoS comparison for metrics:", err);
        }
      }

      client.send("world_delta_bin", binaryPacket);

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
