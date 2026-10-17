import { colors, semanticColors } from './colors';
import type { Theme, GameVisualProfile, ThemeEffects } from '@tiny-aster/core';
import { createVisualTheme, VisualTheme } from './VisualTheme';

/**
 * Mapeo de paletas de juego a tokens de color existentes.
 *
 * IMPORTANTE: Todas las claves deben existir en colors.ts
 */
export const GAME_ACCENTS = {
  asteroids: {
    primary: 'orange' as const,
    secondary: 'white' as const,
    accent: 'red' as const,
  },
  'space-invaders': {
    primary: 'green' as const,
    secondary: 'yellow' as const,
    accent: 'magentaHot' as const,
  },
  'flappy-bird': {
    primary: 'pink' as const,
    secondary: 'cyan' as const,
    accent: 'gold' as const,
  },
  pong: {
    primary: 'white' as const,
    secondary: 'green' as const,
    accent: 'magentaHot' as const,
  },
  platformer: {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'pink' as const,
  },
  echorunner: {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'pink' as const,
  },
  hitandrun: {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'pink' as const,
  },
  geometrywars: {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'pink' as const,
  },
  arkanoid: {
    primary: 'cyan' as const,
    secondary: 'yellow' as const,
    accent: 'pink' as const,
  },
  frogger: {
    primary: 'green' as const,
    secondary: 'cyan' as const,
    accent: 'pink' as const,
  },
  racing: {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'pink' as const,
  },
  outrun: {
    primary: 'cyan' as const,
    secondary: 'magentaHot' as const,
    accent: 'pink' as const,
  },
  'vertical-shmup': {
    primary: 'cyan' as const,
    secondary: 'purple' as const,
    accent: 'pink' as const,
  },
  campaign: {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'green' as const,
  },
  'tower-defense': {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'orange' as const,
  },
} as const;

export type GameKey = keyof typeof GAME_ACCENTS;

export function getGameAccentColors(game: GameKey) {
  const accentKeys = GAME_ACCENTS[game] ?? GAME_ACCENTS.campaign;
  return {
    primary: colors[accentKeys.primary],
    secondary: colors[accentKeys.secondary],
    accent: colors[accentKeys.accent],
  };
}

