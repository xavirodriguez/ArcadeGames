import { Component, CoreComponentRegistry, CoreEvents } from "@tiny-aster/core";
import { PowerUpComponent, LootTableComponent } from "@tiny-aster/gameplay-kit";

export type FrogFacing = "up" | "down" | "left" | "right";

export interface FroggerComponent extends Component {
  type: "Frogger";
  gridX: number;
  gridY: number;
  isRiding: boolean;
  logEntity?: number;
  isAlive: boolean;
  cooldownRemaining: number;
  furthestY: number;
  invulnerableRemaining?: number;
  /** Last jump direction for visual orientation. */
  facing: FrogFacing;
}

export interface VehicleComponent extends Component {
  type: "Vehicle";
  laneY: number;
  speed: number;
  direction: number; // 1 (right) or -1 (left)
  vehicleType: "car" | "truck";
}

/** Dive phase for turtles that sink. */
export type TurtleDivePhase = "float" | "warning" | "submerged";

export interface LogComponent extends Component {
  type: "Log";
  laneY: number;
  speed: number;
  direction: number; // 1 (right) or -1 (left)
  length: number;
  logType: "log" | "turtle" | "crocodile";
  /** Turtle-only: current dive phase. */
  divePhase?: TurtleDivePhase;
  /** Turtle-only: time remaining in current phase (seconds). */
  diveTimer?: number;
  /** Crocodile-only: whether the mouth is open (lethal). */
  mouthOpen?: boolean;
  /** Crocodile-only: timer for mouth cycle. */
  mouthTimer?: number;
}

export interface GoalLilyPadComponent extends Component {
  type: "GoalLilyPad";
  padIndex: number;
  occupied: boolean;
  x: number;
  y: number;
  /** Bonus fly is currently on this pad. */
  hasFly?: boolean;
  /** Crocodile is occupying this pad (lethal). */
  hasCrocodile?: boolean;
  /** Time remaining for the fly (seconds). */
  flyTimer?: number;
}

export interface FroggerStateComponent extends Component {
  type: "FroggerState";
  score: number;
  lives: number;
  level: number;
  isGameOver: boolean;
  isWin: boolean;
  occupiedLilyPads: number;
  totalLilyPads: number;
  respawnTimer: number;
  /** Seconds remaining for the current frog life. */
  timeRemaining: number;
  /** Cumulative speed multiplier for traffic (vehicles). */
  trafficSpeedScale: number;
  /** Cumulative speed multiplier for river (logs/turtles). */
  riverSpeedScale: number;
  /** Highest extra-life threshold already awarded. */
  extraLivesAwarded: number;
}

export interface FroggerInputComponent extends Component {
  type: "FroggerInput";
  moveUp: boolean;
  moveDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  prevMoveUp?: boolean;
  prevMoveDown?: boolean;
  prevMoveLeft?: boolean;
  prevMoveRight?: boolean;
}

/** Optional female frog that rides a log and can be rescued for a bonus. */
export interface FemaleFrogComponent extends Component {
  type: "FemaleFrog";
  logEntity: number;
  rescued: boolean;
}

/** Snake that appears on the safe median strip or on logs. */
export interface SnakeComponent extends Component {
  type: "Snake";
  laneY: number;
  speed: number;
  direction: number;
}

export interface FroggerComponentRegistry extends CoreComponentRegistry {
  Frogger: FroggerComponent;
  Vehicle: VehicleComponent;
  Log: LogComponent;
  GoalLilyPad: GoalLilyPadComponent;
  FroggerState: FroggerStateComponent;
  FroggerInput: FroggerInputComponent;
  FemaleFrog: FemaleFrogComponent;
  Snake: SnakeComponent;
  PowerUp: PowerUpComponent;
  LootTable: LootTableComponent;
}

export interface FroggerState {
  score: number;
  lives: number;
  level: number;
  isGameOver: boolean;
  isWin: boolean;
  occupiedLilyPads: number;
  totalLilyPads: number;
  timeRemaining?: number;
}

export interface FroggerInput {
  moveUp?: boolean;
  moveDown?: boolean;
  moveLeft?: boolean;
  moveRight?: boolean;
}

export interface FroggerEventRegistry extends Record<string, unknown> {
  "frogger:jump": { gridX: number; gridY: number };
  "frogger:died": { reason: string; gridX: number; gridY: number };
  "frogger:goal_reached": { padIndex: number; score: number; timeBonus?: number };
  "frogger:level_cleared": { level: number; score: number };
  "frogger:extra_life": { lives: number; score: number };
  "frogger:fly_caught": { score: number };
  "frogger:female_rescued": { score: number };
}
