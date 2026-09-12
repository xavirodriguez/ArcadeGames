import { SoundRecipe, GenerateOptions, LayerSpec, Wave, Envelope } from './types';
import { RNG } from './random';

/** Default offline sample rate — half of CD audio, plenty for arcade SFX. */
export const DEFAULT_SAMPLE_RATE = 22050;

/** Biquad filter using RBJ Cookbook formulas for lowpass, highpass, bandpass */
class BiquadFilter {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private lastFc = -1;

  constructor(
    private type: 'lowpass' | 'highpass' | 'bandpass',
    private sampleRate: number,
    private q: number = 1.0
  ) {}

  private updateCoefficients(cutoffHz: number) {
    const fc = Math.max(10, Math.min(this.sampleRate * 0.49, cutoffHz));
    if (Math.abs(fc - this.lastFc) < 1e-5) return;
    this.lastFc = fc;

    const w0 = (2 * Math.PI * fc) / this.sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * this.q);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let a0 = 1;
    let a1 = 0;
    let a2 = 0;

    if (this.type === 'lowpass') {
      b0 = (1 - cosw0) / 2;
      b1 = 1 - cosw0;
      b2 = (1 - cosw0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosw0;
      a2 = 1 - alpha;
    } else if (this.type === 'highpass') {
      b0 = (1 + cosw0) / 2;
      b1 = -(1 + cosw0);
      b2 = (1 + cosw0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosw0;
      a2 = 1 - alpha;
    } else {
      // bandpass
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosw0;
      a2 = 1 - alpha;
    }

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  process(sample: number, cutoffHz: number): number {
    this.updateCoefficients(cutoffHz);
    const y =
      this.b0 * sample +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;

    this.x2 = this.x1;
    this.x1 = sample;
    this.y2 = this.y1;
    this.y1 = y;

    return y;
  }
}

/** Compute ADSR envelope gain at time t relative to layer start */
function getEnvelope(t: number, totalDur: number, envSpec?: Envelope): number {
  if (t < 0) return 0;
  const attack = Math.max(0, envSpec?.attack ?? 0.001);
  const decay = Math.max(0.0001, envSpec?.decay ?? 0.08);
  const sustain = envSpec?.sustain ?? 0;
  const release = Math.max(0.0001, envSpec?.release ?? 0.01);

  // Calculate gain at totalDur (onset of release phase)
  let gainAtDur = sustain;
  if (totalDur < attack) {
    gainAtDur = attack > 0 ? totalDur / attack : 1;
  } else if (totalDur < attack + decay) {
    const p = (totalDur - attack) / decay;
    gainAtDur = 1 - (1 - sustain) * p;
  }

  // Release phase: t >= totalDur
  if (t >= totalDur) {
    const relProgress = (t - totalDur) / release;
    if (relProgress >= 1) return 0;
    return Math.max(0, gainAtDur * (1 - relProgress));
  }

  // Active phase: 0 <= t < totalDur
  if (t < attack) {
    return attack > 0 ? t / attack : 1;
  }

  if (t < attack + decay) {
    const p = (t - attack) / decay;
    return 1 - (1 - sustain) * Math.min(1, Math.max(0, p));
  }

  return sustain;
}

/** Evaluate oscillator sample given normalized phase in [0, 1) */
function getOscSample(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'triangle':
      return 4 * Math.abs(p - 0.5) - 1;
    case 'sawtooth':
      return 2 * p - 1;
    default:
      return Math.sin(2 * Math.PI * p);
  }
}

/** Very light soft-clip / saturation for arcade colour. */
function softSaturate(samples: Float32Array, amount = 0.35): Float32Array {
  const out = new Float32Array(samples.length);
  const k = 1 + amount * 2;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] * k;
    out[i] = Math.tanh(x) / Math.tanh(k);
  }
  return out;
}

