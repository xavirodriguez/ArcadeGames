import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  canonicalJsonStringify,
  computeRecipeHash,
  generateSetDetailed,
  defineSound,
  tone,
  RENDER_VERSION,
} from '../dist/index.js';

test('canonicalJsonStringify sorts keys recursively', () => {
  const obj1 = { b: 2, a: { z: 10, y: 20 }, c: [3, 2, 1] };
  const obj2 = { c: [3, 2, 1], a: { y: 20, z: 10 }, b: 2 };

  const str1 = canonicalJsonStringify(obj1);
  const str2 = canonicalJsonStringify(obj2);

  assert.equal(str1, str2, 'Key order should not affect canonical JSON output');
  assert.equal(str1, '{"a":{"y":20,"z":10},"b":2,"c":[3,2,1]}');
});

test('computeRecipeHash changes on recipe or option changes, unchanged on key reordering', () => {
  const r1 = defineSound('test_hash', {
    category: 'combat',
    duration: 0.1,
    layers: [tone({ wave: 'sine', startHz: 440, level: -10 })],
  });

  const r1_reordered = defineSound('test_hash', {
    layers: [tone({ level: -10, wave: 'sine', startHz: 440 })],
    duration: 0.1,
    category: 'combat',
  });

  const h1 = computeRecipeHash(r1, { seed: 42 });
  const h1_reordered = computeRecipeHash(r1_reordered, { seed: 42 });
  assert.equal(h1, h1_reordered, 'Reordering keys in recipe should produce same hash');

  const r2_modified = defineSound('test_hash', {
    category: 'combat',
    duration: 0.1,
    layers: [tone({ wave: 'sine', startHz: 880, level: -10 })],
  });
  const h2 = computeRecipeHash(r2_modified, { seed: 42 });
  assert.notEqual(h1, h2, 'Changing frequency should change hash');

  const h3_rms = computeRecipeHash(r1, { seed: 42, targetRmsDb: -18 });
  assert.notEqual(h1, h3_rms, 'Changing targetRmsDb should change hash');
});

test('generateSet detailed incremental cache hits and misses', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-cache-test-'));

  const r1 = defineSound('sound_a', {
    category: 'ui',
    duration: 0.1,
    layers: [tone({ wave: 'sine', startHz: 500, endHz: 1000 })],
  });

  const r2 = defineSound('sound_b', {
    category: 'combat',
    duration: 0.1,
    layers: [tone({ wave: 'square', startHz: 200, endHz: 100 })],
  });

  const set1 = [r1, r2];

  // Pass 1: Fresh render (2 rendered, 0 cached)
  const res1 = await generateSetDetailed(set1, { outDir: tmpDir, seed: 100 });
  assert.equal(res1.renderedCount, 2);
  assert.equal(res1.cachedCount, 0);

  // Pass 2: Second run unchanged (0 rendered, 2 cached)
  const res2 = await generateSetDetailed(set1, { outDir: tmpDir, seed: 100 });
  assert.equal(res2.renderedCount, 0);
  assert.equal(res2.cachedCount, 2);

  // Pass 3: Modify recipe 1 (1 rendered, 1 cached)
  const r1_mod = defineSound('sound_a', {
    category: 'ui',
    duration: 0.1,
    layers: [tone({ wave: 'sine', startHz: 600, endHz: 1200 })],
  });

  const res3 = await generateSetDetailed([r1_mod, r2], { outDir: tmpDir, seed: 100 });
  assert.equal(res3.renderedCount, 1);
  assert.equal(res3.cachedCount, 1);

  // Pass 4: Delete WAV file of sound_b (1 rendered, 1 cached)
  const fileB = path.join(tmpDir, r2.category, `${r2.name}.wav`);
  fs.unlinkSync(fileB);

  const res4 = await generateSetDetailed([r1_mod, r2], { outDir: tmpDir, seed: 100 });
  assert.equal(res4.renderedCount, 1);
  assert.equal(res4.cachedCount, 1);

  // Pass 5: force: true bypasses cache (2 rendered)
  const res5 = await generateSetDetailed([r1_mod, r2], { outDir: tmpDir, seed: 100, force: true });
  assert.equal(res5.renderedCount, 2);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('cached WAV file is byte-for-byte identical to freshly rendered WAV', async () => {
  const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-byte-fresh-'));
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-byte-cached-'));

  const r = defineSound('exact_test', {
    category: 'movement',
    duration: 0.15,
    layers: [tone({ wave: 'sawtooth', startHz: 300, endHz: 600 })],
  });

  // Fresh render in dir1
  const resFresh1 = await generateSetDetailed([r], { outDir: dir1, seed: 777 });
  const bufFresh = fs.readFileSync(resFresh1.files[0]);

  // Initial render in dir2
  await generateSetDetailed([r], { outDir: dir2, seed: 777 });
  // Pass 2 in dir2 (served from cache)
  const resCached = await generateSetDetailed([r], { outDir: dir2, seed: 777 });
  assert.equal(resCached.cachedCount, 1);
  const bufCached = fs.readFileSync(resCached.files[0]);

  assert.deepEqual(bufCached, bufFresh, 'Cached WAV must be byte-for-byte identical to freshly rendered WAV');

  fs.rmSync(dir1, { recursive: true, force: true });
  fs.rmSync(dir2, { recursive: true, force: true });
});

test('orphan WAV detection identifies obsolete files', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-orphan-test-'));

  const r1 = defineSound('keep_me', {
    category: 'ui',
    duration: 0.1,
    layers: [tone({ wave: 'sine', startHz: 440 })],
  });

  // Render set with keep_me
  await generateSetDetailed([r1], { outDir: tmpDir });

  // Manually create an orphaned WAV file in outDir
  const orphanPath = path.join(tmpDir, 'combat', 'old_sound.wav');
  fs.mkdirSync(path.dirname(orphanPath), { recursive: true });
  fs.writeFileSync(orphanPath, Buffer.from('fake wav content'));

  const res = await generateSetDetailed([r1], { outDir: tmpDir });
  assert.ok(res.orphans.includes('combat/old_sound.wav'), 'Should detect orphan WAV file');
  assert.ok(fs.existsSync(orphanPath), 'Orphan WAV should NOT be deleted');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
