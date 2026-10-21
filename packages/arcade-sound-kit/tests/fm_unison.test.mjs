import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../dist/core/render.js';
import { examplesPack } from '../dist/design/examplesPack.js';

test('FM synthesis produces sideband energy compared to pure sine carrier', async () => {
  const pureRecipe = {
    name: 'pure_sine',
    category: 'ui',
    duration: 0.2,
    layers: [{ kind: 'tone', wave: 'sine', frequency: 440, level: 0 }],
  };

  const fmRecipe = {
    name: 'fm_sine',
    category: 'ui',
    duration: 0.2,
    layers: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 440,
        level: 0,
        fm: { ratio: 2.0, index: 3.0 },
      },
    ],
  };

  const pureSamples = await render(pureRecipe, { sampleRate: 22050, seed: 42 });
  const fmSamples = await render(fmRecipe, { sampleRate: 22050, seed: 42 });

  assert.notDeepEqual(
    fmSamples,
    pureSamples,
    'FM synthesis output must differ from pure sine carrier'
  );
});

test('Unison synthesizes detuned voices with normalized gain', async () => {
  const unisonRecipe = {
    name: 'unison_test',
    category: 'progression',
    duration: 0.3,
    layers: [
      {
        kind: 'tone',
        wave: 'sawtooth',
        frequency: 440,
        level: 0,
        unison: { voices: 5, detuneCents: 20 },
      },
    ],
  };

  const samples = await render(unisonRecipe, { sampleRate: 22050, seed: 42 });
  assert.ok(samples.length > 0, 'Unison audio rendered');

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const val = samples[i];
    assert.ok(!Number.isNaN(val), 'Unison sample must not be NaN');
    assert.ok(Number.isFinite(val), 'Unison sample must be finite');
    if (Math.abs(val) > peak) peak = Math.abs(val);
  }

  assert.ok(peak > 0, 'Unison output must be non-zero');
  assert.ok(peak <= 1.5, `Unison peak (${peak.toFixed(2)}) must be normalized and bounded`);
});

test('deprecated harmonicity property falls back to fm.ratio', async () => {
  const harmonicityRecipe = {
    name: 'deprecated_harmonicity',
    category: 'ui',
    duration: 0.2,
    layers: [{ kind: 'tone', wave: 'sine', frequency: 440, level: 0, harmonicity: 2.5 }],
  };

  const explicitFmRecipe = {
    name: 'explicit_fm',
    category: 'ui',
    duration: 0.2,
    layers: [{ kind: 'tone', wave: 'sine', frequency: 440, level: 0, fm: { ratio: 2.5, index: 1.0 } }],
  };

  const hSamples = await render(harmonicityRecipe, { sampleRate: 22050, seed: 42 });
  const fmSamples = await render(explicitFmRecipe, { sampleRate: 22050, seed: 42 });

  assert.deepEqual(
    hSamples,
    fmSamples,
    'Deprecated harmonicity property must produce identical output to explicit fm.ratio'
  );
});

test('examplesPack contains FM showcase recipes', () => {
  const pack = examplesPack();
  assert.ok(pack.some((r) => r.name === 'coin_fm'));
  assert.ok(pack.some((r) => r.name === 'bell_fm'));
  assert.ok(pack.some((r) => r.name === 'metallic_hit_fm'));
  assert.ok(pack.some((r) => r.name === 'short_pad_unison'));
});
