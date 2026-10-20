import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRecipeHash } from '../dist/export/encoder.js';

test('computeRecipeHash changes when new recipe fields (q, modulation, curve, points) are modified', () => {
  const baseRecipe = {
    name: 'test_hash_fields',
    category: 'ui',
    duration: 0.2,
    layers: [
      {
        kind: 'tone',
        frequency: 440,
        filter: { type: 'lowpass', minHz: 1000 },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.05 },
      },
    ],
  };

  const hashBase = computeRecipeHash(baseRecipe, { seed: 42 });

  // 1. Changing filter.q changes hash
  const recipeWithQ = {
    ...baseRecipe,
    layers: [{ ...baseRecipe.layers[0], filter: { type: 'lowpass', minHz: 1000, q: 5 } }],
  };
  const hashQ = computeRecipeHash(recipeWithQ, { seed: 42 });
  assert.notEqual(hashQ, hashBase, 'Adding filter.q must alter computed recipe hash');

  // 2. Changing modulation changes hash
  const recipeWithMod = {
    ...baseRecipe,
    layers: [
      {
        ...baseRecipe.layers[0],
        modulation: { pitch: { wave: 'sine', rateHz: 5, depth: 2 } },
      },
    ],
  };
  const hashMod = computeRecipeHash(recipeWithMod, { seed: 42 });
  assert.notEqual(hashMod, hashBase, 'Adding modulation must alter computed recipe hash');

  // 3. Changing envelope.curve changes hash
  const recipeWithExp = {
    ...baseRecipe,
    layers: [
      {
        ...baseRecipe.layers[0],
        envelope: { ...baseRecipe.layers[0].envelope, curve: 'exp' },
      },
    ],
  };
  const hashExp = computeRecipeHash(recipeWithExp, { seed: 42 });
  assert.notEqual(hashExp, hashBase, 'Changing envelope.curve to exp must alter computed recipe hash');

  // 4. Changing envelope.points changes hash
  const recipeWithPoints = {
    ...baseRecipe,
    layers: [
      {
        ...baseRecipe.layers[0],
        envelope: { points: [{ t: 0, level: 0 }, { t: 0.1, level: 1 }] },
      },
    ],
  };
  const hashPoints = computeRecipeHash(recipeWithPoints, { seed: 42 });
  assert.notEqual(hashPoints, hashBase, 'Adding envelope points must alter computed recipe hash');
});
