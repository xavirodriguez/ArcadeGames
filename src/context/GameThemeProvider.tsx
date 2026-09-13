import React, { useState, useMemo } from 'react';
import { GameThemeContext } from './GameThemeContext';
import { getGameAccentColors } from '../theme/gameAccents';
import type { GameKey } from '../theme/gameAccents';
import { colors, semanticColors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { effects } from '../theme/effects';
import { LAYER_ELEVATION } from '../theme/layers';

export interface GameThemeProviderProps {
  gameKey?: GameKey;
  initialHighContrast?: boolean;
  initialReduceMotion?: boolean;
  children: React.ReactNode;
}

export function GameThemeProvider({
  gameKey = 'campaign',
  initialHighContrast = false,
  initialReduceMotion = false,
  children,
}: GameThemeProviderProps) {
  const [highContrast, setHighContrast] = useState(initialHighContrast);
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);

  const contextValue = useMemo(() => {
    const accentColors = getGameAccentColors(gameKey);
    return {
      gameKey,
      accentColors,
      highContrast,
      reduceMotion,
      setHighContrast,
      setReduceMotion,
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
  }, [gameKey, highContrast, reduceMotion]);

  return (
    <GameThemeContext.Provider value={contextValue}>
      {children}
    </GameThemeContext.Provider>
  );
}
