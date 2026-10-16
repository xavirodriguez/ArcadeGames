import test from 'node:test';
import assert from 'node:assert/strict';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE } from '../dist/index.js';

test('loop recipes crossfade boundary jump does not exceed maximum internal consecutive sample jump', async () => {
  const pack = arcadePack();
  const loopRecipes = pack.filter((r) => r.loop);
  const sampleRate = DEFAULT_SAMPLE_RATE;

  assert.ok(loopRecipes.length > 0, 'Must have loop recipes in arcadePack');

  for (const recipe of loopRecipes) {
    const samples = await render(recipe, { sampleRate, seed: 42 });
    const N = samples.length;
    assert.ok(N > 100, `Loop buffer for ${recipe.name} must contain audio samples`);

    let maxInternalJump = 0;
    for (let i = 0; i < N - 1; i++) {
      const jump = Math.abs(samples[i + 1] - samples[i]);
      if (jump > maxInternalJump) {
        maxInternalJump = jump;
      }
    }

    const boundaryJump = Math.abs(samples[0] - samples[N - 1]);

    assert.ok(
      boundaryJump <= maxInternalJump + 1e-5,
      `Loop recipe "${recipe.name}" boundary jump (${boundaryJump}) exceeded max internal jump (${maxInternalJump})`
    );
  }
});
