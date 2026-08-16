import React from 'react';
import { PassportOverlay } from '../PassportOverlay';
import { PlayerProfile } from '../../services/PlayerProfileService';

jest.mock('../../utils/haptics', () => ({
  hapticSelection: jest.fn(),
}));

jest.mock('@tiny-aster/react-native', () => ({
  useGameServices: () => ({
    isMuted: false,
    setMuted: jest.fn(),
  }),
}));

describe('PassportOverlay Structure & Interface', () => {
  const sampleProfile: PlayerProfile = {
    playerId: '123e4567-e89b-12d3-a456-426614174000',
    displayName: 'TestPilot',
    level: 3,
    xp: 450,
    unlockedPalettes: ['default', 'neon'],
    activePalette: 'default',
    unlockedTrails: ['default'],
    activeTrail: 'default',
    stats: {
      asteroidsDestroyed: 42,
      pipesPassed: 15,
      siKills: 120,
      pongSetsWon: 5,
      totalPlaytimeTicks: 12000,
    },
    unlockedAchievements: [],
    storyChapterUnlocked: 1,
    storyFragmentsCollected: [],
  };

  it('exports valid PassportOverlay component function', () => {
    expect(typeof PassportOverlay).toBe('function');
  });

  it('instantiates component with profile props without throwing', () => {
    const props = {
      profile: sampleProfile,
      onClose: jest.fn(),
    };
    expect(props.profile.displayName).toBe('TestPilot');
    expect(props.profile.level).toBe(3);
    const element = React.createElement(PassportOverlay, props);
    expect(element).toBeTruthy();
    expect(element.type).toBe(PassportOverlay);
  });
});
