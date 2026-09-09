import {
  ComponentRegistry,
  CoreComponentRegistry,
  EventRegistry,
  Entity
} from "@tiny-aster/core";
import { PowerUpComponent } from "@tiny-aster/gameplay-kit";

export type BrickKind = "standard" | "explosive" | "regenerable" | "gravitational";

export interface PaddleComponent {
  type: "Paddle";
  speed: number;
  previousX: number;
  lastVelocityX: number;
}

export interface BallComponent {
  type: "Ball";
  isAttached: boolean;
  speed: number;
  spinFactor: number;
}

export interface BrickComponent {
  type: "Brick";
  kind: BrickKind;
  points: number;
  hp: number;
  maxHp: number;
  regenTimer: number;
  regenDuration: number;
}

export interface ArkanoidStateComponent {
  type: "ArkanoidState";
  score: number;
  lives: number;
  level: number;
  isGameOver: boolean;
  isVictory: boolean;
  bricksRemaining: number;
}

export interface ArkanoidComponentRegistry extends CoreComponentRegistry {
  Paddle: PaddleComponent;
  Ball: BallComponent;
  Brick: BrickComponent;
  ArkanoidState: ArkanoidStateComponent;
  PowerUp: PowerUpComponent;
  Tag: { type: "Tag"; tags: string[] };
}

export interface ArkanoidEventRegistry extends EventRegistry {
  "arkanoid:brick_destroyed": { entity: Entity; kind: BrickKind; points: number; x: number; y: number };
  "arkanoid:ball_lost": { entity: Entity; remainingLives: number };
  "arkanoid:level_complete": { level: number };
  "combat:hit": { targetEntity: Entity; attackerEntity?: Entity; damage: number };
  "combat:death": { entity: Entity; attackerEntity?: Entity };
  "PlaySFX": { name: string };
}

export interface ArkanoidInput {
  p1Left: boolean;
  p1Right: boolean;
  p1Launch: boolean;
  [key: string]: unknown;
}
