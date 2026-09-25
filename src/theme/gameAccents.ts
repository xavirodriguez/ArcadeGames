import { colors } from './colors';
import type { Theme, GameVisualProfile } from '@tiny-aster/core';

/**
 * Mapeo de paletas de juego a tokens de color existentes.
 *
 * IMPORTANTE: Todas las claves deben existir en colors.ts
 */
export const GAME_ACCENTS = {
  asteroids: {
    primary: 'orange' as const,      // #f97316
    secondary: 'white' as const,
    accent: 'red' as const,           // #ef4444
  },
  'space-invaders': {
    primary: 'green' as const,        // #00ff66
    secondary: 'yellow' as const,     // #fbbf24
    accent: 'magentaHot' as const,   // #ff0088
  },
  'flappy-bird': {
    primary: 'pink' as const,         // #ff0055
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
  campaign: {
    primary: 'cyan' as const,
    secondary: 'gold' as const,
    accent: 'green' as const,
  },
} as const;

export type GameKey = keyof typeof GAME_ACCENTS;

/**
 * Retorna valores RGB hexadecimales para los acentos de un juego.
 */
export function getGameAccentColors(game: GameKey) {
  const accentKeys = GAME_ACCENTS[game] ?? GAME_ACCENTS.campaign;
  return {
    primary: colors[accentKeys.primary],
    secondary: colors[accentKeys.secondary],
    accent: colors[accentKeys.accent],
  };
}

/**
 * Construye un objeto `Theme` usando los colores predeterminados de `GAME_ACCENTS[game]`
 * para poblar `colorMap`, permitiendo overrides opcionales.
 */
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
    campaign: {
      starDensity: 0.8,
      starSpeed: 0.8,
      ambientGlow: 0.5,
      particleShape: "circle",
      backgroundLayers: ["starfield", "drifting_nebula"],
    },
  };

  const defaultVfx = defaultVfxProfiles[game];

  const defaultColorMap: Record<string, string> = {
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
    lily_pad: accentColors.primary,
  };

  return {
    spriteMap: { ...customTheme?.spriteMap },
    colorMap: { ...defaultColorMap, ...customTheme?.colorMap },
    lore: { ...customTheme?.lore },
    vfxProfile: customTheme?.vfxProfile
      ? { ...defaultVfx, ...customTheme.vfxProfile }
      : defaultVfx,
  };
}
