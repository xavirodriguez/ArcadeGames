/**
 * Identificador de arquetipo de enemigo (mapa a pool / blueprint).
 */
export type HitRunEnemyArchetypeId =
  | "popcorn"
  | "wall"
  | "hopper"
  | "charger"
  | "elite"
  | "samurai"
  | string;

/** Formación espacial al spawnear un grupo. */
export type WaveFormation =
  | "point"
  | "line"
  | "column"
  | "wall"
  | "scatter"
  | "drop";

/** Un evento de la timeline. */
export interface WaveEvent {
  /** Tiempo en segundos desde el inicio del script. */
  t: number;
  /** Arquetipo de enemigo. */
  type: HitRunEnemyArchetypeId;
  /** Cantidad a spawnear (default 1). */
  count?: number;
  /** Formación del grupo. */
  formation?: WaveFormation;
  /** Origen X (world). */
  x?: number;
  /** Origen Y (world). */
  y?: number;
  /** Intervalo entre spawns individuales del mismo evento (s). */
  interval?: number;
  /** Espaciado entre unidades en formaciones line/wall/column (px). */
  spacing?: number;
  /** Tags libres para el spawner. */
  tags?: string[];
}

/** Script completo de oleada (array ordenado por t). */
export interface WaveScript {
  id: string;
  name?: string;
  events: WaveEvent[];
  loop?: boolean;
  loopDelay?: number;
}

/** Estado mutable del director (resource del world). */
export interface WaveDirectorState {
  type: "WaveDirectorState";
  scriptId: string;
  elapsed: number;
  nextEventIndex: number;
  active: boolean;
  pendingStaggers: PendingStagger[];
  totalSpawned: number;
  totalKilled?: number;
  telegraphedKeys?: string[];
  lastClearEventIndex?: number;
  waveDoneTimer?: number;
  lastScriptId?: string;
}

export interface PendingStagger {
  eventIndex: number;
  remaining: number;
  nextSpawnAt: number;
  spawned: number;
  type: HitRunEnemyArchetypeId;
  formation: WaveFormation;
  baseX: number;
  baseY: number;
  spacing: number;
  interval: number;
  count: number;
  tags?: string[];
}

/** Definición data-driven de un arquetipo de enemigo. */
export interface EnemyArchetypeDefinition {
  id: HitRunEnemyArchetypeId;
  poolId: string;
  health: number;
  faction: string;
  shape: string;
  size: number;
  color: string;
  speed?: number;
  behaviorTags?: string[];
}

/** Parámetros al adquirir del pool de enemigos. */
export interface HitRunEnemySpawnParams {
  x: number;
  y: number;
  archetypeId: HitRunEnemyArchetypeId;
  tags?: string[];
  indexInGroup?: number;
  groupSize?: number;
}

/** Contrato mínimo del pool de enemigos. */
export interface IHitRunEnemyPool {
  acquireEnemy(world: unknown, params: HitRunEnemySpawnParams): number;
  prewarm?(world: unknown, count?: number): void;
  releaseEnemy?(world: unknown, entity: number): void;
}

export const WAVE_DIRECTOR_RESOURCE = "WaveDirectorState";
export const WAVE_SCRIPT_RESOURCE = "WaveScript";
export const ENEMY_POOL_RESOURCE = "HitRunEnemyPool";
