import test from 'node:test';
import assert from 'node:assert/strict';
import { renderVoice } from '../dist/core/dsp/voice.js';

test('renderVoice accurately synthesizes audio into buffer', () => {
  const buffer = new Float32Array(100);
  renderVoice(
    buffer,
    {
      wave: 'sine',
      getFrequency: () => 440,
    },
    {
      sampleStart: 0,
      sampleEnd: 100,
      sampleRate: 22050,
      dur: 0.004,
      attack: 0.001,
      decay: 0.002,
      sustain: 0,
      release: 0.001,
      gainLinear: 1.0,
    }
  );

  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    assert.ok(!Number.isNaN(val), 'Sample must not be NaN');
    assert.ok(Number.isFinite(val), 'Sample must be finite');
    if (Math.abs(val) > peak) peak = Math.abs(val);
  }

  assert.ok(peak > 0, 'renderVoice must produce non-zero audio samples');
});
