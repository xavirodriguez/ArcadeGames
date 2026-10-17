import { ReplicationResult } from "./ReplicationStrategy";

export interface ReplicationClient {
  sessionId: string;
  send: (event: string, payload: unknown) => void;
}

export interface ReplicationRoom {
  world: {
    entities: { length: number };
    getResource: <T = unknown>(name: string) => T | undefined;
  };
  newClients: Set<string>;
  ackTracker: {
    nextSequence: (sessionId: string) => number;
    getLastAckedSequence: (sessionId: string) => number;
    getIdleTime: (sessionId: string) => number;
  };
  deltaSystem: {
    generateDelta: (
      world: unknown,
      sessionId: string,
      sequence: number,
      baselineAck: number,
      interestIds: Set<number>,
      forceFull: boolean
    ) => unknown;
  };
}

export interface ReplicationClientContext {
  client: ReplicationClient;
  interestIds: Set<number>;
  isNew: boolean;
}

export interface CommonReplicationOptions {
  room: ReplicationRoom;
  clients: ReplicationClient[];
  state: { protocolVersion?: number; [key: string]: unknown };
  tick: number;
  getInterestIds: (client: ReplicationClient, interest: unknown[]) => Set<number>;
  serializeAndSend: (client: ReplicationClient, isNew: boolean, interestIds: Set<number>) => { serializationMs: number; bytesSent: number };
}

export function executeReplicationLoop(options: CommonReplicationOptions): ReplicationResult {
  const { room, clients, getInterestIds, serializeAndSend } = options;

  let totalBytesSentThisTick = 0;
  let totalSerializationMs = 0;
  let totalEntitiesFiltered = 0;
  const totalEntitiesInWorld = room.world.entities.length;

  const detailedInterestMap = room.world.getResource<Map<string, unknown[]>>("DetailedInterestMap");

  clients.forEach((client: ReplicationClient) => {
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
  room: ReplicationRoom,
  client: ReplicationClient,
  state: { protocolVersion?: number; [key: string]: unknown },
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
