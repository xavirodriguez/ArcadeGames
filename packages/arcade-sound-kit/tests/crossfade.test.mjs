import test from 'node:test';
import assert from 'node:assert/strict';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE } from '../dist/core/render.js';
import { RNG } from '../dist/core/random.js';

test('loop recipes use constant-power crossfade producing output length D - C', async () => {
  const pack = arcadePack();
  const loopRecipes = pack.filter((r) => r.loop);
  assert.ok(loopRecipes.length > 0, 'arcadePack must have loop recipes');

  const sampleRate = DEFAULT_SAMPLE_RATE;

  for (const recipe of loopRecipes) {
    const samples = await render(recipe, { sampleRate }, new RNG(42));

    const baseDuration = Math.max(
      recipe.duration,
      ...recipe.layers.map((l) => (l.start ?? 0) + (l.duration ?? 0))
    );
    const nominalSec = Math.max(baseDuration, 0.35);
    const totalRenderSamples = Math.ceil(nominalSec * sampleRate);
    const C = Math.min(
      Math.floor(sampleRate * 0.015),
      Math.floor(totalRenderSamples * 0.25)
    );
    const expectedOutputSamples = totalRenderSamples - C;

    assert.equal(
      samples.length,
      expectedOutputSamples,
      `loop recipe ${recipe.name} expected ${expectedOutputSamples} samples, got ${samples.length}`
    );

    const boundaryJump = Math.abs(samples[0] - samples[samples.length - 1]);

    let maxInternalJump = 0;
    for (let i = 1; i < samples.length; i++) {
      const diff = Math.abs(samples[i] - samples[i - 1]);
      if (diff > maxInternalJump) {
        maxInternalJump = diff;
      }
    }

    assert.ok(
      boundaryJump <= maxInternalJump + 1e-4,
      `recipe ${recipe.name}: boundary jump ${boundaryJump} exceeds max internal consecutive jump ${maxInternalJump}`
    );
  }
});
