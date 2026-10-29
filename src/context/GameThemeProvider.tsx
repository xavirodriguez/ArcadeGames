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
import type { AestheticThemeConfig } from '../games/shared/rendering/sumi-e/AestheticTheme';
import type { PresentationThemeTokens } from '../games/shared/presentation/PresentationContracts';

export interface GameThemeProviderProps {
  gameKey?: GameKey;
  /** Optional visual configuration; omitted preserves the legacy game theme. */
  aestheticTheme?: AestheticThemeConfig | null;
  /** Tokens resolved by the active presentation session; omitted preserves legacy UI tokens. */
  presentationTokens?: PresentationThemeTokens<object> | null;
  initialHighContrast?: boolean;
  initialReduceMotion?: boolean;
  children: React.ReactNode;
}

export function GameThemeProvider({
  gameKey = 'campaign',
  aestheticTheme = null,
  presentationTokens = null,
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
      aestheticTheme,
      presentationTokens,
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
  }, [gameKey, aestheticTheme, presentationTokens, highContrast, reduceMotion]);

  return (
    <GameThemeContext.Provider value={contextValue}>
      {children}
    </GameThemeContext.Provider>
  );
}
