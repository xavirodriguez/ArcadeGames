import fs from 'node:fs';
import path from 'node:path';
import { ManifestEntry, SoundManifest, SoundRecipe } from '../core/types';
import { DEFAULT_SAMPLE_RATE, RENDER_VERSION } from '../core/render';
import { estimateEffectsTailSeconds } from '../core/effects/chain';
import { encodeWav } from './encoder';

export * from './encoder';

function isObjectRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isSoundManifest(val: unknown): val is SoundManifest {
  return (
    isObjectRecord(val) &&
    typeof val.version === 'string' &&
    typeof val.sampleRate === 'number' &&
    Array.isArray(val.sounds)
  );
}

/**
 * Reads existing manifest.json in outDir if present and valid.
 */
export function readManifest(outDir: string): SoundManifest | null {
  const manifestPath = path.join(outDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const parsed: unknown = JSON.parse(content);
    if (isSoundManifest(parsed)) {
      return parsed;
    }
  } catch {
    // Treat invalid or unparseable manifest as cache miss
  }
  return null;
}

/**
 * Finds WAV files in outDir that are not in the current set of relative files.
 */
export function findOrphanWavs(outDir: string, activeRelFiles: Set<string>): string[] {
  if (!fs.existsSync(outDir)) return [];
  const orphans: string[] = [];

  function walk(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && item.name.endsWith('.wav')) {
        const rel = path.relative(outDir, fullPath).replace(/\\/g, '/');
        if (!activeRelFiles.has(rel)) {
          orphans.push(rel);
        }
      }
    }
  }

  walk(outDir);
  return orphans.sort();
}

/**
 * Writes encoded WAV bytes to disk.
 */
export function writeWav(
  samples: Float32Array,
  file: string,
  sampleRate = DEFAULT_SAMPLE_RATE,
  peakDb?: number,
  bitDepth: 16 | 32 = 16,
  seed = 42
) {
  const wavBuffer = encodeWav(samples, { sampleRate, bitDepth, peakDb, seed });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, wavBuffer);
}

export function writeManifest(
  outDir: string,
  sampleRate: number,
  entries: ManifestEntry[],
  bitDepth: 16 | 32 = 16
) {
  const manifest: SoundManifest = {
    version: RENDER_VERSION,
    sampleRate,
    bitDepth,
    generatedAt: new Date().toISOString(),
    sounds: entries,
  };
  const file = path.join(outDir, 'manifest.json');
  const tmpFile = path.join(outDir, 'manifest.json.tmp');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(tmpFile, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmpFile, file);
  return file;
}

export function recipeToManifestEntry(
  recipe: SoundRecipe,
  relativeFile: string,
  variants = 1,
  extra?: {
    hash?: string;
    gainDb?: number;
    limitedByPeak?: boolean;
  }
): ManifestEntry {
  const tailSeconds = estimateEffectsTailSeconds(recipe.effects);
  const totalDuration = recipe.duration + tailSeconds;

  return {
    name: recipe.name,
    category: recipe.category,
    duration: Number(totalDuration.toFixed(3)),
    loop: !!recipe.loop,
    tags: recipe.tags ?? [],
    file: relativeFile,
    variants: variants > 1 ? variants : undefined,
    hash: extra?.hash,
    gainDb: extra?.gainDb !== undefined ? Number(extra.gainDb.toFixed(2)) : undefined,
    limitedByPeak: extra?.limitedByPeak ? true : undefined,
  };
}
