import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../dist/core/render.js';
import { examplesPack } from '../dist/design/examplesPack.js';

test('LFO pitch vibrato modulates instant frequency periodically', async () => {
  const recipe = {
    name: 'vibrato_test',
    category: 'ui',
    duration: 1.0,
    layers: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 440,
        level: 0,
        modulation: {
          pitch: { wave: 'sine', rateHz: 5, depth: 2, phase: 0 },
        },
      },
    ],
  };

  const samples = await render(recipe, { sampleRate: 22050, seed: 42 });
  assert.ok(samples.length > 0, 'Vibrato audio rendered');

  // Measure zero crossings in first half vs second half of 5 Hz LFO cycle (period = 0.2s = 4410 samples)
  const halfCycle = Math.floor((22050 / 5) / 2);
  let zeroCrossingsPhase1 = 0;
  let zeroCrossingsPhase2 = 0;

  for (let i = 1; i < halfCycle; i++) {
    if (samples[i - 1] <= 0 && samples[i] > 0) zeroCrossingsPhase1++;
  }
  for (let i = halfCycle + 1; i < halfCycle * 2; i++) {
    if (samples[i - 1] <= 0 && samples[i] > 0) zeroCrossingsPhase2++;
  }

  assert.notEqual(
    zeroCrossingsPhase1,
    zeroCrossingsPhase2,
    'Pitch vibrato must modulate zero-crossing density between LFO high and low phases'
  );
});

test('LFO tremolo modulates envelope amplitude periodically', async () => {
  const recipe = {
    name: 'tremolo_test',
    category: 'ui',
    duration: 1.0,
    layers: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 1000,
        level: 0,
        modulation: {
          amp: { wave: 'square', rateHz: 4, depth: 1.0, phase: 0 },
        },
      },
    ],
  };

  const samples = await render(recipe, { sampleRate: 22050, seed: 42 });
  assert.ok(samples.length > 0, 'Tremolo audio rendered');

  // For 4 Hz square tremolo, peak energy in high phase must be significantly greater than in low phase
  const stepSamples = Math.floor(22050 / 4);
  let highPhaseEnergy = 0;
  let lowPhaseEnergy = 0;

  for (let i = 100; i < stepSamples / 2 - 100; i++) {
    highPhaseEnergy += samples[i] * samples[i];
  }
  for (let i = stepSamples / 2 + 100; i < stepSamples - 100; i++) {
    lowPhaseEnergy += samples[i] * samples[i];
  }

  assert.ok(
    highPhaseEnergy > lowPhaseEnergy * 5,
    `Tremolo high phase energy (${highPhaseEnergy.toFixed(4)}) must exceed low phase energy (${lowPhaseEnergy.toFixed(4)})`
  );
});

test('examplesPack returns non-empty list of valid LFO example recipes', () => {
  const pack = examplesPack();
  assert.ok(pack.length >= 3, 'examplesPack must contain example recipes');
  assert.ok(pack.some((r) => r.name === 'siren'));
  assert.ok(pack.some((r) => r.name === 'powerup_vibrato'));
  assert.ok(pack.some((r) => r.name === 'filter_modulated'));
});
