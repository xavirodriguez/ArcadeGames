export interface InputFrame {
  protocolVersion: number;
  tick: number;
  timestamp: number;
  actions: string[];
  axes: Record<string, number>;
}

export interface GameEventBase {
  kind: string;
}

export interface CollisionEvent extends GameEventBase {
  kind: "collision";
  entityA: number;
  entityB: number;
  x?: number;
  y?: number;
}

export interface SpawnEvent extends GameEventBase {
  kind: "spawn";
  entityId: number;
  blueprint: string;
  x?: number;
  y?: number;
}

export interface DeathEvent extends GameEventBase {
  kind: "death";
  entityId: number;
}

export interface ScoreEvent extends GameEventBase {
  kind: "score";
  score: number;
  sessionId?: string;
}

export type GameEvent = CollisionEvent | SpawnEvent | DeathEvent | ScoreEvent;

export interface ReplayFrame {
  tick: number;
  inputs: Record<string, InputFrame[]>;
  events: GameEvent[];
}
