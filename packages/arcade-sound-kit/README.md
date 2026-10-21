# @tiny-aster/arcade-sound-kit

Procedural sound-design toolkit for arcade games.
Design SFX as **recipes** (layers of primitives) instead of hand-editing waveforms.

**v0.3.1** features:

- Pure Node-free entry point (`@tiny-aster/arcade-sound-kit/core`) for browser and Web Workers
- Biquad filter sweeps with configurable `q` resonance factor (`q?: number`) and `notch`/`bandpass` types
- LFO modulation (`pitch`, `amp`, `filter`, `pulseWidth`) with `sampleAndHold` and `rateHz` rate-jittering
- Exponential envelope curves (`curve: 'exp'`) and multipoint envelopes (`points`)
- Retro Chip Palette (`pulse` wave with `duty` & PolyBLEP, 7/15-bit `lfsr` noise, per-layer `bitcrush`, `arp`)
- FM synthesis (`ratio`, `index`, `indexEnvelope`, `feedback` with Carson rule Nyquist safety) and Unison multi-voice detuning
- Master Effects Chain (`delay`, Schroeder `reverb`, `distortion`, `chorus`, `bitcrush`)
- Pure Musical Notation (`note`, `midi`, `dur`, `scale`, `chordNotes`, `seq`, `rest`) and `MusicRecipe` with seamless loop tail folding
- Procedural Generator & Evolution (`randomRecipe`, `mutate`, `morph` across 8 retro archetypes)
- Quality Audit Engine (Radix-2 FFT, ITU-R BS.1770 K-weighted LUFS, spectral centroid, DC offset, similarity pairing)
- Export Pipeline (`cues.json` bank generator and Howler-compatible `generateSpriteSheet`)

## Design goals

- Layered effects: transient + body + texture + tail
- Pitch / level / duration variation on every play
- Reusable primitives: `tone`, `noiseBurst`, `click`, `zap`, `whoosh`, `subBoom`, `chord`, `sequence`
- One-shot **and** loop-oriented recipes
- Deterministic seeds for tests / reproducible builds
- Offline WAV generation + manifest for asset pipelines

## Quick start

```bash
pnpm add @tiny-aster/arcade-sound-kit
```

```js
const {
  defineSound,
  tone,
  noiseBurst,
  generateSet,
  arcadePack,
  examplesPack,
} = require('@tiny-aster/arcade-sound-kit');

// Render full pack (defaults: 22050 Hz, PCM16)
await generateSet(arcadePack(), {
  outDir: './sounds',
  seed: 42,
  arcadeColor: true,
  manifest: true,
});
```

### Pure Browser / Web Worker Import (`/core`)

Import from `@tiny-aster/arcade-sound-kit/core` for 100% pure in-memory audio synthesis free of `fs`, `path`, or Node.js dependencies:

```js
import { renderFinal, encodeWav, defineSound, tone } from '@tiny-aster/arcade-sound-kit/core';

const laserRecipe = defineSound('laser', {
  category: 'combat',
  duration: 0.15,
  layers: [
    tone({ startHz: 1200, endHz: 200, level: -6 }),
  ],
});

// 1. Synthesize Float32Array audio samples
const { samples, sampleRate, norm } = await renderFinal(laserRecipe, { seed: 42 });

// 2. Encode to PCM WAV Uint8Array buffer
const wavBytes = encodeWav(samples, { sampleRate, bitDepth: 16 });
```

## Advanced Feature Examples

### 1. Retro Chip Palette (`pulse`, `duty`, `lfsr`, `bitcrush`)

```js
const chiptuneRecipe = defineSound('chip_jump', {
  category: 'movement',
  duration: 0.15,
  layers: [
    {
      kind: 'tone',
      wave: 'pulse',
      duty: 0.125, // 12.5% duty cycle pulse wave
      frequency: 300,
      pitch: { startHz: 300, endHz: 900, curve: 'linear' },
      bitcrush: { bits: 6, downsample: 2 },
    },
    {
      kind: 'noise',
      lfsr: { bits: 7 }, // 7-bit retro noise generator
      duration: 0.08,
    },
  ],
});
```

### 2. FM Synthesis & Unison Detuning

```js
const fmCoinRecipe = defineSound('coin_fm', {
  category: 'progression',
  duration: 0.35,
  layers: [
    {
      kind: 'tone',
      wave: 'sine',
      frequency: 987.77,
      level: -8,
      duration: 0.35,
      fm: { ratio: 2.0, index: 3.0, indexEnvelope: { attack: 0.001, decay: 0.2, sustain: 0 } },
      unison: { voices: 3, detuneCents: 12 },
    },
  ],
});
```

