import { Component, CoreComponentRegistry, CoreEvents, MultiplayerRegistry, ComboComponent, CanonicalActionName } from "@tiny-aster/core";
import { DamageComponent, FactionComponent, SpawnDirectorComponent, WaveMemberComponent, CombatHitEvent, CombatDeathEvent } from "@tiny-aster/gameplay-kit";
import type { BulletPatternConfig } from "../../shared/BulletPatternSystem";
import type { BossPhase } from "../boss/bossPhase";

export interface ShmupEventRegistry extends CoreEvents, Record<string, unknown> {
  "combat:hit": CombatHitEvent;
  "combat:death": CombatDeathEvent;
  "shmup:kill": { entity: number; score: number };
  "shmup:wave_complete": { wave: number };
  "shmup:graze": { bullet: number; score: number };
  "shmup:bomb": { bulletsCleared: number; enemiesHit: number; bombsRemaining: number };
}
export interface ShmupInputState { axes: { moveX?: number; moveY?: number }; actions: readonly CanonicalActionName[]; }
export interface ShmupKeyboardInputState {
  moveX?: number;
  moveY?: number;
  moveLeft?: boolean;
  moveRight?: boolean;
  moveUp?: boolean;
  moveDown?: boolean;
  shoot?: boolean;
  bomb?: boolean;
}
export type ShmupInputUpdate = Partial<ShmupInputState> | ShmupKeyboardInputState;
export interface ShmupInputComponent extends Component { type:"Input"; axes:Record<string,number>; actions:readonly CanonicalActionName[]; shootCooldownRemaining:number; }
export interface ShmupPlayerComponent extends Component { type:"ShmupPlayer"; }
export type ShmupEnemyArchetype = "scout" | "interceptor" | "armored" | "support" | "boss";
export interface ShmupEnemyComponent extends Component { type:"ShmupEnemy"; score:number; archetype:ShmupEnemyArchetype; }
export interface ShmupPlayerBulletComponent extends Component { type:"ShmupPlayerBullet"; }
/** Per-projectile graze credit is serializable so rollback cannot duplicate it. */
export interface ShmupEnemyBulletComponent extends Component { type:"ShmupEnemyBullet"; grazed?:boolean; }
export interface EnemyPathComponent extends Component { type:"EnemyPath"; kind:"straight"|"sine"|"arc"|"hover"; elapsed:number; duration:number; speed:number; amplitude:number; frequency:number; originX:number; originY:number; /** Boss hover target altitude. */ hoverY?:number; /** Vertical bob amplitude while hovering. */ bobAmplitude?:number; /** Vertical bob angular frequency (rad/s). */ bobFrequency?:number; }
export interface BulletPatternComponent extends Component { type:"BulletPattern"; config:BulletPatternConfig; cooldownRemaining:number; phase:number; }
/** Current (monotonic) attack phase of a boss. Pure serializable state. */
export interface BossPhaseComponent extends Component { type:"BossPhase"; phase:BossPhase; }
export interface ShmupGameStateComponent extends Component {
  type:"ShmupGameState";
  score:number;
  wave:number;
  lives:number;
  scrollDistance:number;
  isGameOver:boolean;
  spawnTimer:number;
  /** Session graze credits (AUD-P2-01). */
  grazeCount?: number;
  /** Remaining bombs (AUD-P2-01). */
  bombsRemaining?: number;
}
export interface ShmupComponentRegistry extends CoreComponentRegistry {
  Input:ShmupInputComponent; ShmupPlayer:ShmupPlayerComponent; ShmupEnemy:ShmupEnemyComponent; ShmupPlayerBullet:ShmupPlayerBulletComponent; ShmupEnemyBullet:ShmupEnemyBulletComponent; EnemyPath:EnemyPathComponent; BulletPattern:BulletPatternComponent; BossPhase:BossPhaseComponent; ShmupGameState:ShmupGameStateComponent; Damage:DamageComponent; Faction:FactionComponent; SpawnDirector:SpawnDirectorComponent; WaveMember:WaveMemberComponent; Combo:ComboComponent; LocalPlayer:{type:"LocalPlayer"}; RemotePlayer:{type:"RemotePlayer";sessionId?:string};
}
