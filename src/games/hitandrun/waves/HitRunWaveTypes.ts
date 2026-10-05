/**
 * Tipos del director de oleadas de Hit&Run.
 * Scripts 100% declarativos (JSON-serializables).
 */

/** Identificador de arquetipo de enemigo (mapa a pool / blueprint). */
export type HitRunEnemyArchetypeId =
  | "popcorn"
  | "wall"
  | "hopper"
  | "charger"
  | "elite"
  | string;

/** Formación espacial al spawnear un grupo. */
export type WaveFormation =
  | "point"      // todos en (x,y) o spawn por defecto
  | "line"       // fila horizontal
  | "column"     // columna vertical
  | "wall"       // muro denso horizontal (tensión)
  | "scatter"    // rejilla con jitter determinista
  | "drop";      // caen desde arriba en X repartidas

/**
 * Un evento de la timeline.
 * Ejemplo JSON: `{ "t": 5, "type": "popcorn", "count": 6, "formation": "line" }`
 */
export interface WaveEvent {
  /** Tiempo en segundos desde el inicio del script (o X de disparo si triggerByX es true). */
  t: number;
  /** Si es true, `t` representa la coordenada X de la cámara a la que se activa la oleada. */
  triggerByX?: boolean;
  /** Si es true, esta oleada bloquea el avance de la cámara hasta que todos los enemigos sean destruidos. */
  gateCamera?: boolean;
  /** Arquetipo de enemigo. */
  type: HitRunEnemyArchetypeId;
  /** Cantidad a spawnear (default 1). */
  count?: number;
  /** Formación del grupo. */
  formation?: WaveFormation;
  /** Origen X (world). Si se omite, usa defaultSpawn del director. */
  x?: number;
  /** Origen Y (world). */
  y?: number;
  /**
   * Intervalo entre spawns individuales del mismo evento (s).
   * Si > 0, el count se reparte en el tiempo (stagger).
   */
  interval?: number;
  /** Espaciado entre unidades en formaciones line/wall/column (px). */
  spacing?: number;
  /** Tags libres para el spawner (patrol, kamikaze, …). */
  tags?: string[];
}

/** Script completo de oleada (array ordenado por t). */
export interface WaveScript {
  id: string;
  /** Nombre legible (debug / UI). */
  name?: string;
  events: WaveEvent[];
  /** Si true, al terminar reinicia elapsed (modo endless). */
  loop?: boolean;
  /** Delay tras el último evento antes de loop (s). */
  loopDelay?: number;
}

/** Estado mutable del director (resource del world). */
export interface WaveDirectorState {
  type: "WaveDirectorState";
  scriptId: string;
  /** Tiempo acumulado de la oleada actual (s). */
  elapsed: number;
  /** Índice del próximo WaveEvent a disparar. */
  nextEventIndex: number;
  /** true mientras el director está activo. */
  active: boolean;
  /** Eventos en curso con stagger (interval > 0). */
  pendingStaggers: PendingStagger[];
  /** Contador de enemigos spawneados en esta run (métricas). */
  totalSpawned: number;
}

export interface PendingStagger {
  eventIndex: number;
  remaining: number;
  nextSpawnAt: number;
  spawned: number;
  /** Copia de los campos de spawn del evento. */
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
  /** Clave de pool / blueprint. */
  poolId: string;
  /** Health por defecto. */
  health: number;
  /** Faction. */
  faction: string;
  /** Shape de render. */
  shape: string;
  /** Tamaño collider/visual. */
  size: number;
  color: string;
  /** Velocidad base (si el AI la lee). */
  speed?: number;
  /** Tags de comportamiento para StateMachine / AI. */
  behaviorTags?: string[];
}

/** Parámetros al adquirir del pool de enemigos. */
export interface HitRunEnemySpawnParams {
  x: number;
  y: number;
  archetypeId: HitRunEnemyArchetypeId;
  tags?: string[];
  /** Índice dentro del grupo (para formaciones). */
  indexInGroup?: number;
  groupSize?: number;
}

/** Contrato mínimo del pool de enemigos. */
export interface IHitRunEnemyPool {
  acquireEnemy(world: unknown, params: HitRunEnemySpawnParams): number;
}

/** Resource key del director. */
export const WAVE_DIRECTOR_RESOURCE = "WaveDirectorState";
/** Resource key del script activo. */
export const WAVE_SCRIPT_RESOURCE = "WaveScript";
/** Resource key del pool de enemigos. */
export const ENEMY_POOL_RESOURCE = "HitRunEnemyPool";
