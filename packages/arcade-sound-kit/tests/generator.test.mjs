import test from 'node:test';
import assert from 'node:assert/strict';
import { randomRecipe, mutate, morph } from '../dist/design/generator.js';
import { validateRecipe } from '../dist/design/validator.js';
import { renderFinal } from '../dist/core/render.js';

const ARCHETYPES = [
  'laser',
  'explosion',
  'coin',
  'jump',
  'hit',
  'powerup',
  'ui_blip',
  'error',
];

test('randomRecipe generates valid, non-silent, non-clipping audio for archetypes across 100 seeds each', async () => {
  for (const arch of ARCHETYPES) {
    for (let seed = 1; seed <= 100; seed++) {
      const recipe = randomRecipe({ archetype: arch }, seed);
      const issues = validateRecipe(recipe);
      assert.equal(issues.length, 0, `Validation issues for archetype ${arch} seed ${seed}: ${JSON.stringify(issues)}`);

      const { samples } = await renderFinal(recipe, { sampleRate: 22050 });
      let maxAbs = 0;
      let nonZeroCount = 0;

      for (let i = 0; i < samples.length; i++) {
        const abs = Math.abs(samples[i]);
        if (abs > maxAbs) maxAbs = abs;
        if (abs > 0.0001) nonZeroCount++;
      }

      assert.ok(maxAbs <= 1.0001, `Archetype ${arch} seed ${seed} clipped: maxAbs=${maxAbs}`);
      assert.ok(nonZeroCount > 10, `Archetype ${arch} seed ${seed} silent: nonZeroCount=${nonZeroCount}`);
    }
  }
});

test('mutate produces deterministic variations and valid recipes', () => {
  const base = randomRecipe({ archetype: 'laser' }, 42);
  const mut1 = mutate(base, 0.2, 100);
  const mut2 = mutate(base, 0.2, 100);

  assert.deepEqual(mut1, mut2, 'mutate must be strictly deterministic with same seed');

  const issues = validateRecipe(mut1);
  assert.equal(issues.length, 0, 'Mutated recipe must pass validation');
});

test('morph interpolates smoothly between two recipes', () => {
  const recA = randomRecipe({ archetype: 'laser' }, 10);
  const recB = randomRecipe({ archetype: 'jump' }, 20);

  const morphStart = morph(recA, recB, 0.0);
  const morphMid = morph(recA, recB, 0.5);
  const morphEnd = morph(recA, recB, 1.0);

  assert.equal(morphStart.duration, recA.duration);
  assert.equal(morphEnd.duration, recB.duration);
  assert.ok(morphMid.duration > Math.min(recA.duration, recB.duration));
  assert.ok(morphMid.duration < Math.max(recA.duration, recB.duration));
});
