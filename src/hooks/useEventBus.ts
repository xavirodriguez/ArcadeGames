import { useContext } from 'react';
import type { EventBus } from '@tiny-aster/core';
import { ArcadeContext } from '../context/ArcadeContext';

/**
 * Access the EventBus from the current ArcadeContext or explicit override.
 */
export function useEventBus(overrideEventBus?: EventBus): EventBus {
  const ctx = useContext(ArcadeContext);
  const bus = overrideEventBus ?? ctx?.eventBus;
  if (!bus) {
    throw new Error(
      'useEventBus: No EventBus found in ArcadeContext or passed as override.'
    );
  }
  return bus;
}
