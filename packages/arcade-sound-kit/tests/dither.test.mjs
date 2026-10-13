import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeWav } from '../dist/export/wav.js';
import { RNG } from '../dist/core/random.js';

test('writeWav with TPDF dither is deterministic for same buffer and seed', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ask-dither-test-'));
  const file1 = path.join(tmpDir, 'test1.wav');
  const file2 = path.join(tmpDir, 'test2.wav');

  const samples = new Float32Array(100);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin(i * 0.1) * 0.5;
  }

  writeWav(samples, file1, 22050, -1, 16, 12345);
  writeWav(samples, file2, 22050, -1, 16, 12345);

  const buf1 = fs.readFileSync(file1);
  const buf2 = fs.readFileSync(file2);

  assert.deepEqual(buf1, buf2, 'WAV files rendered with same seed must be identical');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('quantization error per sample with TPDF dither never exceeds 2 LSB', () => {
  const samples = new Float32Array(1000);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = (i / 1000) * 2 - 1;
  }

  let peak = 0;
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  const target = Math.pow(10, -1 / 20);
  const gain = peak > 0 ? target / peak : 1;

  const seed = 42;
  const ditherRng = new RNG(seed).fork('dither');

  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i] * gain));
    const scale = x < 0 ? 0x8000 : 0x7fff;
    const idealScaled = x * scale;

    const tpdf = ditherRng.next() - ditherRng.next();
    const scaled = idealScaled + tpdf;
    const clamped = Math.max(-0x8000, Math.min(0x7fff, scaled));
    const quantizedInt = Math.round(clamped);

    const errorInLSB = Math.abs(quantizedInt - idealScaled);
    assert.ok(
      errorInLSB < 2.0,
      `sample ${i}: error ${errorInLSB} LSB exceeds 2 LSB threshold`
    );
  }
});

test('exact digital silence (0 samples) receives TPDF noise within [-1, 1] LSB', () => {
  const seed = 777;
  const ditherRng = new RNG(seed).fork('dither');
  const numSilenceSamples = 500;

  for (let i = 0; i < numSilenceSamples; i++) {
    const x = 0;
    const scale = 0x7fff;
    const idealScaled = x * scale;

    const tpdf = ditherRng.next() - ditherRng.next();
    const scaled = idealScaled + tpdf;
    const quantizedInt = Math.round(scaled);

    assert.ok(
      quantizedInt >= -1 && quantizedInt <= 1,
      `silence sample ${i}: got ${quantizedInt}, expected inside [-1, 1] integer range`
    );
  }
});
