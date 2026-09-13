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

/**
 * Access the active game theme context (accent colors, game key, accessibility flags, tokens).
 */
export function useGameTheme(): GameThemeContextType {
  const ctx = useContext(GameThemeContext);
  if (!ctx) {
    throw new Error('useGameTheme debe estar dentro de <GameThemeProvider>');
  }
  return ctx;
}

/**
 * Hook alias for accessing design system tokens and theme state.
 */
export function useTheme(): GameThemeContextType {
  return useGameTheme();
}
