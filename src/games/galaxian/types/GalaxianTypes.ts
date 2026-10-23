import { Component, CoreComponentRegistry, CoreEvents, BlueprintDefinition } from "@tiny-aster/core";

export type EnemyType = "flagship" | "escort" | "emissary" | "drone";
export type EnemyState = "in_slot" | "windup" | "diving" | "returning";

export interface GalaxianEnemyComponent extends Component {
  type: "GalaxianEnemy";
  enemyType: EnemyType;
  row: number;
  col: number;
  slotId: string;
  pointsFormation: number;
  pointsDive: number;
  bonusEscorted: number;
  state: EnemyState;
  windupTimer: number;
  pathId?: string;
  shotsFiredInDive: number;
  leaderEntity?: number;
  isEscortLeader?: boolean;
}

export interface FormationSlot {
  x: number;
  y: number;
  entity?: number;
}

export interface FormationComponent extends Component {
  type: "Formation";
  originX: number;
  originY: number;
  currentOscillationX: number;
  direction: number;
  totalEnemies: number;
  slots: Record<string, FormationSlot>;
}

export interface GalaxianStateComponent extends Component {
  type: "GameState";
  lives: number;
  score: number;
  level: number;
  enemiesRemaining: number;
  isGameOver: boolean;
  highScore: number;
  screenShake: { intensity: number; duration: number; elapsed: number } | null;
  diveTimer: number;
  activeDivesCount: number;
  waveTransitionRemaining: number;
}

export interface GalaxianInputState {
  moveLeft: boolean;
  moveRight: boolean;
  shoot: boolean;
  actions?: Set<string>;
  axes?: Record<string, number>;
  [key: string]: unknown;
}

export interface GalaxianInputComponent extends Component, GalaxianInputState {
  type: "Input";
  shootCooldownRemaining: number;
  actions: Set<string>;
  axes: Record<string, number>;
}

export interface VisualPoseComponent extends Component {
  type: "VisualPose";
  rotation: number;
  scaleX: number;
  scaleY: number;
  visualOffsetX: number;
  visualOffsetY: number;
}

export interface DiveTrailComponent extends Component {
  type: "DiveTrail";
  history: Array<{ x: number; y: number }>;
  maxHistory: number;
}

export interface ScorePopupComponent extends Component {
  type: "ScorePopup";
  points: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface UnfoldShardComponent extends Component {
  type: "UnfoldShard";
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface GalaxianComponentRegistry extends CoreComponentRegistry {
  GalaxianEnemy: GalaxianEnemyComponent;
  Formation: FormationComponent;
  GameState: GalaxianStateComponent;
  Input: GalaxianInputComponent;
  VisualPose: VisualPoseComponent;
  DiveTrail: DiveTrailComponent;
  ScorePopup: ScorePopupComponent;
  UnfoldShard: UnfoldShardComponent;
  Player: { type: "Player" };
  PlayerBullet: { type: "PlayerBullet" };
  EnemyBullet: { type: "EnemyBullet" };
}

export interface GalaxianEventRegistry extends CoreEvents, Record<string, unknown> {
  "combat:enemy_hit": { entity: number; points: number; x: number; y: number; enemyType: EnemyType; inDive: boolean };
  "player:hit": { x: number; y: number };
  "wave:completed": { level: number };
}

export interface GalaxianBlueprintMap extends Record<string, BlueprintDefinition<GalaxianComponentRegistry, GalaxianEventRegistry, unknown>> {
  player: BlueprintDefinition<GalaxianComponentRegistry, GalaxianEventRegistry, { x: number; y: number }>;
  enemy: BlueprintDefinition<GalaxianComponentRegistry, GalaxianEventRegistry, { x: number; y: number; enemyType: EnemyType; row: number; col: number; slotId: string; pointsFormation: number; pointsDive: number; bonusEscorted: number }>;
  player_bullet: BlueprintDefinition<GalaxianComponentRegistry, GalaxianEventRegistry, { x: number; y: number }>;
  enemy_bullet: BlueprintDefinition<GalaxianComponentRegistry, GalaxianEventRegistry, { x: number; y: number }>;
  state: BlueprintDefinition<GalaxianComponentRegistry, GalaxianEventRegistry, Record<string, never>>;
  formation: BlueprintDefinition<GalaxianComponentRegistry, GalaxianEventRegistry, Record<string, never>>;
}
