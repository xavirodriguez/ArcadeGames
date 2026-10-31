import { colors } from "../../../theme/colors";

/**
 * Semantic role colours for Tower Defense entities and HUD.
 * Fallback groups retain current Canvas/Skia colours without duplicating literals in consumers.
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
  entityDefaults: {
    creep: "#ff2d55",
    tower: "cyan",
  },
  creepRendering: {
    slowed: { fill: "#5eead4", stroke: "#99f6e4" },
    grunt: { fill: "#ff8a3d", stroke: "#ffe566" },
    fast: { fill: "#4fc3f7", stroke: "#e0f7fa" },
    tank: { fill: "#94a3b8", stroke: "#f1f5f9", plate: "#5d4037" },
    boss: { fill: "#ef4444", stroke: "#fecaca", innerStroke: "#f9a8d4" },
  },
  towerRendering: {
    canvas: {
      basic: { primary: "#4fc3f7", accent: "#81d4fa" },
      sniper: { primary: "#ab47bc", accent: "#ce93d8" },
      rapid: { primary: "#66bb6a", accent: "#a5d6a7" },
      frost: { primary: "#4dd0e1", accent: "#b2ebf2" },
    },
    skia: {
      basic: { primary: colors.cyan, accent: colors.blueLight },
      sniper: { primary: colors.purple, accent: colors.violet },
      rapid: { primary: colors.green, accent: colors.primary },
      frost: { primary: colors.cyan, accent: colors.tertiary },
    },
    weapon: {
      sniper: colors.violet,
      rapid: colors.green,
      basic: colors.blueLight,
      frost: "#e0f7fa",
      projectileFrost: colors.cyan,
      projectile: colors.yellow,
    },
  },
  mapLandmarks: {
    spawn: "#ef5350",
    base: "#43a047",
  },
  tiles: {
    path: "#2a2a4a",
    buildable: "#16213e",
    spawn: "#3d1a1a",
    base: "#1a3d1a",
    blocked: "#0a0a12",
    default: "#0f0f1a",
  },
  ink: {
    paperDusk: "#14161B",
    darkOutline: "#101827",
  },
} as const;

export type TowerDefenseVisualTokens = typeof TOWER_DEFENSE_VISUAL_TOKENS;
