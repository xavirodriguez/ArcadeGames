import React from 'react';
import { ArcadeKernel, ArcadeState, EventBus } from '@tiny-aster/core';
import { useGameTheme } from '../../../context/GameThemeContext';
import { useEventBus } from '../../../hooks/useEventBus';
import { useArcadeKernel } from '../../../hooks/useArcadeKernel';
import { GAME_ACCENTS, getGameAccentColors } from '../../../theme/gameAccents';

describe('Aesthetic Improvements Infrastructure Tests', () => {
  it('correctly retrieves accent colors for mapped games', () => {
    const asteroidsAccents = getGameAccentColors('asteroids');
    expect(asteroidsAccents.primary).toBe('#f97316');
    expect(asteroidsAccents.secondary).toBe('#ffffff');
    expect(asteroidsAccents.accent).toBe('#ef4444');

    const spaceInvadersAccents = getGameAccentColors('space-invaders');
    expect(spaceInvadersAccents.primary).toBe('#00ff66');
    expect(spaceInvadersAccents.secondary).toBe('#fbbf24');
    expect(spaceInvadersAccents.accent).toBe('#ff0088');
  });

  it('subscribes and handles kernel state transition events', () => {
    const eventBus = new EventBus();
    const kernel = new ArcadeKernel(eventBus);
    const listener = jest.fn();

    const unsubscribe = eventBus.on('arcade:state_changed', listener);

    kernel.transitionTo(ArcadeState.LOADING);
    kernel.transitionTo(ArcadeState.MENU);
    kernel.transitionTo(ArcadeState.PLAYING);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: ArcadeState.MENU,
        to: ArcadeState.PLAYING,
      }),
      'arcade:state_changed'
    );

    unsubscribe();
  });
});
