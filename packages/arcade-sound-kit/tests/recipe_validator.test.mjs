import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe, assertValidRecipe, RecipeValidationError } from '../dist/design/validator.js';

test('Validator Rule 1: flags frequency <= 0 or non-finite in tonal layers', () => {
  const recipe = {
    name: 'invalid_freq',
    category: 'combat',
    duration: 0.1,
    layers: [
      {
        kind: 'tone',
        frequency: -10, // Invalid <= 0
      },
    ],
  };

  const issues = validateRecipe(recipe);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((i) => i.field.includes('frequency')));
  assert.throws(() => assertValidRecipe(recipe), RecipeValidationError);
});

test('Validator Rule 2: flags duration <= 0 or non-finite', () => {
  const recipe = {
    name: 'invalid_dur',
    category: 'combat',
    duration: 0, // Invalid <= 0
    layers: [
      {
        kind: 'noise',
        duration: NaN, // Invalid NaN
      },
    ],
  };

  const issues = validateRecipe(recipe);
  assert.ok(issues.length >= 2);
  assert.ok(issues.some((i) => i.field === 'duration'));
  assert.throws(() => assertValidRecipe(recipe), RecipeValidationError);
});

test('Validator Rule 3: flags envelope inconsistencies (negative times, sustain > 1)', () => {
  const recipe = {
    name: 'invalid_env',
    category: 'combat',
    duration: 0.1,
    layers: [
      {
        kind: 'tone',
        frequency: 440,
        envelope: { attack: -0.01, sustain: 1.5 },
      },
    ],
  };

  const issues = validateRecipe(recipe);
  assert.ok(issues.length >= 2);
  assert.ok(issues.some((i) => i.field.includes('envelope.attack')));
  assert.ok(issues.some((i) => i.field.includes('envelope.sustain')));
  assert.throws(() => assertValidRecipe(recipe), RecipeValidationError);
});

test('Validator Rule 4: flags minHz >= maxHz or exceeding Nyquist in noise filters', () => {
  const recipe = {
    name: 'invalid_filter',
    category: 'combat',
    duration: 0.1,
    layers: [
      {
        kind: 'noise',
        filter: { minHz: 5000, maxHz: 2000 }, // minHz > maxHz
      },
    ],
  };

  const issues = validateRecipe(recipe, 22050);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((i) => i.field.includes('filter')));
  assert.throws(() => assertValidRecipe(recipe), RecipeValidationError);
});

test('Validator Rule 5: flags NaN or Infinity in numeric fields', () => {
  const recipe = {
    name: 'invalid_nan',
    category: 'combat',
    duration: 0.1,
    layers: [
      {
        kind: 'tone',
        level: Infinity,
        frequency: 440,
      },
    ],
  };

  const issues = validateRecipe(recipe);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((i) => i.field.includes('level')));
  assert.throws(() => assertValidRecipe(recipe), RecipeValidationError);
});
