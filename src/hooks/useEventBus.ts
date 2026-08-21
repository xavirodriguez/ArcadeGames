import { useContext } from 'react';
import type { EventBus } from '@tiny-aster/core';
import { GameThemeContext } from '@/context/GameThemeContext';

/**
 * Access the EventBus from the current game context or direct game reference.
 */
export function useEventBus(game?: any | null): EventBus {
  const context = useContext(GameThemeContext);
  const bus = game?.getEventBus() ?? context?.eventBus ?? context?.game?.getEventBus();

  if (!bus) {
    throw new Error(
      'useEventBus: EventBus not found. Ensure a BaseGame instance or GameThemeProvider with EventBus is provided.'
    );
  }

  return bus;
}
