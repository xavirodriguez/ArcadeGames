export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'pulse';
export type LfoWave = Wave | 'sampleAndHold';

export interface LfoSpec {
  wave: LfoWave;
  rateHz: number;
  depth: number;
  delay?: number;
  fadeIn?: number;
  phase?: number;
}

export interface ModulationSpec {
  pitch?: LfoSpec;
  amp?: LfoSpec;
  filter?: LfoSpec;
  pulseWidth?: LfoSpec;
}
export type Category = 'combat' | 'movement' | 'progression' | 'ui';
export type FilterSpec = {
  type?: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  minHz: number;
  maxHz?: number;
  q?: number;
  curve?: 'linear' | 'exponential';
};
export interface EnvelopePoint {
  t: number;
  level: number;
  curve?: 'linear' | 'exp';
}

export type Envelope = {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  curve?: 'linear' | 'exp';
  points?: EnvelopePoint[];
};

export type PitchCurve = {
  startHz: number;
  endHz: number;
  /** linear | exponential (default exponential for most sweeps) */
  curve?: 'linear' | 'exponential';
  envelope?: Envelope;
};
export type Variation = {
  pitch?: number;
  levelDb?: number;
  duration?: number;
};

export interface SequenceNote {
  /** Frequency in Hz (0 indicates a rest / silence). */
  frequency: number;
  /** Optional rest flag; when true, no tone is generated for this step. */
  rest?: boolean;
  /** Duration of this step in seconds. */
  stepDuration: number;
  /** Optional level offset in dB for this note. */
  level?: number;
  /** Optional envelope for this specific note. */
  envelope?: Envelope;
}

export interface FmSpec {
  ratio: number;
  index: number;
  indexEnvelope?: Envelope;
  feedback?: number;
}

export interface UnisonSpec {
  voices: number;
  detuneCents: number;
  spread?: number;
}

export interface LayerSpec {
  kind: 'tone' | 'noise' | 'click' | 'zap' | 'whoosh' | 'subBoom' | 'chord' | 'sequence';
  level?: number;
  start?: number;
  duration?: number;
  wave?: Wave;
  duty?: number;
  bitcrush?: { bits?: number; downsample?: number };
  lfsr?: { bits: 7 | 15; clockHz?: number };
  frequency?: number;
  pitch?: PitchCurve;
  frequencies?: number[];
  notes?: SequenceNote[];
  loopCount?: number;
  envelope?: Envelope;
  filter?: FilterSpec;
  /** @deprecated Use fm.ratio instead. */
  harmonicity?: number;
  fm?: FmSpec;
  unison?: UnisonSpec;
  modulation?: ModulationSpec;
}

export type DelayEffectSpec = {
  type: 'delay';
  timeSeconds: number;
  feedback: number;
  mix: number;
  cutoffHz?: number;
};

export type ReverbEffectSpec = {
  type: 'reverb';
  roomSize?: number;
  dampHz?: number;
  mix: number;
};

export type DistortionEffectSpec = {
  type: 'distortion';
  drive: number;
  mix?: number;
};

export type ChorusEffectSpec = {
  type: 'chorus';
  rateHz?: number;
  depthMs?: number;
  mix?: number;
};

export type BitcrushEffectSpec = {
  type: 'bitcrush';
  bits?: number;
  downsample?: number;
};

export type EffectSpec =
  | DelayEffectSpec
  | ReverbEffectSpec
  | DistortionEffectSpec
  | ChorusEffectSpec
  | BitcrushEffectSpec;

import { RNG } from './random';

export interface MusicTrack {
  name?: string;
  layer: LayerSpec;
  pattern: (barIndex: number, rng: RNG) => SequenceNote[];
}

export interface MusicSection {
  id: string;
  bars: number;
  tracks: MusicTrack[];
}

export interface MusicRecipe {
  name: string;
  bpm: number;
  timeSignature?: [number, number];
  bars: number;
  key?: string;
  tracks: MusicTrack[];
  loop?: boolean;
  sections?: MusicSection[];
}

export interface SoundRecipe {
  name: string;
  category: Category;
  duration: number;
  layers: LayerSpec[];
  effects?: EffectSpec[];
  variation?: Variation;
  tags?: string[];
  /** When true the generated WAV is intended for seamless looping (longer buffer + soft edges). */
  loop?: boolean;
  /** Optional soft bitcrush amount 0–1 for arcade character. */
  bitcrush?: number;
}

/** Fired by generateSet while generating each recipe. */
export interface GenerateProgressEvent {
  /** 1-based index of the recipe currently being processed / just finished. */
  index: number;
  total: number;
  name: string;
  category: Category;
  /** 'start' before render, 'done' after the WAV is written. */
  phase: 'start' | 'done';
  /** Absolute path of the written file (only on phase 'done'). */
  file?: string;
  /** Elapsed milliseconds since generateSet began. */
  elapsedMs: number;
}

export type GenerateProgressCallback = (event: GenerateProgressEvent) => void;

export interface GenerateOptions {
  outDir?: string;
  /** Offline sample rate (default 22050). */
  sampleRate?: number;
  seed?: number;
  normalize?: boolean;
  /** Target loudness in dBFS RMS measured over active samples (|x| >= 0.001). */
  targetRmsDb?: number;
  /** Maximum allowable peak level in dBFS when targetRmsDb is set (default -1). */
  peakCeilingDb?: number;
  peakDb?: number;
  /** Apply light saturation / soft clip on the master. */
  arcadeColor?: boolean;
  /** How many slightly varied copies to write (default 1). */
  variants?: number;
  /** Write a manifest.json next to the sounds. */
  manifest?: boolean;
  /** Bypass cache if true. */
  force?: boolean;
  /** WAV bit depth: 16 (default, smaller) or 32 (float). */
  bitDepth?: 16 | 32;
  /** Optional progress callback (used by the CLI for live status). */
  onProgress?: GenerateProgressCallback;
}

export interface ManifestEntry {
  name: string;
  category: Category;
  duration: number;
  loop: boolean;
  tags: string[];
  file: string;
  variants?: number;
  hash?: string;
  gainDb?: number;
  limitedByPeak?: boolean;
}

export interface SoundManifest {
  version: string;
  sampleRate: number;
  /** PCM bit depth of written WAVs (16 or 32). */
  bitDepth?: 16 | 32;
  generatedAt: string;
  sounds: ManifestEntry[];
}
