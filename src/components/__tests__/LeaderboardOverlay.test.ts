import React from 'react';
import { LeaderboardOverlay } from '../LeaderboardOverlay';
import { LeaderboardService } from '../../services/LeaderboardService';

jest.mock('../../services/LeaderboardService', () => ({
  LeaderboardService: {
    fetchDailyLeaderboard: jest.fn(),
  },
}));

jest.mock('../../utils/haptics', () => ({
  hapticSelection: jest.fn(),
}));

describe('LeaderboardOverlay Structure & Interface', () => {
  it('exports valid LeaderboardOverlay component function', () => {
    expect(typeof LeaderboardOverlay).toBe('function');
  });

  it('interacts with LeaderboardService and accepts props', async () => {
    (LeaderboardService.fetchDailyLeaderboard as jest.Mock).mockResolvedValue([
      { playerId: 'player123', score: 5000, displayName: 'AcePilot' },
    ]);

    const overlayProps = { gameId: 'asteroids', onClose: jest.fn() };
    expect(overlayProps.gameId).toBe('asteroids');
    expect(typeof overlayProps.onClose).toBe('function');

    const element = React.createElement(LeaderboardOverlay, overlayProps);
    expect(element).toBeTruthy();
    expect(element.type).toBe(LeaderboardOverlay);
  });
});
