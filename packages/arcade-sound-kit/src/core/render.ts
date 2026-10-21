import { SoundRecipe, MusicRecipe, GenerateOptions, LayerSpec } from './types';
import { renderMusic } from '../music/renderMusic';
import { RNG } from './random';
import { layerRenderers, LayerRendererContext } from './renderers';
import { applyEffectsChain, estimateEffectsTailSeconds } from './effects/chain';

export { BiquadFilter } from './dsp/biquad';
export { computeEnvelope } from './dsp/envelope';
export { polyBlep, evalWave } from './dsp/oscillators';
export { renderVoice, type Voice, type RenderVoiceContext } from './dsp/voice';

export const RENDER_VERSION = '0.3.1';

/** Default offline sample rate — half of CD audio, plenty for arcade SFX. */
export const DEFAULT_SAMPLE_RATE = 22050;

export interface NormalizationResult {
  gainDb: number;
  limitedByPeak: boolean;
}

export interface RenderFinalResult {
  samples: Float32Array;
  sampleRate: number;
  norm: NormalizationResult;
}

/**
 * Pure rendering pipeline: renders a sound recipe, applies loudness normalization,
 * and returns Float32Array samples without filesystem, path, or manifest I/O.
 */
export async function renderFinal(
  recipe: SoundRecipe | MusicRecipe,
  options: GenerateOptions = {},
  variantIndex = 0
): Promise<RenderFinalResult> {
  const baseSeed = options.seed ?? 42;
  const rng = new RNG(baseSeed).fork(variantIndex);
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;

  let samples: Float32Array;
  if ('tracks' in recipe && Array.isArray((recipe as MusicRecipe).tracks)) {
    const res = await renderMusic(recipe as MusicRecipe, options);
    samples = res.samples;
  } else {
    samples = await render(recipe as SoundRecipe, options, rng);
  }

  const norm = applyLoudnessNormalization(
    samples,
    options.targetRmsDb,
    options.peakCeilingDb
  );

  if (options.targetRmsDb === undefined) {
    const peakDb = options.peakDb ?? -1;
    const peakLinear = Math.pow(10, peakDb / 20);
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    if (peak > 0) {
      const scale = peakLinear / peak;
      for (let i = 0; i < samples.length; i++) {
        samples[i] *= scale;
      }
    }
  }

  return {
    samples,
    sampleRate,
    norm,
  };
}

/**
 * Calculates RMS over active region (|x| >= 0.001 / -60 dBFS).
 * Returns RMS in linear scale float [0, 1].
 */
export function computeActiveRms(samples: Float32Array): number {
  const ACTIVE_THRESHOLD = 0.001;
  let first = -1;
  let last = -1;

  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) >= ACTIVE_THRESHOLD) {
      if (first === -1) first = i;
      last = i;
    }
  }

  if (first === -1) return 0;

  let sumSq = 0;
  for (let i = first; i <= last; i++) {
    sumSq += samples[i] * samples[i];
  }

  const count = last - first + 1;
  return Math.sqrt(sumSq / count);
}

/**
 * Normalizes Float32Array samples in-place to targetRmsDb.
 * Resets gain if peak would exceed peakCeilingDb (-1 dBFS by default).
 */
export function applyLoudnessNormalization(
  samples: Float32Array,
  targetRmsDb?: number,
  peakCeilingDb = -1
): NormalizationResult {
  if (targetRmsDb === undefined) {
    return { gainDb: 0, limitedByPeak: false };
  }

  const targetLinear = Math.pow(10, targetRmsDb / 20);
  const ceilingLinear = Math.pow(10, peakCeilingDb / 20);

  let totalGain = 1.0;
  let limitedByPeak = false;

  for (let iter = 0; iter < 3; iter++) {
    const rms = computeActiveRms(samples);
    if (rms === 0 || !Number.isFinite(rms)) break;

    const desiredStepGain = targetLinear / rms;
    let stepGain = desiredStepGain;

    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const absX = Math.abs(samples[i]);
      if (absX > peak) peak = absX;
    }

    const maxStepGain = peak > 0 ? ceilingLinear / peak : Infinity;
    if (stepGain > maxStepGain) {
      stepGain = maxStepGain;
      limitedByPeak = true;
    }

    for (let i = 0; i < samples.length; i++) {
      samples[i] *= stepGain;
    }

    totalGain *= stepGain;

    if (limitedByPeak || Math.abs(20 * Math.log10(desiredStepGain)) < 0.001) {
      break;
    }
  }

  const gainDb = 20 * Math.log10(totalGain);
  return {
    gainDb: Number.isFinite(gainDb) ? gainDb : 0,
    limitedByPeak,
  };
}

