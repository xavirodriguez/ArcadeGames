import type {
  EnemyArchetypeDefinition,
  HitRunEnemyArchetypeId
} from "./HitRunWaveTypes";

/**
 * Catálogo data-driven de enemigos.
 * Añadir un tipo nuevo = una entrada aquí + (opcional) blueprint visual.
 */
export const HIT_RUN_ENEMY_ARCHETYPES: Record<
  string,
  EnemyArchetypeDefinition
> = {
  /** Carne de cañón — spawns densos, poca vida. */
  popcorn: {
    id: "popcorn",
    poolId: "enemy_popcorn",
    health: 1,
    faction: "enemy",
    shape: "popcorn",
    size: 10,
    color: "#f97316",
    speed: 60,
    behaviorTags: ["walk", "shoot_slow"]
  },

  /** Bloque denso tipo "muro" de Metal Slug. */
  wall: {
    id: "wall",
    poolId: "enemy_wall",
    health: 3,
    faction: "enemy",
    shape: "wall_trooper",
    size: 14,
    color: "#78716c",
    speed: 40,
    behaviorTags: ["walk", "block"]
  },

  /** Salta plataformas. */
  hopper: {
    id: "hopper",
    poolId: "enemy_hopper",
    health: 2,
    faction: "enemy",
    shape: "hopper",
    size: 12,
    color: "#a855f7",
    speed: 80,
    behaviorTags: ["hop"]
  },

  /** Carga hacia el jugador. */
  charger: {
    id: "charger",
    poolId: "enemy_charger",
    health: 2,
    faction: "enemy",
    shape: "charger",
    size: 14,
    color: "#ef4444",
    speed: 140,
    behaviorTags: ["charge"]
  },

  /** Mini-boss / elite de oleada. */
  elite: {
    id: "elite",
    poolId: "enemy_elite",
    health: 12,
    faction: "enemy",
    shape: "elite",
    size: 22,
    color: "#eab308",
    speed: 50,
    behaviorTags: ["shoot_heavy", "tank"]
  }
};

export function getEnemyArchetype(
  id: HitRunEnemyArchetypeId
): EnemyArchetypeDefinition | undefined {
  return HIT_RUN_ENEMY_ARCHETYPES[id];
}
