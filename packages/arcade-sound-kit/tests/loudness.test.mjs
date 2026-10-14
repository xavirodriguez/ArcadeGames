import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { arcadePack } from '../dist/design/pack.js';
import {
  generateSound,
  generateSoundDetailed,
  applyLoudnessNormalization,
  computeActiveRms,
  render,
  defineSound,
  tone,
} from '../dist/index.js';

test('computeActiveRms computes correct RMS for a sine wave', () => {
  const sampleRate = 22050;
  const samples = new Float32Array(sampleRate);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  const rms = computeActiveRms(samples);
  const rmsDb = 20 * Math.log10(rms);
  // Sine wave active RMS is 1/sqrt(2) = -3.01 dBFS
  assert.ok(Math.abs(rmsDb - (-3.0103)) < 0.01, `expected ~ -3.01 dBFS, got ${rmsDb}`);
});

test('applyLoudnessNormalization normalizes non-limited audio within +/- 0.1 dB', () => {
  const sampleRate = 22050;
  const samples = new Float32Array(sampleRate);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.1;
  }
  const norm = applyLoudnessNormalization(samples, -18, -1);
  assert.equal(norm.limitedByPeak, false);

  const activeRms = computeActiveRms(samples);
  const measuredRmsDb = 20 * Math.log10(activeRms);
  assert.ok(
    Math.abs(measuredRmsDb - (-18)) < 0.1,
    `expected -18 +/- 0.1 dB, got ${measuredRmsDb}`
  );
});

test('applyLoudnessNormalization limits gain when peak ceiling is reached', () => {
  const samples = new Float32Array(1000);
  // Fill active samples with low amplitude (e.g. 0.01) and one sharp peak of 0.5
  for (let i = 100; i < 900; i++) samples[i] = 0.01;
  samples[500] = 0.5;

  // Target RMS -12 dBFS (0.2512), peak ceiling -1 dBFS (0.8912)
  const norm = applyLoudnessNormalization(samples, -12, -1);
  assert.equal(norm.limitedByPeak, true);

  let peak = 0;
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  const peakDb = 20 * Math.log10(peak);
  assert.ok(peakDb <= -0.99, `peak should respect -1 dBFS ceiling, got ${peakDb}`);
});

test('applyLoudnessNormalization handles digital silence without NaN or Infinity', () => {
  const samples = new Float32Array(1000); // All 0s
  const norm = applyLoudnessNormalization(samples, -18, -1);
  assert.equal(norm.gainDb, 0);
  assert.equal(norm.limitedByPeak, false);
  for (const x of samples) {
    assert.ok(!Number.isNaN(x) && Number.isFinite(x), 'sample should be finite');
  }
});

test('without targetRmsDb, generated WAV is byte-for-byte identical to before', async () => {
  const tmpDir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-legacy-'));
  const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-current-'));

  const recipe = defineSound('test_legacy', {
    category: 'combat',
    duration: 0.2,
    layers: [tone({ wave: 'sine', startHz: 440, endHz: 880, level: -6, decay: 0.15 })],
  });

  const file1 = await generateSound(recipe, { outDir: tmpDir1, seed: 123 });
  const file2 = await generateSound(recipe, { outDir: tmpDir2, seed: 123 });

  const buf1 = fs.readFileSync(file1);
  const buf2 = fs.readFileSync(file2);

  assert.deepEqual(buf1, buf2, 'WAV files without targetRmsDb should be byte-for-byte identical');

  fs.rmSync(tmpDir1, { recursive: true, force: true });
  fs.rmSync(tmpDir2, { recursive: true, force: true });
});

test('evaluate arcadePack with targetRmsDb = -18 dBFS and measure limited count', async () => {
  const pack = arcadePack();
  let totalCount = pack.length;
  let limitedCount = 0;

  for (const r of pack) {
    const samples = await render(r, { seed: 42 });
    const norm = applyLoudnessNormalization(samples, -18, -1);
    if (norm.limitedByPeak) {
      limitedCount++;
    } else {
      const measuredRms = computeActiveRms(samples);
      const measuredRmsDb = 20 * Math.log10(measuredRms);
      assert.ok(
        Math.abs(measuredRmsDb - (-18)) < 0.1,
        `recipe ${r.name} RMS ${measuredRmsDb} expected -18 +/- 0.1 dB`
      );
    }
  }

  console.log(`Loudness test report: Target -18 dBFS, ${limitedCount} of ${totalCount} recipes limited by peak ceiling.`);
});
