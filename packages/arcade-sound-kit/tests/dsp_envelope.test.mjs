import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEnvelope } from '../dist/core/dsp/envelope.js';

test('computeEnvelope evaluates ADSR boundary levels accurately', () => {
  assert.equal(computeEnvelope(-0.1, 0.01, 0.05, 0.5, 0.02, 0.1), 0);
  assert.equal(computeEnvelope(0.0, 0.01, 0.05, 0.5, 0.02, 0.1), 0);
  assert.equal(computeEnvelope(0.01, 0.01, 0.05, 0.5, 0.02, 0.1), 1.0);
  assert.equal(computeEnvelope(0.06, 0.01, 0.05, 0.5, 0.02, 0.1), 0.5);
  assert.ok(Math.abs(computeEnvelope(0.12, 0.01, 0.05, 0.5, 0.02, 0.1)) < 1e-12);
});