### 3. Master Effects Chain (`effects`)

```js
const spaceLaserRecipe = defineSound('space_laser', {
  category: 'combat',
  duration: 0.2,
  layers: [
    tone({ startHz: 2000, endHz: 100 }),
  ],
  effects: [
    { type: 'delay', timeSeconds: 0.08, feedback: 0.4, mix: 0.3 },
    { type: 'reverb', roomSize: 0.6, mix: 0.2 },
  ],
});
```

### 4. Musical Notation & `MusicRecipe`

```js
import { renderMusic, seq, gridPattern, kickLayer, snareLayer } from '@tiny-aster/arcade-sound-kit/core';

const bgmRecipe = {
  name: 'level1_bgm',
  bpm: 120,
  timeSignature: [4, 4],
  bars: 2,
  loop: true,
  tracks: [
    {
      name: 'kick',
      layer: kickLayer(-8),
      pattern: () => gridPattern('x...x...x...x...', { bpm: 120, stepDur: '16n' }),
    },
    {
      name: 'snare',
      layer: snareLayer(-12),
      pattern: () => gridPattern('....x.......x...', { bpm: 120, stepDur: '16n' }),
    },
    {
      name: 'lead',
      layer: { kind: 'sequence', wave: 'square', level: -10 },
      pattern: (bar) => bar === 0 ? seq(['C4', 'E4', 'G4', 'B4'], { bpm: 120 }) : seq(['C5', 'G4', 'E4', 'C4'], { bpm: 120 }),
    },
  ],
};

const { samples, sampleRate } = await renderMusic(bgmRecipe);
```

### 5. Procedural Randomizer, Mutation & Morphing

```js
import { randomRecipe, mutate, morph } from '@tiny-aster/arcade-sound-kit/core';

// 1. Generate random sound from archetype
const laser = randomRecipe({ archetype: 'laser' }, 42);

// 2. Mutate recipe by 20%
const laserVariation = mutate(laser, 0.2, 100);

// 3. Morph smoothly between laser and jump
const jump = randomRecipe({ archetype: 'jump' }, 12);
const morphed = morph(laser, jump, 0.5);
```

## CLI Commands (`ask-generate`)

```bash
# Generate full arcade pack WAV files & manifest.json
ask-generate generate --pack --out ./sounds

# Preview sound recipe in real-time CLI
ask-generate preview --pack --name shoot --variants 3

# Execute Quality Audit (Radix-2 FFT, LUFS, DC Offset, Similarity)
ask-generate audit --pack --dir ./out --fail-on

# Generate 10 random laser sounds from seed 1
ask-generate random --archetype laser --count 10 --seed 1

# Export cues.json specification bank
ask-generate cues --out ./out

# Export Howler-compatible audio sprite sheet WAV + JSON
ask-generate spritesheet --out ./out
```

## Recipe model

```text
SoundRecipe
  ├─ name / category / duration
  ├─ layers[]          (tone | noise | click | zap | whoosh | subBoom | chord | sequence)
  │    ├─ wave         (sine | triangle | square | sawtooth | pulse | noise)
  │    ├─ duty / lfsr  (pulse duty cycle, 7/15-bit LFSR noise)
  │    ├─ envelope     (attack, decay, sustain, release, curve: 'linear'|'exp', points)
  │    ├─ filter       (type: 'lowpass'|'highpass'|'bandpass'|'notch', minHz, maxHz, q, curve)
  │    ├─ modulation   (pitch, amp, filter, pulseWidth LFOs)
  │    ├─ fm / unison  (FM ratio, index, indexEnvelope, feedback / unison voices & detuneCents)
  │    └─ bitcrush     (bits, downsample)
  ├─ effects[]         (delay | reverb | distortion | chorus | bitcrush)
  ├─ variation         (pitch, levelDb, duration)
  ├─ loop?             (seamless constant-power crossfade + tail folding)
  └─ bitcrush?         (master soft bitcrush 0–1)
```

## Included packs

- `arcadePack()`: Full standard arcade library (combat, movement, progression, ui).
- `examplesPack()`: Showcase recipes for LFO modulation, filter resonance, chip palette, FM synthesis, unison, and exponential envelopes.
- `musicExamplesPack()`: Interactive music recipes demonstrating multi-track bar patterns, percussion grids, and section loops.

## License

MIT
