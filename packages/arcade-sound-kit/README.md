# @tiny-aster/arcade-sound-kit

Procedural sound-design toolkit for arcade games.
Design SFX as **recipes** (layers of primitives) instead of hand-editing waveforms.

**v0.3.1** adds:

- Pure Node-free entry point (`@tiny-aster/arcade-sound-kit/core`) for browser and Web Workers
- Biquad filter sweeps with configurable `q` resonance factor (`q?: number`) and `notch`/`bandpass` types
- LFO modulation (`pitch`, `amp`, `filter`) with `sampleAndHold` and `rateHz` jittering
- Exponential envelope curves (`curve: 'exp'`) and multipoint envelopes (`points`)
- `examplesPack()` with showcase recipes (`siren`, `powerup_vibrato`, `filter_modulated`, `shoot_exp`, `explosion_small_exp`, `jump_exp`)

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

## Advanced Recipe Examples

### LFO Modulation & Filter Resonance (`q`)

```js
const sirenRecipe = defineSound('siren', {
  category: 'ui',
  duration: 0.8,
  layers: [
    {
      kind: 'tone',
      wave: 'sawtooth',
      frequency: 600,
      level: -8,
      filter: { type: 'bandpass', minHz: 500, maxHz: 2000, q: 3.5 },
      modulation: {
        pitch: { wave: 'triangle', rateHz: 4, depth: 4 },
        filter: { wave: 'sine', rateHz: 2, depth: 1.5 },
      },
    },
  ],
});
```

### Exponential Envelopes (`curve: 'exp'`) & Multipoint (`points`)

```js
const expZapRecipe = defineSound('zap_exp', {
  category: 'combat',
  duration: 0.2,
  layers: [
    {
      kind: 'zap',
      pitch: { startHz: 1800, endHz: 200 },
      envelope: {
        attack: 0.005,
        decay: 0.15,
        sustain: 0,
        release: 0.01,
        curve: 'exp', // exponential decay/release for natural decay
      },
    },
  ],
});
```

## Recipe model

```text
SoundRecipe
  ├─ name / category / duration
  ├─ layers[]          (tone | noise | click | zap | whoosh | subBoom | chord | sequence)
  │    ├─ envelope     (attack, decay, sustain, release, curve: 'linear'|'exp', points)
  │    ├─ filter       (type: 'lowpass'|'highpass'|'bandpass'|'notch', minHz, maxHz, q, curve)
  │    └─ modulation   (pitch, amp, filter LFOs)
  ├─ variation         (pitch, levelDb, duration)
  ├─ loop?             (soft edges + longer buffer)
  └─ bitcrush?         (0–1 retro colour)
```

## Included packs

- `arcadePack()`: Full standard arcade library (combat, movement, progression, ui).
- `examplesPack()`: Showcase recipes for LFO modulation, filter resonance, and exponential envelopes.

## License

MIT
