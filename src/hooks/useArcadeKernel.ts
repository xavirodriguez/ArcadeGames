import { useContext } from 'react';
import type { ArcadeKernel } from '@tiny-aster/core';
import { ArcadeContext } from '../context/ArcadeContext';

/**
 * Access the ArcadeKernel from the current ArcadeContext or explicit override.
 */
export function useArcadeKernel(overrideKernel?: ArcadeKernel): ArcadeKernel {
  const ctx = useContext(ArcadeContext);
  const kernel = overrideKernel ?? ctx?.kernel;
  if (!kernel) {
    throw new Error(
      'useArcadeKernel: No ArcadeKernel found in ArcadeContext or passed as override.'
    );
  }
  return kernel;
}
