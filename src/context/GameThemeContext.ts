import { createContext, useContext } from 'react';
import type { GameKey } from '../theme/gameAccents';
import { colors, semanticColors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { effects } from '../theme/effects';
import { LAYER_ELEVATION } from '../theme/layers';

export interface ThemeTokens {
  colors: typeof colors;
  semantic: typeof semanticColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  effects: typeof effects;
  layers: typeof LAYER_ELEVATION;
}

export interface GameThemeContextType {
  gameKey: GameKey;
  accentColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  highContrast: boolean;
  reduceMotion: boolean;
  setHighContrast: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  tokens: ThemeTokens;
}

export const GameThemeContext = createContext<GameThemeContextType | null>(null);

const DEFAULT_GAME_THEME: GameThemeContextType = {
  gameKey: 'space-invaders',
  accentColors: {
    primary: colors.cyan,
    secondary: colors.pink,
    accent: colors.amber,
  },
  highContrast: false,
  reduceMotion: false,
  setHighContrast: () => {},
  setReduceMotion: () => {},
  tokens: {
    colors,
    semantic: semanticColors,
    typography,
    spacing,
    radius,
    effects,
    layers: LAYER_ELEVATION,
  },
};

/**
 * Access the active game theme context (accent colors, game key, accessibility flags, tokens).
 * Falls back to default ODISEA-7 theme tokens if called outside <GameThemeProvider>.
 */
export function useGameTheme(): GameThemeContextType {
  const ctx = useContext(GameThemeContext);
  return ctx ?? DEFAULT_GAME_THEME;
}

/**
 * Hook alias for accessing design system tokens and theme state.
 */
export function useTheme(): GameThemeContextType {
  return useGameTheme();
}
