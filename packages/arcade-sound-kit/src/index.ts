export * from './core/types';
export * from './core/random';
export * from './design/recipe';
export * from './effects/primitives';
export * from './design/pack';
export {
  RecipeValidationError,
  SoundRecipeValidationError,
  validateRecipe,
  assertValidRecipe,
  type RecipeValidationIssue,
} from './design/validator';
export {
  DEFAULT_SAMPLE_RATE,
  RENDER_VERSION,
  render,
  applyLoudnessNormalization,
  computeActiveRms,
  type NormalizationResult,
} from './core/render';
export {
  canonicalJsonStringify,
  computeRecipeHash,
  readManifest,
  findOrphanWavs,
} from './export/wav';

import path from 'node:path';
import fs from 'node:fs';
import {
  SoundRecipe,
  GenerateOptions,
  ManifestEntry,
  GenerateProgressEvent,
} from './core/types';
import {
  render,
  DEFAULT_SAMPLE_RATE,
  applyLoudnessNormalization,
  NormalizationResult,
} from './core/render';
import {
  writeWav,
  writeManifest,
  recipeToManifestEntry,
  computeRecipeHash,
  readManifest,
  findOrphanWavs,
} from './export/wav';
import { RNG } from './core/random';
import { assertValidRecipe } from './design/validator';

export interface GenerateSoundResult extends NormalizationResult {
  file: string;
  hash: string;
  cached: boolean;
}

export interface GenerateSetResult {
  files: string[];
  entries: ManifestEntry[];
  renderedCount: number;
  cachedCount: number;
  orphans: string[];
}

export async function generateSoundDetailed(
  recipe: SoundRecipe,
  options: GenerateOptions = {}
): Promise<GenerateSoundResult> {
  assertValidRecipe(recipe);
  const out = options.outDir ?? './sounds';
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const bitDepth = options.bitDepth ?? 16;
  const variants = Math.max(1, options.variants ?? 1);
  const baseSeed = options.seed ?? 42;

  const manifest = readManifest(out);
  const manifestMap = new Map<string, ManifestEntry>();
  if (manifest && Array.isArray(manifest.sounds)) {
    for (const entry of manifest.sounds) {
      manifestMap.set(entry.file, entry);
    }
  }

  let lastFile = '';
  let lastNorm: NormalizationResult = { gainDb: 0, limitedByPeak: false };
  let lastHash = '';
  let allCached = true;

  for (let v = 0; v < variants; v++) {
    const hash = computeRecipeHash(recipe, options, v);
    lastHash = hash;

    const suffix = variants > 1 ? `_${v + 1}` : '';
    const relFile = path.join(recipe.category, `${recipe.name}${suffix}.wav`).replace(/\\/g, '/');
    const file = path.join(out, relFile);

    const existingEntry =
      manifestMap.get(relFile) ??
      manifestMap.get(path.join(recipe.category, `${recipe.name}.wav`).replace(/\\/g, '/'));

    const isCacheHit =
      options.force !== true &&
      fs.existsSync(file) &&
      existingEntry &&
      existingEntry.hash === hash;

    if (isCacheHit && existingEntry) {
      lastFile = file;
      lastNorm = {
        gainDb: existingEntry.gainDb ?? 0,
        limitedByPeak: existingEntry.limitedByPeak ?? false,
      };
    } else {
      allCached = false;
      const rng = new RNG(baseSeed + v * 9973);
      const samples = await render(recipe, options, rng);
      const norm = applyLoudnessNormalization(
        samples,
        options.targetRmsDb,
        options.peakCeilingDb
      );
      lastNorm = norm;

      const peakDb = options.targetRmsDb !== undefined ? undefined : (options.peakDb ?? -1);
      writeWav(samples, file, sampleRate, peakDb, bitDepth);
      lastFile = file;
    }
  }

  return {
    file: lastFile,
    hash: lastHash,
    cached: allCached,
    ...lastNorm,
  };
}

export async function generateSound(
  recipe: SoundRecipe,
  options: GenerateOptions = {}
): Promise<string> {
  const detailed = await generateSoundDetailed(recipe, options);
  return detailed.file;
}

export async function generateSetDetailed(
  recipes: SoundRecipe[],
  options: GenerateOptions = {}
): Promise<GenerateSetResult> {
  const outDir = options.outDir ?? './sounds';
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const bitDepth = options.bitDepth ?? 16;
  const variants = Math.max(1, options.variants ?? 1);
  const onProgress = options.onProgress;
  const files: string[] = [];
  const entries: ManifestEntry[] = [];
  const activeRelFiles = new Set<string>();
  const total = recipes.length;
  const startedAt = Date.now();
  let renderedCount = 0;
  let cachedCount = 0;

  const emit = (partial: Omit<GenerateProgressEvent, 'elapsedMs'>) => {
    if (!onProgress) return;
    onProgress({
      ...partial,
      elapsedMs: Date.now() - startedAt,
    });
  };

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    const index = i + 1;

    emit({
      index,
      total,
      name: r.name,
      category: r.category,
      phase: 'start',
    });

    const detailed = await generateSoundDetailed(r, options);
    files.push(detailed.file);

    if (detailed.cached) {
      cachedCount++;
    } else {
      renderedCount++;
    }

    const rel = path.relative(outDir, detailed.file).replace(/\\/g, '/');
    const baseRel =
      variants > 1
        ? path.join(r.category, `${r.name}.wav`).replace(/\\/g, '/')
        : rel;

    for (let v = 0; v < variants; v++) {
      const suffix = variants > 1 ? `_${v + 1}` : '';
      const vRel = path.join(r.category, `${r.name}${suffix}.wav`).replace(/\\/g, '/');
      activeRelFiles.add(vRel);
    }

    entries.push(
      recipeToManifestEntry(r, baseRel, variants, {
        hash: detailed.hash,
        gainDb: detailed.gainDb,
        limitedByPeak: detailed.limitedByPeak,
      })
    );

    emit({
      index,
      total,
      name: r.name,
      category: r.category,
      phase: 'done',
      file: detailed.file,
    });
  }

  if (options.manifest !== false) {
    writeManifest(outDir, sampleRate, entries, bitDepth);
  }

  const orphans = findOrphanWavs(outDir, activeRelFiles);

  return {
    files,
    entries,
    renderedCount,
    cachedCount,
    orphans,
  };
}

export async function generateSet(
  recipes: SoundRecipe[],
  options: GenerateOptions = {}
): Promise<string[]> {
  const detailed = await generateSetDetailed(recipes, options);
  return detailed.files;
}
