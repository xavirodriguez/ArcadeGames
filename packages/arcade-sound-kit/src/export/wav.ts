import fs from 'node:fs';
import path from 'node:path';
import { WaveFile } from 'wavefile';
import { ManifestEntry, SoundManifest, SoundRecipe } from '../core/types';

export function writeWav(
  samples: Float32Array,
  file: string,
  sampleRate = 44100,
  peakDb = -1
) {
  let peak = 0;
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  const target = Math.pow(10, peakDb / 20);
  const gain = peak > 0 ? target / peak : 1;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;

  const wav = new WaveFile();
  wav.fromScratch(1, sampleRate, '32f', [out]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  wav.toFile(file);
}

export function writeManifest(
  outDir: string,
  sampleRate: number,
  entries: ManifestEntry[]
) {
  const manifest: SoundManifest = {
    version: '0.2.0',
    sampleRate,
    generatedAt: new Date().toISOString(),
    sounds: entries,
  };
  const file = path.join(outDir, 'manifest.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  return file;
}

export function recipeToManifestEntry(
  recipe: SoundRecipe,
  relativeFile: string,
  variants = 1
): ManifestEntry {
  return {
    name: recipe.name,
    category: recipe.category,
    duration: recipe.duration,
    loop: !!recipe.loop,
    tags: recipe.tags ?? [],
    file: relativeFile,
    variants: variants > 1 ? variants : undefined,
  };
}
