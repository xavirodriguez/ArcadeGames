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
import {
  getAestheticTheme,
  type AestheticId,
  type AestheticThemeOptions,
} from '../games/shared/rendering/sumi-e/AestheticTheme';

export interface GameThemeProviderProps {
  gameKey?: GameKey;
  /** Opt in to a visual theme without replacing the game's existing accent contract. */
  aesthetic?: AestheticId;
  /** Optional Sumi-e landscape and legacy palette variation. */
  aestheticOptions?: AestheticThemeOptions;
  initialHighContrast?: boolean;
  initialReduceMotion?: boolean;
  children: React.ReactNode;
}

export function GameThemeProvider({
  gameKey = 'campaign',
  aesthetic,
  aestheticOptions,
  initialHighContrast = false,
  initialReduceMotion = false,
  children,
}: GameThemeProviderProps) {
  const [highContrast, setHighContrast] = useState(initialHighContrast);
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);

  const aestheticLandscape = aestheticOptions?.landscape;
  const paletteVariant = aestheticOptions?.paletteVariant;

  const contextValue = useMemo(() => {
    const accentColors = getGameAccentColors(gameKey);
    const aestheticTheme = aesthetic === undefined
      ? null
      : getAestheticTheme(aesthetic, {
          landscape: aestheticLandscape,
          paletteVariant,
        });

    return {
      gameKey,
      accentColors,
      aestheticTheme,
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
  }, [
    gameKey,
    aesthetic,
    aestheticLandscape,
    paletteVariant,
    highContrast,
    reduceMotion,
  ]);

  return (
    <GameThemeContext.Provider value={contextValue}>
      {children}
    </GameThemeContext.Provider>
  );
}
