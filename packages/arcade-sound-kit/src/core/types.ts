export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';
export type Category = 'combat' | 'movement' | 'progression' | 'ui';
export type FilterSpec = {
  type?: 'lowpass' | 'highpass' | 'bandpass';
  minHz: number;
  maxHz?: number;
};
export type Envelope = {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
};
export type PitchCurve = {
  startHz: number;
  endHz: number;
  /** linear | exponential (default exponential for most sweeps) */
  curve?: 'linear' | 'exponential';
};
export type Variation = {
  pitch?: number;
  levelDb?: number;
  duration?: number;
};

export interface SequenceNote {
  /** Frequency in Hz. */
  frequency: number;
  /** Duration of this step in seconds. */
  stepDuration: number;
  /** Optional level offset in dB for this note. */
  level?: number;
  /** Optional envelope for this specific note. */
  envelope?: Envelope;
}

export interface LayerSpec {
  kind: 'tone' | 'noise' | 'click' | 'zap' | 'whoosh' | 'subBoom' | 'chord' | 'sequence';
  level?: number;
  start?: number;
  duration?: number;
  wave?: Wave;
  frequency?: number;
  pitch?: PitchCurve;
  frequencies?: number[];
  notes?: SequenceNote[];
  loopCount?: number;
  envelope?: Envelope;
  filter?: FilterSpec;
  /** Optional FM-ish harmonicity hint (future use) */
  harmonicity?: number;
}

export interface SoundRecipe {
  name: string;
  category: Category;
  duration: number;
  layers: LayerSpec[];
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
