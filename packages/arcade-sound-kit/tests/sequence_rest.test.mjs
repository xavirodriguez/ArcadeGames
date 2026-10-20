import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../dist/core/render.js';

test('sequence rests with frequency 0 or rest: true produce zero energy audio', async () => {
  const recipe = {
    name: 'test_rest',
    category: 'ui',
    duration: 0.2,
    layers: [
      {
        kind: 'sequence',
        notes: [
          { frequency: 0, stepDuration: 0.1 },
          { frequency: 440, rest: true, stepDuration: 0.1 },
        ],
      },
    ],
  };

  const samples = await render(recipe, { sampleRate: 22050, seed: 42 });

  let energy = 0;
  for (let i = 0; i < samples.length; i++) {
    energy += samples[i] * samples[i];
  }

  assert.equal(energy, 0, `Expected total energy to be 0 for rest notes, got ${energy}`);
});
