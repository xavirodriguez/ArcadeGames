import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import wavefilePkg from 'wavefile';
const { WaveFile } = wavefilePkg;
import { writeWav } from '../dist/export/wav.js';

test('writeWav with TPDF dither is strictly deterministic for same seed', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx_dither_test_'));
  const file1 = path.join(tmpDir, 'test1.wav');
  const file2 = path.join(tmpDir, 'test2.wav');

  const sampleCount = 1000;
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / 22050) * 0.5;
  }

  writeWav(samples, file1, 22050, undefined, 16, 777);
  writeWav(samples, file2, 22050, undefined, 16, 777);

  const buf1 = fs.readFileSync(file1);
  const buf2 = fs.readFileSync(file2);

  assert.deepEqual(buf1, buf2, 'Same buffer and seed must write byte-for-byte identical WAV file');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('TPDF quantization error per sample never exceeds 2 LSBs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx_dither_err_test_'));
  const file = path.join(tmpDir, 'dither_err.wav');

  const sampleCount = 2000;
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = Math.sin(i * 0.05) * (i / sampleCount);
  }

  writeWav(samples, file, 22050, undefined, 16, 42);

  const wavBuf = fs.readFileSync(file);
  const wav = new WaveFile(wavBuf);
  const pcm16Samples = wav.getSamples(false, Int16Array);

  for (let i = 0; i < sampleCount; i++) {
    const rawVal = samples[i];
    const lsbScale = rawVal < 0 ? 0x8000 : 0x7fff;
    const expectedValLsb = rawVal * lsbScale;
    const actualValLsb = pcm16Samples[i];

    const errorLsb = Math.abs(actualValLsb - expectedValLsb);
    assert.ok(
      errorLsb <= 2.0,
      `Quantization error at sample ${i} (${errorLsb} LSB) exceeded 2 LSB bound`
    );
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
