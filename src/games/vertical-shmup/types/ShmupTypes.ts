import { Component, CoreComponentRegistry, CoreEvents, MultiplayerRegistry, ComboComponent } from "@tiny-aster/core";
import { DamageComponent, FactionComponent, SpawnDirectorComponent, WaveMemberComponent, CombatHitEvent, CombatDeathEvent } from "@tiny-aster/gameplay-kit";
import type { BulletPatternConfig } from "../../shared/BulletPatternSystem";

export interface ShmupEventRegistry extends CoreEvents, Record<string, unknown> {
  "combat:hit": CombatHitEvent; "combat:death": CombatDeathEvent; "shmup:kill": { entity: number; score: number }; "shmup:wave_complete": { wave: number };
}
export interface ShmupInputState { axes: { moveX?: number; moveY?: number }; actions: Set<string>; }
export interface ShmupInputComponent extends Component { type:"Input"; axes:Record<string,number>; actions:Set<string>; shootCooldownRemaining:number; }
export interface ShmupPlayerComponent extends Component { type:"ShmupPlayer"; }
export interface ShmupEnemyComponent extends Component { type:"ShmupEnemy"; score:number; }
export interface ShmupPlayerBulletComponent extends Component { type:"ShmupPlayerBullet"; }
export interface ShmupEnemyBulletComponent extends Component { type:"ShmupEnemyBullet"; }
export interface EnemyPathComponent extends Component { type:"EnemyPath"; kind:"straight"|"sine"|"arc"; elapsed:number; duration:number; speed:number; amplitude:number; frequency:number; originX:number; originY:number; }
export interface BulletPatternComponent extends Component { type:"BulletPattern"; config:BulletPatternConfig; cooldownRemaining:number; phase:number; }
export interface ShmupGameStateComponent extends Component { type:"ShmupGameState"; score:number; wave:number; scrollDistance:number; isGameOver:boolean; spawnTimer:number; }
export interface ShmupComponentRegistry extends CoreComponentRegistry, MultiplayerRegistry {
  Input:ShmupInputComponent; ShmupPlayer:ShmupPlayerComponent; ShmupEnemy:ShmupEnemyComponent; ShmupPlayerBullet:ShmupPlayerBulletComponent; ShmupEnemyBullet:ShmupEnemyBulletComponent; EnemyPath:EnemyPathComponent; BulletPattern:BulletPatternComponent; ShmupGameState:ShmupGameStateComponent; Damage:DamageComponent; Faction:FactionComponent; SpawnDirector:SpawnDirectorComponent; WaveMember:WaveMemberComponent; Combo:ComboComponent; LocalPlayer:{type:"LocalPlayer"}; RemotePlayer:{type:"RemotePlayer";sessionId?:string};
}
