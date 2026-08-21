import { useContext } from 'react';
import type { ArcadeKernel } from '@tiny-aster/core';
import { GameThemeContext } from '@/context/GameThemeContext';

/**
 * Access the ArcadeKernel from the current game context or direct game reference.
 */
export function useArcadeKernel(game?: any | null): ArcadeKernel {
  const context = useContext(GameThemeContext);
  const kernel = game?.kernel ?? context?.kernel ?? context?.game?.kernel;

  if (!kernel) {
    throw new Error(
      'useArcadeKernel: ArcadeKernel not found. Ensure a BaseGame instance or GameThemeProvider with ArcadeKernel is provided.'
    );
  }

  return kernel;
}
