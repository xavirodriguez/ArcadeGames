import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEnvelope } from '../dist/core/dsp/envelope.js';
import { render } from '../dist/core/render.js';
import { arcadePack } from '../dist/design/pack.js';
import { examplesPack } from '../dist/design/examplesPack.js';

test('computeEnvelope: t=0 is 0, end is 0, decay is monotonic', () => {
  assert.equal(computeEnvelope(0, 0.01, 0.05, 0, 0.02, 0.1, 'exp'), 0);
  assert.equal(computeEnvelope(0.2, 0.01, 0.05, 0, 0.02, 0.1, 'exp'), 0);

  // Check monotonicity in decay segment (t=0.01s to t=0.06s)
  let lastVal = computeEnvelope(0.01, 0.01, 0.05, 0, 0.02, 0.1, 'exp');
  for (let t = 0.015; t <= 0.06; t += 0.005) {
    const val = computeEnvelope(t, 0.01, 0.05, 0, 0.02, 0.1, 'exp');
    assert.ok(
      val <= lastVal + 1e-6,
      `Decay segment must be monotonic decreasing: val (${val}) <= lastVal (${lastVal})`
    );
    lastVal = val;
  }
});

test('multipoint envelope evaluates piece-wise points', () => {
  const points = [
    { t: 0, level: 0 },
    { t: 0.05, level: 1.0 },
    { t: 0.1, level: 0.2 },
    { t: 0.2, level: 0 },
  ];

  assert.equal(computeEnvelope(0, 0, 0, 0, 0, 0.2, 'linear', points), 0);
  assert.equal(computeEnvelope(0.05, 0, 0, 0, 0, 0.2, 'linear', points), 1.0);
  assert.ok(Math.abs(computeEnvelope(0.1, 0, 0, 0, 0, 0.2, 'linear', points) - 0.2) < 1e-6);
  assert.equal(computeEnvelope(0.2, 0, 0, 0, 0, 0.2, 'linear', points), 0);
});

test('no sample-to-sample jump in exp envelope recipe exceeds measured threshold', async () => {
  const exPack = examplesPack();
  const expRecipes = exPack.filter((r) => r.name.endsWith('_exp'));

  for (const recipe of expRecipes) {
    const samples = await render(recipe, { sampleRate: 22050, seed: 42 });
    let maxJump = 0;
    for (let i = 1; i < samples.length; i++) {
      const jump = Math.abs(samples[i] - samples[i - 1]);
      if (jump > maxJump) maxJump = jump;
    }

    assert.ok(
      maxJump < 0.6,
      `Recipe "${recipe.name}" max consecutive sample jump (${maxJump.toFixed(4)}) must be smooth (< 0.6)`
    );
  }
});
