import React from 'react';
import { DraftOverlayUI } from '../DraftOverlayUI';
import { MutatorRegistry } from '../../utils/MutatorRegistry';

jest.mock('../../utils/haptics', () => ({
  hapticSelection: jest.fn(),
}));

describe('DraftOverlayUI Structure & Functionality', () => {
  it('exports valid DraftOverlayUI component function', () => {
    expect(typeof DraftOverlayUI).toBe('function');
  });

  it('creates valid React element with provided options and callback', () => {
    const onSelect = jest.fn();
    const options = ['faster_bullets', 'plasma_pierce', 'emp_overcharge'];

    const element = React.createElement(DraftOverlayUI, {
      options,
      onSelectOption: onSelect,
      visible: true,
    });

    expect(element).toBeTruthy();
    expect(element.type).toBe(DraftOverlayUI);
    expect(element.props.options).toEqual(options);
    expect(element.props.onSelectOption).toBe(onSelect);
  });

  it('resolves mutator metadata from MutatorRegistry correctly', () => {
    MutatorRegistry.init();
    const fasterBullets = MutatorRegistry.get('faster_bullets');
    expect(fasterBullets).toBeDefined();
    expect(fasterBullets.name).toBe('Balas más rápidas');

    const empOvercharge = MutatorRegistry.get('emp_overcharge');
    expect(empOvercharge).toBeDefined();
    expect(empOvercharge.name).toBe('EMP Sobrecargado');

    const plasmaPierce = MutatorRegistry.get('plasma_pierce');
    expect(plasmaPierce).toBeDefined();
    expect(plasmaPierce.name).toBe('Plasma Perforante');
  });
});
