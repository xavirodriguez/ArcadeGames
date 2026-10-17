import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";
import { executeReplicationLoop, sendDeltaState } from "./ReplicationHelpers";

export class BudgetReplicationStrategy implements ReplicationStrategy {
  replicate(room: any, clients: any[], state: any, tick: number): ReplicationResult {
    return executeReplicationLoop({
      room,
      clients,
      state,
      tick,
      getInterestIds: (client, interest) => {
        const selfEntityId = room.playerEntities.get(client.sessionId)?.toString();
        const prioritized = room.budgetManager.prioritize(client.sessionId, interest, selfEntityId);
        return new Set(prioritized.map((e: any) => parseInt(e.entityId)));
      },
      serializeAndSend: (client, _isNew, interestIds) => sendDeltaState(room, client, state, tick, interestIds),
    });
  }
}
