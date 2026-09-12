import {
  ComponentRegistry,
  CoreComponentRegistry,
  EventRegistry,
  Entity
} from "@tiny-aster/core";
import { PowerUpComponent } from "@tiny-aster/gameplay-kit";
import {
  BrickMaterial,
  BrickColorName,
  CapsuleType
} from "../domain/LevelCatalog";

export type { BrickMaterial, BrickColorName, CapsuleType };

export type BrickKind = BrickMaterial;

export const COLOR_SCORES: Record<BrickColorName, number> = {
  white: 50,
  orange: 60,
  cyan: 70,
  green: 80,
  red: 90,
  blue: 100,
  pink: 110,
  yellow: 120,
  silver: 50,
  gold: 0,
  purple: 100
};

export interface PaddleComponent {
  type: "Paddle";
  speed: number;
  previousX: number;
  lastVelocityX: number;
  isExpanded?: boolean;
  isLaserActive?: boolean;
  isCatchActive?: boolean;
  laserCooldown?: number;
}

export interface BallComponent {
  type: "Ball";
  isAttached: boolean;
  speed: number;
  spinFactor: number;
  attachedOffsetX?: number;
}

export interface BrickComponent {
  type: "Brick";
  kind: BrickKind;
  material: BrickMaterial;
  color: BrickColorName;
  points: number;
  hp: number;
  maxHp: number;
  regenTimer: number;
  regenDuration: number;
  powerUp?: CapsuleType;
  isDestroyed?: boolean;
}

export interface CapsuleComponent {
  type: "Capsule";
  capsuleType: CapsuleType;
  speed: number;
}

export interface LaserProjectileComponent {
  type: "LaserProjectile";
  speed: number;
  damage: number;
}

export interface EnemyComponent {
  type: "Enemy";
  kind: "patrol" | "jumper" | "charger";
  enemyType?: "sphere" | "pyramid" | "cube" | "cone";
  pattern?: "horizontal" | "sine" | "arc" | "swoop";
  timer?: number;
  startX?: number;
  startY?: number;
  hp?: number;
  points?: number;
}

export interface BossComponent {
  type: "Boss";
  state: "intro" | "idle" | "attack" | "damaged" | "defeated";
  hp: number;
  maxHp: number;
  hitsReceived: number;
  attackTimer: number;
  damagedTimer: number;
  introTimer: number;
}

export interface BossProjectileComponent {
  type: "BossProjectile";
  speed: number;
  vx: number;
  vy: number;
}

export interface ExitPortalComponent {
  type: "ExitPortal";
  active: boolean;
}

export interface ArkanoidStateComponent {
  type: "ArkanoidState";
  score: number;
  lives: number;
  level: number;
  isGameOver: boolean;
  isVictory: boolean;
  bricksRemaining: number;
  activePowerUp: CapsuleType | null;
  portalActive: boolean;
}

export interface ArkanoidComponentRegistry extends CoreComponentRegistry {
  Paddle: PaddleComponent;
  Ball: BallComponent;
  Brick: BrickComponent;
  Capsule: CapsuleComponent;
  LaserProjectile: LaserProjectileComponent;
  Enemy: EnemyComponent;
  Boss: BossComponent;
  BossProjectile: BossProjectileComponent;
  ExitPortal: ExitPortalComponent;
  ArkanoidState: ArkanoidStateComponent;
  PowerUp: PowerUpComponent;
  Tag: { type: "Tag"; tags: string[] };
}

export interface ArkanoidEventRegistry extends EventRegistry {
  "arkanoid:brick_destroyed": { entity: Entity; kind: BrickKind; points: number; x: number; y: number; powerUp?: CapsuleType };
  "arkanoid:ball_lost": { entity: Entity; remainingLives: number };
  "arkanoid:level_complete": { level: number };
  "arkanoid:powerup_collected": { capsuleType: CapsuleType; x: number; y: number };
  "arkanoid:doh_hit": { hitsRemaining: number };
  "arkanoid:doh_defeated": {};
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
