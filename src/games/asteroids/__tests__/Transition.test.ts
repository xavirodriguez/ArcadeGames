import { EventBus, ArcadeKernel, ArcadeState } from '@tiny-aster/core';
import { getGameAccentColors } from '../../../theme/gameAccents';

describe('Arcade Transitions & Game Accents Integration', () => {
  let eventBus: EventBus;
  let kernel: ArcadeKernel;

  beforeEach(() => {
    eventBus = new EventBus();
    kernel = new ArcadeKernel(eventBus);
  });

  it('subscribes to arcade:state_changed and fires state change handlers', () => {
    let receivedData: any = null;
    const unsubscribe = eventBus.on('arcade:state_changed', (data: any) => {
      receivedData = data;
    });

    // Valid state flow: BOOT -> LOADING -> MENU -> PLAYING
    kernel.transitionTo(ArcadeState.LOADING);
    kernel.transitionTo(ArcadeState.MENU);
    kernel.transitionTo(ArcadeState.PLAYING);

    expect(receivedData).toEqual({
      from: ArcadeState.MENU,
      to: ArcadeState.PLAYING,
    });

    unsubscribe();
  });

  it('resolves accent colors from GAME_ACCENTS correctly for all games', () => {
    const asteroidsColors = getGameAccentColors('asteroids');
    expect(asteroidsColors.primary).toBe('#f97316');
    expect(asteroidsColors.secondary).toBe('#ffffff');
    expect(asteroidsColors.accent).toBe('#ef4444');

    const spaceInvadersColors = getGameAccentColors('space-invaders');
    expect(spaceInvadersColors.primary).toBe('#00ff66');

    const flappyBirdColors = getGameAccentColors('flappy-bird');
    expect(flappyBirdColors.primary).toBe('#ff0055');

    const pongColors = getGameAccentColors('pong');
    expect(pongColors.primary).toBe('#ffffff');
  });
});
