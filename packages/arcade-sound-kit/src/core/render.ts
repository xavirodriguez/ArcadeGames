import { SoundRecipe, GenerateOptions, LayerSpec, Wave } from './types';
import { RNG } from './random';

/** Default offline sample rate — half of CD audio, plenty for arcade SFX. */
export const DEFAULT_SAMPLE_RATE = 22050;

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

function evalWave(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'sawtooth':
      return 2 * p - 1;
    case 'triangle':
      return 2 * Math.abs(2 * (p - Math.floor(p + 0.5))) - 1;
    default:
      return Math.sin(2 * Math.PI * p);
  }
}

function computeEnvelope(
  tRel: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  duration: number
): number {
  if (tRel < 0) return 0;
  if (tRel < attack) {
    return attack > 0 ? tRel / attack : 1;
  }
  if (tRel < attack + decay) {
    const p = decay > 0 ? (tRel - attack) / decay : 1;
    return 1 + (sustain - 1) * Math.min(1, Math.max(0, p));
  }
  if (tRel < duration) {
    return sustain;
  }
  if (tRel < duration + release) {
    let levelAtDur = sustain;
    if (duration < attack) {
      levelAtDur = attack > 0 ? duration / attack : 1;
    } else if (duration < attack + decay) {
      const p = decay > 0 ? (duration - attack) / decay : 1;
      levelAtDur = 1 + (sustain - 1) * Math.min(1, Math.max(0, p));
    }
    const relP = release > 0 ? (tRel - duration) / release : 1;
    return levelAtDur * Math.max(0, 1 - relP);
  }
  return 0;
}

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

  private lastFreq = -1;
  private lastType = '';

  update(type: 'lowpass' | 'highpass' | 'bandpass', freq: number, sampleRate: number, Q = 1.0) {
    if (freq === this.lastFreq && type === this.lastType) return;
    this.lastFreq = freq;
    this.lastType = type;

    const f0 = Math.max(10, Math.min(freq, sampleRate / 2 - 10));
    const omega0 = (2 * Math.PI * f0) / sampleRate;
    const cosW = Math.cos(omega0);
    const sinW = Math.sin(omega0);
    const alpha = sinW / (2 * Q);

    let b0 = 0,
      b1 = 0,
      b2 = 0,
      a0 = 1,
      a1 = 0,
      a2 = 0;

    if (type === 'highpass') {
      b0 = (1 + cosW) / 2;
      b1 = -(1 + cosW);
      b2 = (1 + cosW) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    } else if (type === 'bandpass') {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    } else {
      // lowpass
      b0 = (1 - cosW) / 2;
      b1 = 1 - cosW;
      b2 = (1 - cosW) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    }

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  process(x: number): number {
    const y =
      this.b0 * x +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
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

  const totalSamples = Math.ceil(duration * sampleRate);
  let samples = new Float32Array(totalSamples);

  for (const original of recipe.layers) {
    const levelJitter = rng.centered(recipe.variation?.levelDb ?? 0);
    const durJitter = 1 + rng.centered(recipe.variation?.duration ?? 0);
    const pitchJitter = 1 + rng.centered(recipe.variation?.pitch ?? 0);

    const defaultLevel =
      original.kind === 'noise' || original.kind === 'whoosh' ? -12 : -10;
    const levelVal = (original.level ?? defaultLevel) + levelJitter;
    const l: LayerSpec = {
      ...original,
      level: levelVal,
      duration: original.duration ?? duration,
    };

    const at = l.start ?? 0;
    const dur = Math.max(0.01, (l.duration ?? 0.1) * durJitter);
    const gainLinear = dbToLinear(levelVal);

    const attack =
      l.envelope?.attack ??
      (l.kind === 'noise' || l.kind === 'click' ? 0.001 : 0.005);
    const decay = l.envelope?.decay ?? 0.08;
    const sustain = l.envelope?.sustain ?? 0;
    const release = l.envelope?.release ?? 0.01;

    const sampleStart = Math.floor(at * sampleRate);
    const sampleEnd = Math.min(
      samples.length,
      Math.floor((at + dur + release) * sampleRate)
    );

    if (l.kind === 'noise' || l.kind === 'whoosh') {
      const filter = new BiquadFilter();
      const filterType = l.filter?.type ?? 'lowpass';
      const isWhoosh = l.kind === 'whoosh';
      const startF = (l.filter?.minHz ?? (isWhoosh ? 400 : 4000)) * pitchJitter;
      const endF =
        (l.filter?.maxHz ?? l.filter?.minHz ?? (isWhoosh ? 4000 : startF)) *
        pitchJitter;

      for (let i = sampleStart; i < sampleEnd; i++) {
        const tRel = (i - sampleStart) / sampleRate;
        const n = rng.centered(1);

        let fFilter = startF;
        if (isWhoosh) {
          const p = dur > 0 ? Math.min(1, Math.max(0, tRel / dur)) : 1;
          fFilter = startF + (endF - startF) * p;
        }

        filter.update(filterType, fFilter, sampleRate);
        const filtered = filter.process(n);
        const env = computeEnvelope(tRel, attack, decay, sustain, release, dur);
        samples[i] += filtered * env * gainLinear;
      }
      continue;
    }

    if (l.kind === 'chord') {
      const wave = l.wave ?? 'sine';
      const freqs = (l.frequencies ?? []).map((hz) => hz * pitchJitter);
      const phases = new Float64Array(freqs.length);

      for (let i = sampleStart; i < sampleEnd; i++) {
        const tRel = (i - sampleStart) / sampleRate;
        const env = computeEnvelope(tRel, attack, decay, sustain, release, dur);
        let mix = 0;
        for (let k = 0; k < freqs.length; k++) {
          const hz = Math.max(10, Math.min(freqs[k], sampleRate / 2 - 10));
          phases[k] = (phases[k] + hz / sampleRate) % 1;
          mix += evalWave(wave, phases[k]);
        }
        samples[i] += mix * env * gainLinear;
      }
      continue;
    }

    const wave = l.wave ?? (l.kind === 'zap' ? 'square' : 'sine');
    const p = l.pitch;
    const startHz = (p?.startHz ?? l.frequency ?? 440) * pitchJitter;
    const endHz = p?.endHz != null ? p.endHz * pitchJitter : undefined;
    const curve = p?.curve ?? 'exponential';

    let phase = 0;
    for (let i = sampleStart; i < sampleEnd; i++) {
      const tRel = (i - sampleStart) / sampleRate;

      let f = startHz;
      if (endHz != null && endHz !== startHz) {
        const progress = dur > 0 ? Math.min(1, Math.max(0, tRel / dur)) : 1;
        if (curve === 'linear') {
          f = startHz + (endHz - startHz) * progress;
        } else {
          const safeEnd = Math.max(10, endHz);
          const safeStart = Math.max(10, startHz);
          f = safeStart * Math.pow(safeEnd / safeStart, progress);
        }
      }

      f = Math.max(10, Math.min(f, sampleRate / 2 - 10));
      phase = (phase + f / sampleRate) % 1;

      const osc = evalWave(wave, phase);
      const env = computeEnvelope(tRel, attack, decay, sustain, release, dur);
      samples[i] += osc * env * gainLinear;
    }
  }

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
    softSaturate(samples, 0.28);
  }

  if (recipe.bitcrush && recipe.bitcrush > 0) {
    bitcrush(samples, recipe.bitcrush);
  }

  return samples;
}
