import { WaveFile } from 'wavefile';
import { sha256 } from './sha256';
import { SoundRecipe, GenerateOptions } from '../core/types';
import { DEFAULT_SAMPLE_RATE, RENDER_VERSION } from '../core/render';
import { RNG } from '../core/random';

function isObjectRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
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
    seed: new RNG(options.seed ?? 42).fork(variantIndex).fork('variant_seed').next(),
    targetRmsDb: options.targetRmsDb,
    peakCeilingDb: options.peakCeilingDb,
    peakDb: options.peakDb,
    bitDepth: options.bitDepth ?? 16,
    arcadeColor: options.arcadeColor ?? false,
    variants: options.variants ?? 1,
  };
  const str = canonicalJsonStringify(payload);
  return sha256(str);
}

export interface EncodeWavOptions {
  sampleRate?: number;
  bitDepth?: 16 | 32;
  peakDb?: number;
  seed?: number;
}

/**
 * Pure WAV encoder: converts Float32Array samples to a mono PCM WAV Uint8Array buffer
 * with optional peak normalization and TPDF dither. Pure in-memory operation (no I/O).
 */
export function encodeWav(
  samples: Float32Array,
  options: EncodeWavOptions = {}
): Uint8Array {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const bitDepth = options.bitDepth ?? 16;
  const peakDb = options.peakDb;
  const seed = options.seed ?? 42;

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
    // 16-bit signed PCM with TPDF dither
    const ditherRng = new RNG(seed).fork('tpdf_dither');
    const out = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const scaled = samples[i] * gain;
      const ditherLsb = ditherRng.next() - ditherRng.next();
      const lsbScale = scaled < 0 ? 0x8000 : 0x7fff;
      const ditheredLsb = scaled * lsbScale + ditherLsb;
      const clampedInt16 = Math.max(-0x8000, Math.min(0x7fff, Math.round(ditheredLsb)));
      out[i] = clampedInt16;
    }
    wav.fromScratch(1, sampleRate, '16', [out]);
  }

  return wav.toBuffer();
}
