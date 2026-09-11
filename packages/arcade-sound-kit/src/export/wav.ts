import fs from 'node:fs';
import path from 'node:path';
import { WaveFile } from 'wavefile';
import { ManifestEntry, SoundManifest, SoundRecipe } from '../core/types';
import { DEFAULT_SAMPLE_RATE } from '../core/render';

/**
 * Write mono PCM16 WAV (default) after peak-normalizing to peakDb.
 * PCM16 is ~half the size of float32 and fine for arcade SFX.
 */
export function writeWav(
  samples: Float32Array,
  file: string,
  sampleRate = DEFAULT_SAMPLE_RATE,
  peakDb = -1,
  bitDepth: 16 | 32 = 16
) {
  let peak = 0;
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  const target = Math.pow(10, peakDb / 20);
  const gain = peak > 0 ? target / peak : 1;

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
    version: '0.2.0',
    sampleRate,
    bitDepth,
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
