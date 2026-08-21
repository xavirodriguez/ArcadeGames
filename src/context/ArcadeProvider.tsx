import React from 'react';
import type { ArcadeKernel, EventBus } from '@tiny-aster/core';
import { ArcadeContext } from './ArcadeContext';

interface ArcadeProviderProps {
  kernel: ArcadeKernel;
  eventBus: EventBus;
  children: React.ReactNode;
}

export function ArcadeProvider({ kernel, eventBus, children }: ArcadeProviderProps) {
  return (
    <ArcadeContext.Provider value={{ kernel, eventBus }}>
      {children}
    </ArcadeContext.Provider>
  );
}
