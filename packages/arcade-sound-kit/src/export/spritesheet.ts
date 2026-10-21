import { encodeWav } from './encoder';
import type { SoundRecipe } from '../core/types';
import { renderFinal } from '../core/render';

/** Howler audio sprite tuple format: [startMs, durationMs, loop] */
export type HowlerSpriteTuple = [number, number, boolean];

export interface SoundSpriteSheet {
  audioFile: string;
  sampleRate: number;
  /** Howler-compatible audio sprite definitions */
  urls: string[];
  sprite: Record<string, HowlerSpriteTuple>;
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
  const sprite: Record<string, HowlerSpriteTuple> = {};
  let currentSampleOffset = 0;

  for (const item of renderedBuffers) {
    const startSample = currentSampleOffset;
    combinedSamples.set(item.samples, startSample);
    const endSample = startSample + item.samples.length;

    const startMs = Math.round((startSample / sampleRate) * 1000 * 100) / 100;
    const durationMs = Math.round((item.samples.length / sampleRate) * 1000 * 100) / 100;

    // Howler format: [startMs, durationMs, loop]
    sprite[item.recipe.name] = [startMs, durationMs, item.recipe.loop ?? false];

    currentSampleOffset = endSample + paddingSamples;
  }

  // Peak normalize combined sprite sheet samples <= 0.95
  let maxPeak = 0;
  for (let i = 0; i < combinedSamples.length; i++) {
    const abs = Math.abs(combinedSamples[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  if (maxPeak > 0) {
    const scale = 0.95 / maxPeak;
    for (let i = 0; i < combinedSamples.length; i++) {
      combinedSamples[i] *= scale;
    }
  }

  const wavBytes = encodeWav(combinedSamples, { sampleRate, seed });

  return {
    audioFile,
    sampleRate,
    urls: [audioFile],
    sprite,
    wavBytes,
  };
}
