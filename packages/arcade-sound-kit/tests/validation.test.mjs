import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe, RecipeValidationError } from '../dist/core/validation.js';
import { generateSound } from '../dist/index.js';
import { tone, noiseBurst } from '../dist/effects/primitives.js';

test('validation rule 1: frequency <= 0 in tonal layers throws error', () => {
  const recipe = {
    name: 'invalid_freq',
    category: 'combat',
    duration: 0.1,
    layers: [
      tone({ startHz: 0, endHz: 440, duration: 0.1 }),
    ],
  };

  const issues = validateRecipe(recipe);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((i) => i.field === 'pitch.startHz' && i.value === 0));
});

test('validation rule 2: duration <= 0 or non-finite throws error', () => {
  const recipe = {
    name: 'invalid_dur',
    category: 'combat',
    duration: -0.1,
    layers: [tone({ startHz: 440, endHz: 880, duration: 0.1 })],
  };

  const issues = validateRecipe(recipe);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((i) => i.field === 'duration' && i.value === -0.1));
});

test('validation rule 3: envelope negative times, sustain > 1, or attack+decay > duration throws error', () => {
  const recipeNegative = {
    name: 'neg_env',
    category: 'combat',
    duration: 0.2,
    layers: [{
      kind: 'tone',
      duration: 0.2,
      envelope: { attack: -0.01, decay: 0.1, sustain: 0.5, release: 0.01 }
    }],
  };
  const issuesNeg = validateRecipe(recipeNegative);
  assert.ok(issuesNeg.some((i) => i.field === 'envelope.attack'));

  const recipeSustain = {
    name: 'sustain_env',
    category: 'combat',
    duration: 0.2,
    layers: [{
      kind: 'tone',
      duration: 0.2,
      envelope: { attack: 0.01, decay: 0.1, sustain: 1.5, release: 0.01 }
    }],
  };
  const issuesSustain = validateRecipe(recipeSustain);
  assert.ok(issuesSustain.some((i) => i.field === 'envelope.sustain'));
});

test('validation rule 4: minHz >= maxHz or maxHz >= Nyquist in noise filter throws error', () => {
  const recipeInverted = {
    name: 'inverted_filter',
    category: 'combat',
    duration: 0.1,
    layers: [noiseBurst({ filter: [5000, 1000], decay: 0.1 })],
  };
  const issuesInverted = validateRecipe(recipeInverted);
  assert.ok(issuesInverted.some((i) => i.field === 'filter'));

  const recipeNyquist = {
    name: 'nyquist_filter',
    category: 'combat',
    duration: 0.1,
    layers: [noiseBurst({ filter: [1000, 15000], decay: 0.1 })],
  };
  const issuesNyquist = validateRecipe(recipeNyquist, 22050);
  assert.ok(issuesNyquist.some((i) => i.field === 'filter.maxHz'));
});

test('validation rule 5: NaN or Infinity in numeric fields throws error', () => {
  const recipeNaN = {
    name: 'nan_field',
    category: 'combat',
    duration: 0.1,
    layers: [{
      kind: 'tone',
      level: NaN,
      duration: 0.1,
    }],
  };
  const issuesNaN = validateRecipe(recipeNaN);
  assert.ok(issuesNaN.some((i) => i.field === 'level'));
});

test('generateSound rejects invalid recipe with RecipeValidationError', async () => {
  const invalidRecipe = {
    name: 'bad_recipe',
    category: 'ui',
    duration: -1,
    layers: [],
  };

  await assert.rejects(
    async () => {
      await generateSound(invalidRecipe);
    },
    (err) => {
      assert.ok(err instanceof RecipeValidationError);
      assert.ok(err.issues.length > 0);
      return true;
    }
  );
});
