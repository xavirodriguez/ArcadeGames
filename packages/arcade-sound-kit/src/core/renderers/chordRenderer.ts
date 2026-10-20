import { LayerSpec } from '../types';
import { LayerRendererContext } from './types';
import { computeEnvelope } from '../dsp/envelope';
import { evalWave } from '../dsp/oscillators';

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export function renderChordLayer(
  samples: Float32Array,
  l: LayerSpec,
  ctx: LayerRendererContext
): void {
  const { sampleRate, pitchJitter, durJitter, levelJitter, duration } = ctx;
  const wave = l.wave ?? 'sine';
  const defaultLevel = -10;
  const levelVal = (l.level ?? defaultLevel) + levelJitter;

  const at = l.start ?? 0;
  const dur = Math.max(0.01, (l.duration ?? 0.1) * durJitter);
  const gainLinear = dbToLinear(levelVal);

  const attack = l.envelope?.attack ?? 0.005;
  const decay = l.envelope?.decay ?? 0.08;
  const sustain = l.envelope?.sustain ?? 0;
  const release = l.envelope?.release ?? 0.01;

  const sampleStart = Math.floor(at * sampleRate);
  const sampleEnd = Math.min(
    samples.length,
    Math.floor((at + dur + release) * sampleRate)
  );

  const freqs = (l.frequencies ?? []).map((hz) => hz * pitchJitter);
  const phases = new Float64Array(freqs.length);

  for (let i = sampleStart; i < sampleEnd; i++) {
    const tRel = (i - sampleStart) / sampleRate;
    const env = computeEnvelope(tRel, attack, decay, sustain, release, dur);
    let mix = 0;
    for (let k = 0; k < freqs.length; k++) {
      const hz = Math.max(10, Math.min(freqs[k], sampleRate / 2 - 10));
      const dt = hz / sampleRate;
      phases[k] = (phases[k] + dt) % 1;
      mix += evalWave(wave, phases[k], dt);
    }
    samples[i] += mix * env * gainLinear;
  }
}