/** Very light soft-clip / saturation for arcade colour. */
function softSaturate(samples: Float32Array, amount = 0.35): Float32Array {
  const k = 1 + amount * 2;
  const tanhk = Math.tanh(k);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] * k;
    samples[i] = Math.tanh(x) / tanhk;
  }
  return samples;
}

/** Simple bit-reduction for retro feel (0 = off, 1 = heavy). */
function bitcrush(samples: Float32Array, amount: number): Float32Array {
  if (amount <= 0) return samples;
  const bits = Math.max(4, Math.round(16 - amount * 12));
  const step = 1 / Math.pow(2, bits - 1);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.round(samples[i] / step) * step;
  }
  return samples;
}

export async function render(
  recipe: SoundRecipe,
  options: GenerateOptions = {},
  rng = new RNG(options.seed)
): Promise<Float32Array> {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;

  // Loops get a slightly longer buffer so the engine can crossfade if needed.
  const baseDuration = Math.max(
    recipe.duration,
    ...recipe.layers.map((l) => (l.start ?? 0) + (l.duration ?? 0))
  );
  const duration = recipe.loop ? Math.max(baseDuration, 0.35) : baseDuration;

  const tailSeconds = estimateEffectsTailSeconds(recipe.effects);
  const totalDuration = duration + tailSeconds;

  const totalSamples = Math.round(totalDuration * sampleRate);
  let samples = new Float32Array(totalSamples);

  for (let layerIndex = 0; layerIndex < recipe.layers.length; layerIndex++) {
    const original = recipe.layers[layerIndex];
    const layerRng = rng.fork(layerIndex);

    const levelJitter = layerRng.centered(recipe.variation?.levelDb ?? 0);
    const durJitter = 1 + layerRng.centered(recipe.variation?.duration ?? 0);
    const pitchJitter = 1 + layerRng.centered(recipe.variation?.pitch ?? 0);

    const l: LayerSpec = {
      ...original,
      duration: original.duration ?? duration,
    };

    const ctx: LayerRendererContext = {
      recipe,
      sampleRate,
      pitchJitter,
      durJitter,
      levelJitter,
      layerRng,
      duration,
    };

    const renderer = (l.notes && l.notes.length > 0)
      ? layerRenderers.sequence
      : layerRenderers[l.kind];
    if (renderer) {
      renderer(samples, l, ctx);
    }
  }

  // Apply master effects chain
  if (recipe.effects && recipe.effects.length > 0) {
    samples = new Float32Array(applyEffectsChain(samples, recipe.effects, sampleRate));
  }

  // Constant-power crossfade for seamless loop recipes
  if (recipe.loop) {
    const crossfadeSamples = Math.min(
      Math.round(sampleRate * 0.015),
      Math.floor(samples.length * 0.25)
    );
    if (crossfadeSamples > 0 && samples.length > crossfadeSamples) {
      const outputLength = samples.length - crossfadeSamples;
      const looped = new Float32Array(outputLength);

      for (let i = 0; i < crossfadeSamples; i++) {
        const theta = (i / crossfadeSamples) * (Math.PI / 2);
        const wHead = Math.sin(theta);
        const wTail = Math.cos(theta);
        looped[i] = samples[i] * wHead + samples[outputLength + i] * wTail;
      }

      for (let i = crossfadeSamples; i < outputLength; i++) {
        looped[i] = samples[i];
      }

      samples = looped;
    }
  }

  if (options.arcadeColor) {
    softSaturate(samples, 0.28);
  }

  if (recipe.bitcrush && recipe.bitcrush > 0) {
    bitcrush(samples, recipe.bitcrush);
  }

  return samples;
}
