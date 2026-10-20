import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { arcadePack } from '../../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE } from '../../dist/core/render.js';
import { RNG } from '../../dist/core/random.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_PATH = path.join(__dirname, '../snapshots/golden_hashes.json');

export function quantize16(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

export function computeQuantizedHash(samples) {
  const q = quantize16(samples);
  const buf = Buffer.from(q.buffer, q.byteOffset, q.byteLength);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function generateGoldenHashes() {
  const pack = arcadePack();
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const baseSeed = 42;
  const goldenHashes = {};

  for (const recipe of pack) {
    const hasVariation = recipe.variation && (
      (recipe.variation.pitch ?? 0) > 0 ||
      (recipe.variation.levelDb ?? 0) > 0 ||
      (recipe.variation.duration ?? 0) > 0
    );
    const variantCount = hasVariation ? 3 : 1;
    const variantHashes = [];

    for (let v = 0; v < variantCount; v++) {
      const rng = new RNG(baseSeed).fork(v);
      const samples = await render(recipe, { sampleRate, seed: baseSeed }, rng);
      variantHashes.push(computeQuantizedHash(samples));
    }

    goldenHashes[recipe.name] = {
      variants: variantHashes,
    };
  }

  return goldenHashes;
}

if (process.argv[1] === __filename) {
  generateGoldenHashes().then((data) => {
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated golden snapshots at ${SNAPSHOT_PATH}`);
  });
}
