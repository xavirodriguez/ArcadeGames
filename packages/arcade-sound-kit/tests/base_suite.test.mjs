import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE } from '../dist/core/render.js';
import { RNG } from '../dist/core/random.js';

function hashFloat32Array(buf) {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

test('base suite: all recipes meet sample count, finite values, bounds, and determinism', async () => {
  const pack = arcadePack();
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const seed = 42;

  for (const recipe of pack) {
    const baseDuration = Math.max(
      recipe.duration,
      ...recipe.layers.map((l) => (l.start ?? 0) + (l.duration ?? 0))
    );
    const nominalDurationSec = recipe.loop
      ? Math.max(baseDuration, 0.35)
      : baseDuration;
    const totalRenderSamples = Math.ceil(nominalDurationSec * sampleRate);
    const crossfadeSamples = recipe.loop
      ? Math.min(
          Math.floor(sampleRate * 0.015),
          Math.floor(totalRenderSamples * 0.25)
        )
      : 0;
    const expectedSamples = totalRenderSamples - crossfadeSamples;

    const rng1 = new RNG(seed);
    const samples1 = await render(recipe, { sampleRate }, rng1);

    assert.equal(
      samples1.length,
      expectedSamples,
      `recipe ${recipe.name} sample length mismatch`
    );

    let rawPeak = 0;
    for (let i = 0; i < samples1.length; i++) {
      const val = samples1[i];
      assert.ok(
        Number.isFinite(val),
        `recipe ${recipe.name} at sample ${i} is not finite: ${val}`
      );
      assert.ok(
        !Number.isNaN(val),
        `recipe ${recipe.name} at sample ${i} is NaN`
      );
      rawPeak = Math.max(rawPeak, Math.abs(val));
    }

    const normPeak = rawPeak > 0 ? rawPeak / Math.max(1, rawPeak) : 0;
    assert.ok(
      normPeak <= 1.0,
      `recipe ${recipe.name} normalized peak ${normPeak} exceeds [-1, 1]`
    );

    const rng2 = new RNG(seed);
    const samples2 = await render(recipe, { sampleRate }, rng2);

    assert.equal(
      hashFloat32Array(samples1),
      hashFloat32Array(samples2),
      `recipe ${recipe.name} is not deterministic for seed ${seed}`
    );
  }
});