/** Simple bit-reduction for retro feel (0 = off, 1 = heavy). */
function bitcrush(samples: Float32Array, amount: number): Float32Array {
  if (amount <= 0) return samples;
  const bits = Math.max(4, Math.round(16 - amount * 12));
  const step = 1 / Math.pow(2, bits - 1);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = Math.round(samples[i] / step) * step;
  }
  return out;
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
  const totalSamples = Math.ceil(duration * sampleRate);
  const buffer = new Float32Array(totalSamples);

  for (const original of recipe.layers) {
    const levelJitter = rng.centered(recipe.variation?.levelDb ?? 0);
    const durJitter = 1 + rng.centered(recipe.variation?.duration ?? 0);
    const pitchJitter = 1 + rng.centered(recipe.variation?.pitch ?? 0);

    const l: LayerSpec = {
      ...original,
      level: (original.level ?? -10) + levelJitter,
      duration: original.duration ?? duration,
    };

    const at = l.start ?? 0;
    const dur = Math.max(0.01, (l.duration ?? 0.1) * durJitter);
    const startSample = Math.max(0, Math.floor(at * sampleRate));

    const envRelease = l.envelope?.release ?? 0.01;
    const endSample = Math.min(
      totalSamples,
      Math.ceil((at + dur + envRelease) * sampleRate)
    );

    const gainLinear = Math.pow(10, (l.level ?? -10) / 20);

    if (l.kind === 'noise' || l.kind === 'whoosh') {
      const filterType = l.filter?.type ?? 'lowpass';
      const filter = new BiquadFilter(filterType, sampleRate);

      const startF =
        (l.filter?.minHz ?? (l.kind === 'whoosh' ? 400 : 4000)) * pitchJitter;
      const endF =
        l.kind === 'whoosh'
          ? (l.filter?.maxHz ?? l.filter?.minHz ?? 4000) * pitchJitter
          : startF;

      for (let i = startSample; i < endSample; i++) {
        const t = i / sampleRate - at;
        const env = getEnvelope(t, dur, l.envelope);
        if (env <= 0) continue;

        const pNorm = Math.min(1, Math.max(0, t / dur));
        const fc = startF + (endF - startF) * pNorm;

        const rawNoise = Math.random() * 2 - 1;
        const filtered = filter.process(rawNoise, fc);
        buffer[i] += filtered * env * gainLinear;
      }
      continue;
    }

    if (l.kind === 'chord') {
      const frequencies = (l.frequencies ?? []).map((f) => f * pitchJitter);
      const wave = l.wave ?? 'sine';
      const phases = new Float64Array(frequencies.length);
      const filter = l.filter
        ? new BiquadFilter(l.filter.type ?? 'lowpass', sampleRate)
        : null;
      const fc = (l.filter?.minHz ?? 1000) * pitchJitter;

      for (let i = startSample; i < endSample; i++) {
        const t = i / sampleRate - at;
        const env = getEnvelope(t, dur, l.envelope);
        if (env <= 0) continue;

        let chordSum = 0;
        for (let k = 0; k < frequencies.length; k++) {
          phases[k] += frequencies[k] / sampleRate;
          chordSum += getOscSample(wave, phases[k]);
        }

        if (filter) {
          chordSum = filter.process(chordSum, fc);
        }

        buffer[i] += chordSum * env * gainLinear;
      }
      continue;
    }

    // Tone, Click, Zap, SubBoom
    const wave = l.wave ?? (l.kind === 'zap' ? 'square' : 'sine');
    const p = l.pitch;
    const startHz = (p?.startHz ?? l.frequency ?? 440) * pitchJitter;
    const endHz = p?.endHz != null ? p.endHz * pitchJitter : startHz;
    const curve = p?.curve ?? 'exponential';

    const filter = l.filter
      ? new BiquadFilter(l.filter.type ?? 'lowpass', sampleRate)
      : null;

    let phase = 0;

    for (let i = startSample; i < endSample; i++) {
      const t = i / sampleRate - at;
      const env = getEnvelope(t, dur, l.envelope);
      if (env <= 0) continue;

      const progress = Math.min(1, Math.max(0, t / dur));
      let currentHz = startHz;
      if (endHz !== startHz) {
        if (curve === 'linear') {
          currentHz = startHz + (endHz - startHz) * progress;
        } else {
          currentHz =
            startHz * Math.pow(Math.max(0.0001, endHz / startHz), progress);
        }
      }
      currentHz = Math.max(20, currentHz);

      phase += currentHz / sampleRate;
      let osc = getOscSample(wave, phase);

      if (filter) {
        osc = filter.process(osc, (l.filter?.minHz ?? currentHz) * pitchJitter);
      }

      buffer[i] += osc * env * gainLinear;
    }
  }

  let samples: Float32Array = buffer;

  // Soft edges for loop recipes so engines can crossfade cleanly.
  if (recipe.loop) {
    const fadeSamples = Math.min(
      Math.floor(sampleRate * 0.012),
      Math.floor(samples.length / 8)
    );
    for (let i = 0; i < fadeSamples; i++) {
      const g = i / fadeSamples;
      samples[i] *= g;
      samples[samples.length - 1 - i] *= g;
    }
  }

  if (options.arcadeColor) {
    samples = softSaturate(samples, 0.28);
  }

  if (recipe.bitcrush && recipe.bitcrush > 0) {
    samples = bitcrush(samples, recipe.bitcrush);
  }

  return samples;
}
