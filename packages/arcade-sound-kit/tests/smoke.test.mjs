import test from 'node:test';
import assert from 'node:assert/strict';
import { arcadePack } from '../dist/design/pack.js';

test('arcadePack returns a non-empty list of recipes', () => {
  const pack = arcadePack();
  assert.ok(Array.isArray(pack));
  assert.ok(pack.length >= 30, `expected >= 30 sounds, got ${pack.length}`);
});

test('every recipe has required fields', () => {
  for (const r of arcadePack()) {
    assert.equal(typeof r.name, 'string');
    assert.ok(['combat', 'movement', 'progression', 'ui'].includes(r.category));
    assert.ok(r.duration > 0);
    assert.ok(Array.isArray(r.layers) && r.layers.length > 0);
  }
});

test('loop recipes are marked correctly', () => {
  const pack = arcadePack();
  const loops = pack.filter((r) => r.loop);
  assert.ok(loops.some((r) => r.name === 'thrust_loop'));
  assert.ok(loops.some((r) => r.name === 'wall_slide'));
  assert.ok(loops.some((r) => r.name === 'glide_loop'));
});
