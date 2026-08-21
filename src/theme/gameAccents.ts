import { colors } from './colors';

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
} as const;

export type GameKey = keyof typeof GAME_ACCENTS;

/**
 * Retorna valores RGB hexadecimales para los acentos de un juego.
 */
export function getGameAccentColors(game: GameKey) {
  const accentKeys = GAME_ACCENTS[game];
  return {
    primary: colors[accentKeys.primary],
    secondary: colors[accentKeys.secondary],
    accent: colors[accentKeys.accent],
  };
}
