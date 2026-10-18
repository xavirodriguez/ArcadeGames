import type {
  EnemyArchetypeDefinition,
  HitRunEnemyArchetypeId
} from "./HitRunWaveTypes";

/**
 * Catálogo data-driven de enemigos (fantasy belt).
 * behaviorTags impulsan FSM + flanqueo.
 * Colores alineados con dusk / emerald / bone / iron palette.
 */
export const HIT_RUN_ENEMY_ARCHETYPES: Record<
  string,
  EnemyArchetypeDefinition
> = {
  /** Goblin fodder — flanqueo en grupo. */
  popcorn: {
    id: "popcorn",
    poolId: "enemy_popcorn",
    health: 1,
    faction: "enemy",
    shape: "popcorn",
    size: 10,
    color: "#3d8b4f", // goblin green
    speed: 60,
    behaviorTags: ["walk", "shoot_slow", "flank"]
  },

  /** Orc wall — avanza en bloque. */
  wall: {
    id: "wall",
    poolId: "enemy_wall",
    health: 3,
    faction: "enemy",
    shape: "wall_trooper",
    size: 14,
    color: "#5c6b4a", // iron-moss orc
    speed: 40,
    behaviorTags: ["walk", "block"]
  },

  /** Wraith hopper. */
  hopper: {
    id: "hopper",
    poolId: "enemy_hopper",
    health: 2,
    faction: "enemy",
    shape: "hopper",
    size: 12,
    color: "#7c6bb0", // wraith violet
    speed: 80,
    behaviorTags: ["hop", "flank"]
  },

  /** Skeleton charger. */
  charger: {
    id: "charger",
    poolId: "enemy_charger",
    health: 2,
    faction: "enemy",
    shape: "charger",
    size: 14,
    color: "#c4b59a", // bone
    speed: 140,
    behaviorTags: ["charge"]
  },

  /** Citadel elite / warlock. */
  elite: {
    id: "elite",
    poolId: "enemy_elite",
    health: 12,
    faction: "enemy",
    shape: "elite",
    size: 22,
    color: "#c9a227", // cursed gold
    speed: 50,
    behaviorTags: ["shoot_heavy", "tank", "flank"]
  }
};

export function getEnemyArchetype(
  id: HitRunEnemyArchetypeId
): EnemyArchetypeDefinition | undefined {
  return HIT_RUN_ENEMY_ARCHETYPES[id];
}
