import { Component, CoreComponentRegistry, CoreEvents } from "@tiny-aster/core";

export interface FroggerComponent extends Component {
  type: "Frogger";
  gridX: number;
  gridY: number;
  isRiding: boolean;
  logEntity?: number;
  isAlive: boolean;
  cooldownRemaining: number;
  furthestY: number;
}

export interface VehicleComponent extends Component {
  type: "Vehicle";
  laneY: number;
  speed: number;
  direction: number; // 1 (right) or -1 (left)
  vehicleType: "car" | "truck";
}

export interface LogComponent extends Component {
  type: "Log";
  laneY: number;
  speed: number;
  direction: number; // 1 (right) or -1 (left)
  length: number;
  logType: "log" | "turtle";
}

export interface GoalLilyPadComponent extends Component {
  type: "GoalLilyPad";
  padIndex: number;
  occupied: boolean;
  x: number;
  y: number;
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
}

export interface FroggerInputComponent extends Component {
  type: "FroggerInput";
  moveUp: boolean;
  moveDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}

export interface FroggerComponentRegistry extends CoreComponentRegistry {
  Frogger: FroggerComponent;
  Vehicle: VehicleComponent;
  Log: LogComponent;
  GoalLilyPad: GoalLilyPadComponent;
  FroggerState: FroggerStateComponent;
  FroggerInput: FroggerInputComponent;
}

export interface FroggerState {
  score: number;
  lives: number;
  level: number;
  isGameOver: boolean;
  isWin: boolean;
  occupiedLilyPads: number;
  totalLilyPads: number;
}

export interface FroggerInput {
  moveUp?: boolean;
  moveDown?: boolean;
  moveLeft?: boolean;
  moveRight?: boolean;
}
