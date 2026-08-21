import { createContext, useContext } from 'react';
import type { GameKey } from '@/theme/gameAccents';
import type { EventBus, ArcadeKernel } from '@tiny-aster/core';

export interface GameThemeContextType {
  gameKey: GameKey;
  accentColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  game?: any | null;
  eventBus?: EventBus | null;
  kernel?: ArcadeKernel | null;
}

export const GameThemeContext = createContext<GameThemeContextType | null>(null);

export function useGameTheme(): GameThemeContextType {
  const ctx = useContext(GameThemeContext);
  if (!ctx) {
    throw new Error('useGameTheme debe estar dentro de <GameThemeProvider>');
  }
  return ctx;
}
