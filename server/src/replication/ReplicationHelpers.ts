import { ReplicationResult } from "./ReplicationStrategy";

export interface ReplicationClientContext {
  client: any;
  interestIds: Set<number>;
  isNew: boolean;
}

export interface CommonReplicationOptions {
  room: any;
  clients: any[];
  state: any;
  tick: number;
  getInterestIds: (client: any, interest: any[]) => Set<number>;
  serializeAndSend: (client: any, isNew: boolean, interestIds: Set<number>) => { serializationMs: number; bytesSent: number };
}

export function executeReplicationLoop(options: CommonReplicationOptions): ReplicationResult {
  const { room, clients, state, tick, getInterestIds, serializeAndSend } = options;

  let totalBytesSentThisTick = 0;
  let totalSerializationMs = 0;
  let totalEntitiesFiltered = 0;
  const totalEntitiesInWorld = room.world.entities.length;

  const detailedInterestMap = room.world.getResource("DetailedInterestMap");

  clients.forEach((client: any) => {
    const isNew = room.newClients.has(client.sessionId);
    const interest = detailedInterestMap?.get(client.sessionId) || [];
    const interestIds = getInterestIds(client, interest);

    totalEntitiesFiltered += (totalEntitiesInWorld - interestIds.size);

    const { serializationMs, bytesSent } = serializeAndSend(client, isNew, interestIds);
    totalSerializationMs += serializationMs;
    totalBytesSentThisTick += bytesSent;

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

export function sendDeltaState(
  room: any,
  client: any,
  state: any,
  tick: number,
  interestIds: Set<number>
): { serializationMs: number; bytesSent: number } {
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
  const serializationMs = Date.now() - serializationStart;

  client.send("world_delta", {
    protocolVersion: state.protocolVersion,
    tick: tick,
    delta: serialized,
  });

  return { serializationMs, bytesSent: serialized.length };
}
