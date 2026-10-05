import { Component, CoreComponentRegistry, CoreEvents, MultiplayerRegistry, HealthComponent } from "@tiny-aster/core";
import {
  DamageComponent,
  FactionComponent,
  SpawnDirectorComponent,
  WaveMemberComponent,
} from "@tiny-aster/gameplay-kit";
import type { TileType, TowerDefinition, CreepDefinition, WaveDefinition } from "./TowerDefenseConfigSchema";

export { SpawnDirectorComponent, WaveMemberComponent };

/** Map tile kinds used by the level layout. */
export type { TileType };

/** Event registry for Tower Defense. */
export interface TowerDefenseEventRegistry extends CoreEvents, Record<string, unknown> {
  "combat:hit": { targetEntity: number; sourceEntity?: number; amount: number; remainingHealth?: number; category?: string };
  "combat:death": { entity: number; sourceEntity?: number; category?: string };
  "creep:killed": { entity: number; reward: number; creepType: string };
  "creep:reached_base": { entity: number };
  "tower:built": { entity: number; towerType: string; col: number; row: number };
  "tower:sold": { entity: number; refund: number };
  "tower:upgraded": { entity: number; level: number };
  "wave:started": { waveIndex: number };
  "wave:cleared": { waveIndex: number };
  "entity:destroyed": { entity: number; type: string };
}

/** Creep that follows the path. */
export interface CreepComponent extends Component {
  type: "Creep";
  creepType: string;
  speed: number;
  baseSpeed: number;
  reward: number;
  waypointIndex: number;
  pathProgress: number;
  slowRemainingMs: number;
  slowFactor: number;
}

/** Tower placed on a buildable cell. */
export interface TowerComponent extends Component {
  type: "Tower";
  towerType: string;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  level: number;
  maxLevel: number;
  cost: number;
  cooldownRemaining: number;
  targetEntity: number | null;
  col: number;
  row: number;
}

/** Tag for tower projectiles. */
export interface TowerProjectileComponent extends Component {
  type: "TowerProjectile";
  targetEntity: number | null;
  speed: number;
  slowFactor?: number;
  slowDurationMs?: number;
}

/** Player / build controller. */
export interface PlayerComponent extends Component {
  type: "Player";
  selectedTowerType: string | null;
  selectedCell: { col: number; row: number } | null;
}

/** Input for build / sell / upgrade + cursor. */
export interface InputComponent extends Component {
  type: "Input";
  cursorX: number;
  cursorY: number;
  build: boolean;
  sell: boolean;
  upgrade: boolean;
  startWave: boolean;
  actions: Set<string>;
  axes: Record<string, number>;
}

/** Game phase state. */
export type TDPhase = "build" | "wave" | "intermission" | "game_over" | "victory";

export interface GameStateComponent extends Component {
  type: "GameState";
  phase: TDPhase;
  gold: number;
  lives: number;
  wave: number;
  score: number;
  intermissionRemaining: number;
  selectedTowerType: string | null;
}

export interface WaypointList {
  points: ReadonlyArray<{ x: number; y: number }>;
}

export interface TileGrid {
  cols: number;
  rows: number;
  tiles: TileType[][];
}

export type TowerCatalog = Record<string, TowerDefinition>;
export type CreepCatalog = Record<string, CreepDefinition>;
export type WaveDefinitions = WaveDefinition[];

export interface TowerDefenseComponentRegistry extends CoreComponentRegistry, MultiplayerRegistry {
  Input: InputComponent;
  Player: PlayerComponent;
  Creep: CreepComponent;
  Tower: TowerComponent;
  TowerProjectile: TowerProjectileComponent;
  GameState: GameStateComponent;
  Health: HealthComponent;
  Damage: DamageComponent;
  Faction: FactionComponent;
  SpawnDirector: SpawnDirectorComponent;
  WaveMember: WaveMemberComponent;
  Dying: { type: "Dying" };
  LocalPlayer: { type: "LocalPlayer" };
  RemotePlayer: { type: "RemotePlayer"; sessionId?: string };
}

export interface InputState {
  cursorX: number;
  cursorY: number;
  build: boolean;
  sell: boolean;
  upgrade: boolean;
  startWave: boolean;
  actions?: Set<string>;
  axes?: Record<string, number>;
  [key: string]: unknown;
}

export const INITIAL_GAME_STATE: GameStateComponent = {
  type: "GameState",
  phase: "build",
  gold: 150,
  lives: 20,
  wave: 0,
  score: 0,
  intermissionRemaining: 0,
  selectedTowerType: "basic",
};

export interface ThreatInfo {
  alive: number;
  remainingInWave: number;
  waveIndex: number;
}
