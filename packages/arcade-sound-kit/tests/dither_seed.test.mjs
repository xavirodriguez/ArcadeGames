import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeWav } from '../dist/export/wav.js';

test('writeWav produces sound-seed derived dither outputs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dither-test-'));
  const samples = new Float32Array([0.1, -0.2, 0.35, -0.42, 0.5, -0.61]);

  const file1 = path.join(tmpDir, 'sound1.wav');
  const file2 = path.join(tmpDir, 'sound2.wav');

  writeWav(samples, file1, 22050, undefined, 16, 101);
  writeWav(samples, file2, 22050, undefined, 16, 202);

  const buf1 = fs.readFileSync(file1);
  const buf2 = fs.readFileSync(file2);

  assert.notDeepEqual(
    buf1,
    buf2,
    'Different sound seeds passed to writeWav must produce distinct dithered WAV files'
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
