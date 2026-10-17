import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";
import { executeReplicationLoop, sendDeltaState } from "./ReplicationHelpers";

export class DeltaReplicationStrategy implements ReplicationStrategy {
  replicate(room: any, clients: any[], state: any, tick: number): ReplicationResult {
    return executeReplicationLoop({
      room,
      clients,
      state,
      tick,
      getInterestIds: (_client, interest) => new Set(interest.map((e: any) => parseInt(e.entityId))),
      serializeAndSend: (client, _isNew, interestIds) => sendDeltaState(room, client, state, tick, interestIds),
    });
  }
}
