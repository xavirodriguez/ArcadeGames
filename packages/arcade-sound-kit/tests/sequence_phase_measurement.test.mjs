import test from 'node:test';
import assert from 'node:assert/strict';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE } from '../dist/core/render.js';

test('measure sequence note onset discontinuity vs rest of pack', async () => {
  const pack = arcadePack();
  const sampleRate = DEFAULT_SAMPLE_RATE;

  let maxPackJump = 0;
  for (const recipe of pack) {
    if (recipe.layers.some((l) => l.kind === 'sequence')) continue;
    const samples = await render(recipe, { sampleRate, seed: 42 });
    for (let i = 1; i < samples.length; i++) {
      const jump = Math.abs(samples[i] - samples[i - 1]);
      if (jump > maxPackJump) maxPackJump = jump;
    }
  }

  const sequenceRecipes = pack.filter((r) => r.layers.some((l) => l.kind === 'sequence'));
  let maxSequenceOnsetJump = 0;

  for (const recipe of sequenceRecipes) {
    const samples = await render(recipe, { sampleRate, seed: 42 });
    for (let i = 1; i < samples.length; i++) {
      const jump = Math.abs(samples[i] - samples[i - 1]);
      if (jump > maxSequenceOnsetJump) maxSequenceOnsetJump = jump;
    }
  }

  console.log(`Measured max consecutive sample jump in pack: ${maxPackJump.toFixed(6)}`);
  console.log(`Measured max sample jump in sequence recipes: ${maxSequenceOnsetJump.toFixed(6)}`);

  assert.ok(
    maxSequenceOnsetJump <= maxPackJump,
    `Sequence onset jump (${maxSequenceOnsetJump}) is within max pack sample jump (${maxPackJump})`
  );
});
