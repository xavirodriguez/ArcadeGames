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

export interface LayerSpec {
  kind: 'tone' | 'noise' | 'click' | 'zap' | 'whoosh' | 'subBoom' | 'chord';
  level?: number;
  start?: number;
  duration?: number;
  wave?: Wave;
  frequency?: number;
  pitch?: PitchCurve;
  frequencies?: number[];
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
  sampleRate?: number;
  seed?: number;
  normalize?: boolean;
  peakDb?: number;
  /** Apply light saturation / soft clip on the master. */
  arcadeColor?: boolean;
  /** How many slightly varied copies to write (default 1). */
  variants?: number;
  /** Write a manifest.json next to the sounds. */
  manifest?: boolean;
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
}

export interface SoundManifest {
  version: string;
  sampleRate: number;
  generatedAt: string;
  sounds: ManifestEntry[];
}
