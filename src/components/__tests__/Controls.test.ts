import React from 'react';
import { ShootButton } from '../ShootButton';
import { HyperspaceButton } from '../HyperspaceButton';
import { ActionButton } from '../controls/ActionButton';
import { PlayerNameInput } from '../ui/PlayerNameInput';

jest.mock('../../utils/haptics', () => ({
  hapticSelection: jest.fn(),
}));

describe('Controls Component Export & Interface', () => {
  describe('ShootButton', () => {
    it('exports ShootButton component', () => {
      expect(typeof ShootButton).toBe('function');
    });
  });

  describe('HyperspaceButton', () => {
    it('exports HyperspaceButton component', () => {
      expect(typeof HyperspaceButton).toBe('function');
    });
  });

  describe('ActionButton', () => {
    it('exports ActionButton component', () => {
      expect(typeof ActionButton).toBe('function');
    });
  });

  describe('PlayerNameInput', () => {
    it('exports PlayerNameInput component', () => {
      expect(typeof PlayerNameInput).toBe('function');
    });
  });
});