export function createThemeFromGameAccents(game: GameKey, customTheme?: Partial<Theme>): Theme {
  const accentColors = getGameAccentColors(game);

  const defaultVfxProfiles: Partial<Record<GameKey, GameVisualProfile>> = {
    pong: {
      starDensity: 0.2,
      starSpeed: 0.0,
      ambientGlow: 0.2,
      particleShape: "circle",
      backgroundLayers: ["starfield"],
    },
    asteroids: {
      starDensity: 1.0,
      starSpeed: 1.0,
      ambientGlow: 0.4,
      particleShape: "shard",
      backgroundLayers: ["starfield", "distant_asteroid_belt"],
    },
    'space-invaders': {
      starDensity: 0.8,
      starSpeed: 0.2,
      ambientGlow: 0.3,
      particleShape: "polygon",
      backgroundLayers: ["starfield", "distant_space_station"],
    },
    geometrywars: {
      starDensity: 0.1,
      starSpeed: 0.1,
      ambientGlow: 0.1,
      particleShape: "polygon",
      backgroundLayers: ["diffuse_milky_way"],
    },
    'flappy-bird': {
      starDensity: 0.8,
      starSpeed: 1.5,
      ambientGlow: 0.5,
      planetProfile: "purple",
      particleShape: "circle",
      backgroundLayers: ["starfield", "drifting_nebula", "ringing_planet"],
    },
    platformer: {
      starDensity: 0.8,
      starSpeed: 0.4,
      ambientGlow: 0.4,
      particleShape: "circle",
      backgroundLayers: ["starfield", "distant_space_station"],
    },
    echorunner: {
      starDensity: 0.8,
      starSpeed: 0.4,
      ambientGlow: 0.4,
      particleShape: "shard",
      backgroundLayers: ["echo_bg", "grid", "data_pillars"],
    },
    hitandrun: {
      starDensity: 0.8,
      starSpeed: 0.4,
      ambientGlow: 0.4,
      particleShape: "shard",
      backgroundLayers: ["hit_run_procedural_backdrop"],
    },
    arkanoid: {
      starDensity: 0.5,
      starSpeed: 0.2,
      ambientGlow: 0.3,
      particleShape: "circle",
      backgroundLayers: ["starfield"],
    },
    frogger: {
      starDensity: 0.3,
      starSpeed: 0.1,
      ambientGlow: 0.2,
      particleShape: "circle",
      backgroundLayers: ["starfield"],
    },
    racing: {
      starDensity: 0.1,
      starSpeed: 0.0,
      ambientGlow: 0.3,
      particleShape: "circle",
      backgroundLayers: [],
    },
    outrun: {
      starDensity: 0.1,
      starSpeed: 0.0,
      ambientGlow: 0.3,
      particleShape: "circle",
      backgroundLayers: [],
    },
    campaign: {
      starDensity: 0.8,
      starSpeed: 0.8,
      ambientGlow: 0.5,
      particleShape: "circle",
      backgroundLayers: ["starfield", "drifting_nebula"],
    },
  };

  const defaultVfx = defaultVfxProfiles[game];

  const defaultEffects: ThemeEffects = {
    scanlineColor: "rgba(0, 0, 0, 0.15)",
    scanlineSpacing: 2,
    vignetteInnerColor: "rgba(0, 0, 0, 0)",
    vignetteOuterColor: "rgba(0, 0, 0, 0.75)",
    ambientGlow: defaultVfx?.ambientGlow ?? 0.3,
  };

  const defaultColorMap: Record<string, string> = {
    // System & HUD
    system: semanticColors.system,
    warning: semanticColors.warning,
    success: semanticColors.success,
    danger: semanticColors.danger,

    // Entities
    primary: accentColors.primary,
    secondary: accentColors.secondary,
    accent: accentColors.accent,
    player: accentColors.primary,
    "player-ship": accentColors.primary,
    bullet: accentColors.secondary,
    "player-bullet": accentColors.secondary,
    enemy: accentColors.accent,
    asteroid: accentColors.accent,
    "small-asteroid": accentColors.accent,
    "medium-asteroid": accentColors.accent,
    "large-asteroid": accentColors.accent,
    boss: accentColors.accent,
    shield: accentColors.primary,
    ball: accentColors.primary,
    paddle: accentColors.primary,
    left: accentColors.primary,
    right: accentColors.primary,
    bird: accentColors.primary,
    pipe: accentColors.accent,
    ground: accentColors.secondary,
    invader_commander: accentColors.accent,
    invader_scout: accentColors.secondary,
    commander: accentColors.accent,
    scout: accentColors.secondary,
    brick: accentColors.accent,
    frogger: accentColors.primary,
    car: accentColors.secondary,
    truck: accentColors.accent,
    log: accentColors.secondary,
    turtle: accentColors.secondary,
    "track-wall": accentColors.accent,

    // Environment & Post-FX
    road: "#121218",
    sky_top: "#000005",
    sky_bottom: "#0a0e27",
    terrain: "#0f172a",
    horizon: "#00f0ff",
    grid: "rgba(0, 240, 255, 0.15)",
    vignette: "rgba(0, 0, 0, 0.75)",
    scanline: "rgba(0, 0, 0, 0.15)",
    glow: "rgba(0, 240, 255, 0.25)",
    ambient: "rgba(10, 14, 39, 0.5)",

    // Frogger role tokens
    home_slot: "#00AA44",
    home_slot_occupied: "#39FF14",
    water: "#051C33",
    water_grid: "rgba(0, 243, 255, 0.15)",
    frogger_grass: "#0B2B16",
    frogger_road: "#121218",

    // Tower Defense role tokens
    tower_basic: "#4fc3f7",
    tower_basic_accent: "#81d4fa",
    tower_sniper: "#ab47bc",
    tower_sniper_accent: "#ce93d8",
    tower_rapid: "#66bb6a",
    tower_rapid_accent: "#a5d6a7",
    tower_frost: "#4dd0e1",
    tower_frost_accent: "#b2ebf2",
    tower_base_bg: "#1a2332",
    creep_grunt: "#ff7043",
    creep_grunt_stroke: "#ffab91",
    creep_fast: "#29b6f6",
    creep_fast_stroke: "#81d4fa",
    creep_tank: "#8d6e63",
    creep_tank_stroke: "#bcaaa4",
    creep_boss: "#c62828",
    creep_boss_stroke: "#ef9a9a",
    creep_slowed: "#80deea",
    creep_slowed_stroke: "#e0f7fa",
    tower_projectile: "#ffee58",
    tower_projectile_frost: "#4dd0e1",

    // Platformer role tokens
    goal: "#fbbf24",
    tile_slate: "#1e293b",
    tile_border: "#334155",
    tile_cyan: "#00f0ff",
    tile_gold: "#fbbf24",
    tile_danger: "#ef4444",

    // Outrun role tokens
    outrun_car: "#e63946",
    outrun_hud_bg: "rgba(15, 23, 42, 0.85)",
    outrun_hud_accent: "#00f0ff",
    outrun_grass_light: "#10b981",
    outrun_grass_dark: "#047857",
    outrun_rumble_white: "#f8fafc",
    outrun_rumble_red: "#ef4444",
    outrun_lane: "#f8fafc",
    outrun_road_dark: "#334155",
    outrun_road_light: "#475569",

    // Hit & Run role tokens
    hitrun_pavement: "#1e293b",
    hitrun_lane: "#334155",
    hitrun_shoulder: "#0f172a",
    hitrun_building_a: "#0f172a",
    hitrun_building_b: "#1e293b",
    hitrun_window_glow: "#00f0ff",

    // Racing role tokens
    racing_asphalt: "#1e293b",
    racing_grass: "#065f46",
    racing_kerb_red: "#ef4444",
    racing_kerb_white: "#f8fafc",
    racing_line: "#f8fafc",

    // Echo Runner "The Archive" role tokens
    restorationCyan: "#00f0ff",
    restorationCyanGlow: "rgba(0, 240, 255, 0.4)",
    restorationCyanFade: "rgba(0, 240, 255, 0.08)",
    restorationGold: "#fbbf24",
    restorationGoldGlow: "rgba(251, 191, 36, 0.5)",
    restorationWhite: "#ffffff",
    corruptionCrimson: "#ff0055",
    corruptionCrimsonGlow: "rgba(255, 0, 85, 0.4)",
    corruptionAmber: "#f97316",
    corruptionPurple: "#a855f7",
    corruptionPurpleGlow: "rgba(168, 85, 247, 0.4)",
    archiveVoidDark: "#060913",
    archiveSlate: "#1e293b",
    archiveBorderDark: "#0f172a",
    archiveBorderLight: "#334155",
    archiveGridLine: "rgba(0, 240, 255, 0.05)",
    archiveGridLineSecondary: "rgba(168, 85, 247, 0.03)",
    archiveDataStream: "rgba(255, 0, 85, 0.06)",
    archiveNodeActive: "#10b981",
    archiveNodeInactive: "#ef4444",
    sentinel: "#a855f7",
    hopper: "#10b981",
    watcher: "#3b82f6",
    charger: "#ff0055",
    fragment: "#00f0ff",
    core: "#fbbf24",
    node: "#10b981",
  };

  const visualTheme: VisualTheme = createVisualTheme(
    accentColors.primary,
    accentColors.secondary,
    accentColors.accent,
    { particleShape: defaultVfx?.particleShape }
  );

  return {
    spriteMap: { ...customTheme?.spriteMap },
    colorMap: { ...defaultColorMap, ...customTheme?.colorMap },
    effects: { ...defaultEffects, ...customTheme?.effects },
    lore: { ...customTheme?.lore },
    vfxProfile: customTheme?.vfxProfile
      ? { ...defaultVfx, ...customTheme.vfxProfile }
      : defaultVfx,
    visualTheme: customTheme?.visualTheme ?? visualTheme,
  };
}
