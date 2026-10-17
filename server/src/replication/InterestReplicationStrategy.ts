import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";
import { executeReplicationLoop } from "./ReplicationHelpers";

export class InterestReplicationStrategy implements ReplicationStrategy {
  replicate(room: any, clients: any[], state: any, tick: number): ReplicationResult {
    return executeReplicationLoop({
      room,
      clients,
      state,
      tick,
      getInterestIds: (_client, interest) => new Set(interest.map((e: any) => parseInt(e.entityId))),
      serializeAndSend: (client, isNew, interestIds) => {
        const serializationStart = Date.now();

        const snapshot = room.world.snapshot();
        if (!isNew) {
          snapshot.entities = snapshot.entities.filter((id: number) => interestIds.has(id));
          for (const type in snapshot.componentData) {
            for (const id in snapshot.componentData[type]) {
              if (!interestIds.has(parseInt(id))) {
                delete snapshot.componentData[type][id];
              }
            }
          }
        }

        const serialized = JSON.stringify(snapshot);
        const serializationMs = Date.now() - serializationStart;

        client.send("world_delta", {
          protocolVersion: state.protocolVersion,
          tick: tick,
          delta: serialized,
        });

        return { serializationMs, bytesSent: serialized.length };
      },
    });
  }
}
