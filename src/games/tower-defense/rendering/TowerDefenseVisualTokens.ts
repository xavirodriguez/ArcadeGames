/**
 * Semantic role colours for Tower Defense entities and HUD.
 * Keeps registration fallbacks and concept-pack maps aligned.
 */
export const TOWER_DEFENSE_VISUAL_TOKENS = {
  creeps: {
    grunt: "#ff2d55",
    fast: "#4fc3f7",
    tank: "#94a3b8",
    boss: "#ef4444",
  },
  towers: {
    basic: "#fbbf24",
    sniper: "#a78bfa",
    rapid: "#34d399",
    frost: "#60a5fa",
  },
  projectile: "#f8fafc",
  roles: {
    creep_grunt: "#ff2d55",
    creep_fast: "#4fc3f7",
    creep_tank: "#94a3b8",
    creep_boss: "#ef4444",
    tower_basic: "#fbbf24",
    tower_sniper: "#a78bfa",
    tower_rapid: "#34d399",
    tower_frost: "#60a5fa",
  },
} as const;

export type TowerDefenseVisualTokens = typeof TOWER_DEFENSE_VISUAL_TOKENS;
