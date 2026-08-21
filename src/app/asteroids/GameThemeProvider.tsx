import React from 'react';
import { GameThemeContext } from '@/context/GameThemeContext';
import { getGameAccentColors } from '@/theme/gameAccents';
import type { GameKey } from '@/theme/gameAccents';
import type { EventBus, ArcadeKernel } from '@tiny-aster/core';

export interface GameThemeProviderProps {
  gameKey: GameKey;
  game?: any | null;
  eventBus?: EventBus | null;
  kernel?: ArcadeKernel | null;
  children: React.ReactNode;
}

export function GameThemeProvider({
  gameKey,
  game,
  eventBus,
  kernel,
  children
}: GameThemeProviderProps) {
  const accentColors = getGameAccentColors(gameKey);

  return (
    <GameThemeContext.Provider
      value={{
        gameKey,
        accentColors,
        game,
        eventBus: eventBus ?? game?.getEventBus(),
        kernel: kernel ?? game?.kernel,
      }}
    >
      {children}
    </GameThemeContext.Provider>
  );
}
