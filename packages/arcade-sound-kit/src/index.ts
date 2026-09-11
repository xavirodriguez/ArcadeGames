export * from './core/types';
export * from './core/random';
export * from './design/recipe';
export * from './effects/primitives';
export * from './design/pack';
export { DEFAULT_SAMPLE_RATE } from './core/render';

import path from 'node:path';
import {
  SoundRecipe,
  GenerateOptions,
  ManifestEntry,
  GenerateProgressEvent,
} from './core/types';
import { render, DEFAULT_SAMPLE_RATE } from './core/render';
import { writeWav, writeManifest, recipeToManifestEntry } from './export/wav';
import { RNG } from './core/random';

export async function generateSound(
  recipe: SoundRecipe,
  options: GenerateOptions = {}
): Promise<string> {
  const out = options.outDir ?? './sounds';
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const bitDepth = options.bitDepth ?? 16;
  const variants = Math.max(1, options.variants ?? 1);
  const baseSeed = options.seed ?? 42;

  let lastFile = '';
  for (let v = 0; v < variants; v++) {
    const rng = new RNG(baseSeed + v * 9973);
    const samples = await render(recipe, options, rng);
    const suffix = variants > 1 ? `_${v + 1}` : '';
    const file = path.join(out, recipe.category, `${recipe.name}${suffix}.wav`);
    writeWav(samples, file, sampleRate, options.peakDb ?? -1, bitDepth);
    lastFile = file;
  }
  return lastFile;
}

export async function generateSet(
  recipes: SoundRecipe[],
  options: GenerateOptions = {}
): Promise<string[]> {
  const outDir = options.outDir ?? './sounds';
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const bitDepth = options.bitDepth ?? 16;
  const variants = Math.max(1, options.variants ?? 1);
  const onProgress = options.onProgress;
  const files: string[] = [];
  const entries: ManifestEntry[] = [];
  const total = recipes.length;
  const startedAt = Date.now();

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

    const file = await generateSound(r, options);
    files.push(file);

    const rel = path.relative(outDir, file).replace(/\\/g, '/');
    // If variants > 1 the last file is _N; store the pattern without suffix for manifest.
    const baseRel =
      variants > 1
        ? path.join(r.category, `${r.name}.wav`).replace(/\\/g, '/')
        : rel;
    entries.push(recipeToManifestEntry(r, baseRel, variants));

    emit({
      index,
      total,
      name: r.name,
      category: r.category,
      phase: 'done',
      file,
    });
  }

  if (options.manifest !== false) {
    writeManifest(outDir, sampleRate, entries, bitDepth);
  }

  return files;
}
