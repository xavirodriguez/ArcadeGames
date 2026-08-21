import { createContext, useContext } from 'react';
import type { GameKey } from '../theme/gameAccents';

export interface GameThemeContextType {
  gameKey: GameKey;
  accentColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const GameThemeContext = createContext<GameThemeContextType | null>(null);

export function useGameTheme(): GameThemeContextType {
  const ctx = useContext(GameThemeContext);
  if (!ctx) {
    throw new Error('useGameTheme debe estar dentro de <GameThemeProvider>');
  }
  return ctx;
}
