import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToAudioBuffer } from '../dist/export/audioBuffer.js';
import { processWorkerMessage } from '../dist/worker/soundWorkerBridge.js';

test('renderToAudioBuffer converts Float32Array to AudioBuffer using copyToChannel', () => {
  const samples = new Float32Array([0.1, -0.2, 0.5]);
  const mockChannel = new Float32Array(3);

  const mockCtx = {
    createBuffer(channels, length, sampleRate) {
      return {
        length,
        sampleRate,
        copyToChannel(data) {
          mockChannel.set(data);
        },
        getChannelData() {
          return mockChannel;
        },
      };
    },
  };

  const buffer = renderToAudioBuffer(mockCtx, samples, 22050);
  assert.equal(buffer.length, 3);
  assert.equal(buffer.sampleRate, 22050);
  assert.ok(Math.abs(mockChannel[0] - 0.1) < 1e-6);
  assert.ok(Math.abs(mockChannel[1] - (-0.2)) < 1e-6);
  assert.ok(Math.abs(mockChannel[2] - 0.5) < 1e-6);
});

test('processWorkerMessage validates recipe JSON and enforces Rule 6 limits', async () => {
  const validRecipe = {
    name: 'worker_test',
    category: 'ui',
    duration: 0.2,
    layers: [{ kind: 'tone', wave: 'sine', frequency: 440 }],
  };

  const response = await processWorkerMessage({
    id: 'req_1',
    action: 'render',
    recipeJson: JSON.stringify(validRecipe),
  });

  assert.equal(response.action, 'render_success');
  assert.ok(response.samples.length > 0);

  // Exceeding duration limit (> 10s) fails
  const longRecipe = { ...validRecipe, duration: 12.0 };
  const errResponse = await processWorkerMessage({
    id: 'req_2',
    action: 'render',
    recipeJson: JSON.stringify(longRecipe),
  });

  assert.equal(errResponse.action, 'render_error');
  assert.ok(errResponse.error.includes('10.0s limit'));
});
