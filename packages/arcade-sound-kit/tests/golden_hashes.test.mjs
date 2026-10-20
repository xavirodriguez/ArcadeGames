import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE, RENDER_VERSION } from '../dist/core/render.js';
import { RNG } from '../dist/core/random.js';
import { computeQuantizedHash } from './scripts/update_golden.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_PATH = path.join(__dirname, 'snapshots/golden_hashes.json');

test('RENDER_VERSION is bumped to 0.3.1', () => {
  assert.equal(RENDER_VERSION, '0.3.1');
});

test('Golden regression hashes for all arcadePack recipes and variants', async () => {
  assert.ok(fs.existsSync(SNAPSHOT_PATH), `Snapshot file missing at ${SNAPSHOT_PATH}`);
  const rawData = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const goldenHashes = JSON.parse(rawData);

  const pack = arcadePack();
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const baseSeed = 42;

  for (const recipe of pack) {
    const expectedData = goldenHashes[recipe.name];
    assert.ok(expectedData, `Missing snapshot entry for recipe "${recipe.name}"`);

    const expectedVariants = expectedData.variants;
    const variantCount = expectedVariants.length;

    for (let v = 0; v < variantCount; v++) {
      const rng = new RNG(baseSeed).fork(v);
      const samples = await render(recipe, { sampleRate, seed: baseSeed }, rng);
      const actualHash = computeQuantizedHash(samples);

      assert.equal(
        actualHash,
        expectedVariants[v],
        `Regression failure: Golden audio hash mismatch for recipe "${recipe.name}" (variant ${v})`
      );
    }
  }
});
