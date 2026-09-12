import * as Tone from 'tone';
import { SoundRecipe, GenerateOptions, LayerSpec } from './types';
import { RNG } from './random';

const hzToNote = (hz: number) => Tone.Frequency(hz, 'hz').toNote();

/** Default offline sample rate — half of CD audio, plenty for arcade SFX. */
export const DEFAULT_SAMPLE_RATE = 22050;

function makeNoise(
  layer: LayerSpec,
  ctx: Tone.OfflineContext
): { noise: Tone.NoiseSynth; filter: Tone.Filter } {
  const noise = new Tone.NoiseSynth({
    context: ctx,
    noise: { type: 'white' },
    envelope: {
      attack: layer.envelope?.attack ?? 0.001,
      decay: layer.envelope?.decay ?? 0.08,
      sustain: 0,
      release: layer.envelope?.release ?? 0.01,
    },
  });
  const filter = new Tone.Filter({
    context: ctx,
    frequency: layer.filter?.minHz ?? 4000,
    type: layer.filter?.type ?? 'lowpass',
  });
  noise.connect(filter);
  return { noise, filter };
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

  // Isolated OfflineContext — never touch the global Tone context.
  const ctx = new Tone.OfflineContext(1, duration, sampleRate);
  // Simple gain bus; peak limiting is done in writeWav (cheaper than Tone.Limiter).
  const master = new Tone.Gain({ context: ctx, gain: 1 }).toDestination();

  const disposables: { dispose: () => void }[] = [master];

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

    if (l.kind === 'noise' || l.kind === 'whoosh') {
      const { noise, filter } = makeNoise(l, ctx);
      disposables.push(noise, filter);
      filter.connect(master);

      if (l.kind === 'whoosh' && l.filter) {
        const startF = (l.filter.minHz ?? 400) * pitchJitter;
        const endF = (l.filter.maxHz ?? l.filter.minHz ?? 4000) * pitchJitter;
        filter.frequency.setValueAtTime(startF, at);
        filter.frequency.linearRampToValueAtTime(endF, at + dur);
      }

      noise.volume.value = l.level ?? -12;
      noise.triggerAttackRelease(dur, at);
      continue;
    }

    const wave = l.wave ?? (l.kind === 'zap' ? 'square' : 'sine');
    const p = l.pitch;
    const startHz = (p?.startHz ?? l.frequency ?? 440) * pitchJitter;
    const endHz = p?.endHz != null ? p.endHz * pitchJitter : undefined;
    const curve = p?.curve ?? 'exponential';

    if (l.kind === 'chord') {
      // PolySynth options overload accepts `context`; the (voice, options)
      // overload only types voice SynthOptions and rejects `context`.
      const poly = new Tone.PolySynth({
        context: ctx,
        maxPolyphony: 8,
        voice: Tone.Synth,
        options: {
          oscillator: { type: wave },
          envelope: {
            attack: 0.005,
            decay: l.envelope?.decay ?? 0.1,
            sustain: 0,
            release: 0.02,
          },
        },
      }).connect(master);
      disposables.push(poly);
      poly.volume.value = l.level ?? -10;
      const notes = (l.frequencies ?? []).map((hz) => hzToNote(hz * pitchJitter));
      poly.triggerAttackRelease(notes, dur, at);
      continue;
    }

    const synth = new Tone.Synth({
      context: ctx,
      oscillator: { type: wave },
      envelope: {
        attack: l.envelope?.attack ?? 0.001,
        decay: l.envelope?.decay ?? 0.08,
        sustain: l.envelope?.sustain ?? 0,
        release: l.envelope?.release ?? 0.01,
      },
    }).connect(master);
    disposables.push(synth);

    synth.volume.value = l.level ?? -10;
    synth.frequency.setValueAtTime(startHz, at);

    if (endHz != null && endHz !== startHz) {
      if (curve === 'linear') {
        synth.frequency.linearRampToValueAtTime(Math.max(20, endHz), at + dur);
      } else {
        synth.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), at + dur);
      }
    }

    synth.triggerAttackRelease(hzToNote(startHz), dur, at);
  }

  // Synchronous offline clock — no setTimeout yields (CLI has no UI to keep alive).
  const rendered = await ctx.render(false);

  for (const node of disposables) {
    try {
      node.dispose();
    } catch {
      /* ignore dispose races after render */
    }
  }
  try {
    await ctx.close();
  } catch {
    /* OfflineContext may already be closed after render */
  }

  let samples = rendered.getChannelData(0);

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
