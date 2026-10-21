import { encodeWav } from './encoder';
import type { SoundRecipe } from '../core/types';
import { renderFinal } from '../core/render';

export interface SpriteOffset {
  name: string;
  category: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  startSample: number;
  endSample: number;
}

export interface SoundSpriteSheet {
  audioFile: string;
  sampleRate: number;
  sprites: Record<string, SpriteOffset>;
  wavBytes: Uint8Array;
}

export interface SpriteSheetOptions {
  sampleRate?: number;
  paddingMs?: number;
  audioFileName?: string;
  seed?: number;
}

export async function generateSpriteSheet(
  recipes: SoundRecipe[],
  options: SpriteSheetOptions = {}
): Promise<SoundSpriteSheet> {
  const sampleRate = options.sampleRate ?? 22050;
  const paddingMs = options.paddingMs ?? 50;
  const paddingSamples = Math.round((paddingMs / 1000) * sampleRate);
  const audioFile = options.audioFileName ?? 'spritesheet.wav';
  const seed = options.seed ?? 42;

  let totalSamplesCount = 0;
  const renderedBuffers: { recipe: SoundRecipe; samples: Float32Array }[] = [];

  for (const r of recipes) {
    const { samples } = await renderFinal(r, { sampleRate, seed }, 0);
    renderedBuffers.push({ recipe: r, samples });
    totalSamplesCount += samples.length + paddingSamples;
  }

  const combinedSamples = new Float32Array(totalSamplesCount);
  const sprites: Record<string, SpriteOffset> = {};
  let currentSampleOffset = 0;

  for (const item of renderedBuffers) {
    const startSample = currentSampleOffset;
    combinedSamples.set(item.samples, startSample);
    const endSample = startSample + item.samples.length;

    const startMs = Math.round((startSample / sampleRate) * 1000 * 100) / 100;
    const endMs = Math.round((endSample / sampleRate) * 1000 * 100) / 100;
    const durationMs = Math.round((item.samples.length / sampleRate) * 1000 * 100) / 100;

    sprites[item.recipe.name] = {
      name: item.recipe.name,
      category: item.recipe.category,
      startMs,
      endMs,
      durationMs,
      startSample,
      endSample,
    };

    currentSampleOffset = endSample + paddingSamples;
  }

  const wavBytes = encodeWav(combinedSamples, { sampleRate, seed });

  return {
    audioFile,
    sampleRate,
    sprites,
    wavBytes,
  };
}
