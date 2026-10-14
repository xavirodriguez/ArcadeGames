import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WaveFile } from 'wavefile';
import { ManifestEntry, SoundManifest, SoundRecipe, GenerateOptions } from '../core/types';
import { DEFAULT_SAMPLE_RATE, RENDER_VERSION } from '../core/render';

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
 * Deterministically stringifies an object with keys sorted alphabetically.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }
  if (isObjectRecord(obj)) {
    const keys = Object.keys(obj).sort();
    const entries: string[] = [];
    for (const key of keys) {
      const val = obj[key];
      if (val !== undefined) {
        entries.push(JSON.stringify(key) + ':' + canonicalJsonStringify(val));
      }
    }
    return '{' + entries.join(',') + '}';
  }
  return JSON.stringify(obj);
}

/**
 * Computes a SHA-256 hash for a recipe given all render options.
 */
export function computeRecipeHash(
  recipe: SoundRecipe,
  options: GenerateOptions,
  variantIndex = 0
): string {
  const payload = {
    renderVersion: RENDER_VERSION,
    recipe,
    variantIndex,
    sampleRate: options.sampleRate ?? DEFAULT_SAMPLE_RATE,
    seed: (options.seed ?? 42) + variantIndex * 9973,
    targetRmsDb: options.targetRmsDb,
    peakCeilingDb: options.peakCeilingDb,
    peakDb: options.peakDb,
    bitDepth: options.bitDepth ?? 16,
    arcadeColor: options.arcadeColor ?? false,
    variants: options.variants ?? 1,
  };
  const str = canonicalJsonStringify(payload);
  return crypto.createHash('sha256').update(str).digest('hex');
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
 * Write mono PCM16 WAV (default) after optional peak-normalizing to peakDb.
 * If peakDb is undefined, gain = 1 (written as-is).
 * PCM16 is ~half the size of float32 and fine for arcade SFX.
 */
export function writeWav(
  samples: Float32Array,
  file: string,
  sampleRate = DEFAULT_SAMPLE_RATE,
  peakDb?: number,
  bitDepth: 16 | 32 = 16
) {
  let gain = 1;
  if (peakDb !== undefined && peakDb !== null) {
    let peak = 0;
    for (const x of samples) peak = Math.max(peak, Math.abs(x));
    const target = Math.pow(10, peakDb / 20);
    gain = peak > 0 ? target / peak : 1;
  }

  const wav = new WaveFile();

  if (bitDepth === 32) {
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;
    wav.fromScratch(1, sampleRate, '32f', [out]);
  } else {
    // 16-bit signed PCM
    const out = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const x = Math.max(-1, Math.min(1, samples[i] * gain));
      out[i] = x < 0 ? Math.round(x * 0x8000) : Math.round(x * 0x7fff);
    }
    wav.fromScratch(1, sampleRate, '16', [out]);
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, wav.toBuffer());
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
  return {
    name: recipe.name,
    category: recipe.category,
    duration: recipe.duration,
    loop: !!recipe.loop,
    tags: recipe.tags ?? [],
    file: relativeFile,
    variants: variants > 1 ? variants : undefined,
    hash: extra?.hash,
    gainDb: extra?.gainDb !== undefined ? Number(extra.gainDb.toFixed(2)) : undefined,
    limitedByPeak: extra?.limitedByPeak ? true : undefined,
  };
}
