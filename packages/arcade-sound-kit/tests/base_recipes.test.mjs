import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE } from '../dist/index.js';

function hashBuffer(buffer) {
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

test('base recipe suite: duration, bounds, finite values, DC offset, and determinism', async () => {
  const pack = arcadePack();
  const sampleRate = DEFAULT_SAMPLE_RATE;

  for (const recipe of pack) {
    const rawSamples = await render(recipe, { sampleRate, seed: 42 });

    const baseDuration = Math.max(
      recipe.duration,
      ...recipe.layers.map((l) => (l.start ?? 0) + (l.duration ?? 0))
    );
    const nominalDuration = recipe.loop ? Math.max(baseDuration, 0.35) : baseDuration;
    const totalNominalSamples = Math.round(nominalDuration * sampleRate);
    const cSamples = recipe.loop
      ? Math.min(Math.round(sampleRate * 0.015), Math.floor(totalNominalSamples * 0.25))
      : 0;
    const expectedSamples = totalNominalSamples - cSamples;

    assert.equal(
      rawSamples.length,
      expectedSamples,
      `Recipe "${recipe.name}" sample count expected ${expectedSamples}, got ${rawSamples.length}`
    );

    let rawPeak = 0;
    let sampleSum = 0;
    for (let i = 0; i < rawSamples.length; i++) {
      const val = rawSamples[i];
      assert.ok(!Number.isNaN(val), `Recipe "${recipe.name}" sample ${i} is NaN`);
      assert.ok(Number.isFinite(val), `Recipe "${recipe.name}" sample ${i} is not finite`);
      if (Math.abs(val) > rawPeak) rawPeak = Math.abs(val);
      sampleSum += val;
    }

    const scale = rawPeak > 1.0 ? 1.0 / rawPeak : 1.0;
    let normalizedPeak = 0;
    for (let i = 0; i < rawSamples.length; i++) {
      const normVal = rawSamples[i] * scale;
      if (Math.abs(normVal) > normalizedPeak) normalizedPeak = Math.abs(normVal);
    }

    assert.ok(
      normalizedPeak <= 1.0 + 1e-6,
      `Recipe "${recipe.name}" peak (${normalizedPeak}) exceeded [-1, 1] bound`
    );

    // Measured DC offset threshold: mean amplitude across whole buffer must be < 0.05
    const dcOffset = Math.abs(sampleSum / rawSamples.length);
    assert.ok(
      dcOffset < 0.05,
      `Recipe "${recipe.name}" DC offset (${dcOffset.toFixed(4)}) exceeded threshold 0.05`
    );

    const rawSamples2 = await render(recipe, { sampleRate, seed: 42 });
    const hash1 = hashBuffer(rawSamples);
    const hash2 = hashBuffer(rawSamples2);

    assert.equal(
      hash1,
      hash2,
      `Recipe "${recipe.name}" failed deterministic rendering assertion`
    );
  }
});
