import { LayerSpec, Wave, Envelope } from '../core/types';

const env = (e: Envelope = {}): Envelope => ({
  attack: 0.005,
  decay: 0.08,
  sustain: 0,
  release: 0.02,
  ...e,
});

export const tone = (o: {
  wave?: Wave;
  startHz?: number;
  endHz?: number;
  level?: number;
  decay?: number;
  duration?: number;
  curve?: 'linear' | 'exponential';
}): LayerSpec => ({
  kind: 'tone',
  wave: o.wave ?? 'triangle',
  level: o.level ?? -8,
  frequency: o.startHz ?? 440,
  pitch: {
    startHz: o.startHz ?? 440,
    endHz: o.endHz ?? o.startHz ?? 440,
    curve: o.curve ?? 'exponential',
  },
  duration: o.duration,
  envelope: env({ decay: o.decay ?? 0.08 }),
});

export const noiseBurst = (
  o: {
    level?: number;
    filter?: [number, number];
    decay?: number;
    duration?: number;
  } = {}
): LayerSpec => ({
  kind: 'noise',
  level: o.level ?? -14,
  filter: {
    type: 'bandpass',
    minHz: o.filter?.[0] ?? 800,
    maxHz: o.filter?.[1] ?? 8000,
  },
  duration: o.duration ?? o.decay ?? 0.08,
  envelope: env({ decay: o.decay ?? 0.08 }),
});

export const click = (
  o: { level?: number; frequency?: number } = {}
): LayerSpec => ({
  kind: 'click',
  level: o.level ?? -10,
  frequency: o.frequency ?? 3000,
  duration: 0.025,
  envelope: env({ attack: 0.001, decay: 0.02 }),
});

export const zap = (
  o: {
    level?: number;
    startHz?: number;
    endHz?: number;
    duration?: number;
  } = {}
): LayerSpec => ({
  kind: 'zap',
  level: o.level ?? -9,
  duration: o.duration ?? 0.12,
  pitch: {
    startHz: o.startHz ?? 1800,
    endHz: o.endHz ?? 250,
    curve: 'exponential',
  },
  envelope: env({ decay: o.duration ?? 0.12 }),
});

export const whoosh = (
  o: {
    level?: number;
    startHz?: number;
    endHz?: number;
    duration?: number;
  } = {}
): LayerSpec => ({
  kind: 'whoosh',
  level: o.level ?? -14,
  duration: o.duration ?? 0.25,
  pitch: {
    startHz: o.startHz ?? 400,
    endHz: o.endHz ?? 5000,
  },
  filter: { type: 'bandpass', minHz: 300, maxHz: 8000 },
  envelope: env({ attack: 0.01, decay: o.duration ?? 0.25 }),
});

export const subBoom = (
  o: {
    level?: number;
    startHz?: number;
    endHz?: number;
    duration?: number;
  } = {}
): LayerSpec => ({
  kind: 'subBoom',
  level: o.level ?? -5,
  duration: o.duration ?? 0.45,
  pitch: {
    startHz: o.startHz ?? 110,
    endHz: o.endHz ?? 42,
    curve: 'exponential',
  },
  wave: 'sine',
  envelope: env({ attack: 0.005, decay: o.duration ?? 0.45 }),
});

export const chord = (
  frequencies: number[],
  o: { level?: number; duration?: number; wave?: Wave } = {}
): LayerSpec => ({
  kind: 'chord',
  frequencies,
  level: o.level ?? -10,
  duration: o.duration ?? 0.15,
  wave: o.wave ?? 'sine',
  envelope: env({ decay: o.duration ?? 0.15 }),
});
