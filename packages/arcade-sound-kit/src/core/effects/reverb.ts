import { ReverbEffectSpec } from '../types';

class CombFilter {
  private buffer: Float32Array;
  private index = 0;
  private filterStore = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  process(input: number, feedback: number, damp: number): number {
    const output = this.buffer[this.index];
    this.filterStore = output * (1 - damp) + this.filterStore * damp;
    this.buffer[this.index] = input + this.filterStore * feedback;
    this.index = (this.index + 1) % this.buffer.length;
    return output;
  }
}

class AllPassFilter {
  private buffer: Float32Array;
  private index = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  process(input: number): number {
    const bufOut = this.buffer[this.index];
    const output = -input + bufOut;
    this.buffer[this.index] = input + bufOut * 0.5;
    this.index = (this.index + 1) % this.buffer.length;
    return output;
  }
}

export function applyReverb(
  samples: Float32Array,
  spec: ReverbEffectSpec,
  sampleRate: number
): Float32Array {
  const mix = Math.max(0, Math.min(1.0, spec.mix));
  if (mix === 0) return samples;

  const roomSize = Math.max(0.1, Math.min(0.98, spec.roomSize ?? 0.5));
  const damp = Math.max(0, Math.min(0.8, (spec.dampHz ?? 4000) / sampleRate));

  const scale = sampleRate / 22050;
  const combDelays = [1116, 1188, 1277, 1356].map((d) => Math.round(d * scale));
  const allpassDelays = [225, 341].map((d) => Math.round(d * scale));

  const combs = combDelays.map((d) => new CombFilter(d));
  const allpasses = allpassDelays.map((d) => new AllPassFilter(d));

  const output = new Float32Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    const input = samples[i];
    let combSum = 0;

    for (let c = 0; c < combs.length; c++) {
      combSum += combs[c].process(input, roomSize, damp);
    }

    let allpassSum = combSum * 0.25;
    for (let a = 0; a < allpasses.length; a++) {
      allpassSum = allpasses[a].process(allpassSum);
    }

    output[i] = input * (1 - mix) + allpassSum * mix;
  }

  return output;
}
