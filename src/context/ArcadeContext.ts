import { createContext } from 'react';
import type { ArcadeKernel, EventBus } from '@tiny-aster/core';

export interface ArcadeContextType {
  kernel: ArcadeKernel;
  eventBus: EventBus;
}

export const ArcadeContext = createContext<ArcadeContextType | null>(null);
