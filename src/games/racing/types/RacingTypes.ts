import { Component, CoreComponentRegistry } from "@tiny-aster/core";

export interface RacingGameState extends Component {
  type: "RacingState";
  phase: "countdown" | "racing" | "finished";
  countdownRemaining: number;
  currentLap: number;
  totalLaps: number;
  lastLapTime: number;
  bestLapTime: number | null;
  raceTime: number;
  isGameOver: boolean;
  position: number;
}

export interface HeadToHeadStateComponent extends Component {
  type: "HeadToHeadState";
  leaderEntity: number | null;
  scores: Record<string, number>;
  targetScore: number;
  phase: "countdown" | "racing" | "round_end" | "finished";
  roundCountdown: number;
  winner: string | null;
}

export interface RacingInputState {
  moveX: number;
  moveY: number;
  boost: boolean;
  brake: boolean;
  [key: string]: unknown;
}

export interface RacingInputComponent extends Component {
  type: "Input";
  actions: Record<string, boolean>;
  axes: Record<string, number>;
}

export interface CarComponent extends Component {
  type: "Car";
  acceleration: number;
  maxSpeed: number;
  grip: number;
  drift: number;
  turnRate: number;
  boostMultiplier: number;
  boostRemaining: number;
}

export interface LapComponent extends Component {
  type: "Lap";
  currentLap: number;
  lastCheckpoint: number;
  lapStartedAt: number;
  lastLapTime: number;
  bestLapTime: number | null;
}

export interface CheckpointComponent extends Component {
  type: "Checkpoint";
  index: number;
  width: number;
  height: number;
  isFinish: boolean;
}

export interface TrackComponent extends Component {
  type: "Track";
  role: "wall" | "start" | "surface";
  friction: number;
}

export interface RacingWallComponent extends Component {
  type: "RacingWall";
  width: number;
  height: number;
}

export interface TrackZoneDataComponent extends Component {
  type: "TrackZoneData";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  surface: string;
}

export interface TrackObstacleDataComponent extends Component {
  type: "TrackObstacleData";
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: string;
}

export interface RacingComponentRegistry extends CoreComponentRegistry {
  Input: RacingInputComponent;
  Car: CarComponent;
  Lap: LapComponent;
  Checkpoint: CheckpointComponent;
  Track: TrackComponent;
  RacingWall: RacingWallComponent;
  TrackZoneData: TrackZoneDataComponent;
  TrackObstacleData: TrackObstacleDataComponent;
  RacingState: RacingGameState;
  HeadToHeadState: HeadToHeadStateComponent;
}

export interface RacingEventRegistry extends Record<string, unknown> {
  "lap:completed": { lap: number; lapTime: number };
  "race:finished": { totalTime: number; laps: number };
  "race:countdown": { remaining: number };
  "racing:checkpoint": { checkpoint: number };
  "head_to_head:point": { winnerId: string; scores: Record<string, number> };
  "head_to_head:round_start": Record<string, never>;
}
