import React from 'react';
import { GameThemeContext } from './GameThemeContext';
import { getGameAccentColors } from '../theme/gameAccents';
import type { GameKey } from '../theme/gameAccents';

export function GameThemeProvider({
  gameKey,
  children,
}: {
  gameKey: GameKey;
  children: React.ReactNode;
}) {
  return (
    <GameThemeContext.Provider
      value={{
        gameKey,
        accentColors: getGameAccentColors(gameKey),
      }}
    >
      {children}
    </GameThemeContext.Provider>
  );
}
