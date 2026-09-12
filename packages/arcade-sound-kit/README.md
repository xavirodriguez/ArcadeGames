# @tiny-aster/arcade-sound-kit

Procedural sound-design toolkit for arcade games.
Design SFX as **recipes** (layers of primitives) instead of hand-editing waveforms.

## Features

- Pure DSP offline renderer (zero Web Audio or Tone.js dependencies, runs natively in Node)
- Default **22.05 kHz / PCM16** WAVs (much smaller assets; override with flags)
- Live CLI progress plus `--sample-rate` / `--bit-depth` options

## Design goals

- Layered effects: transient + body + texture + tail
- Pitch / level / duration variation on every play
- Reusable primitives: `tone`, `noiseBurst`, `click`, `zap`, `whoosh`, `subBoom`, `chord`
- One-shot **and** loop-oriented recipes
- Deterministic seeds for tests / reproducible builds
- Offline WAV generation + manifest for asset pipelines

## Quick start

```bash
pnpm add @tiny-aster/arcade-sound-kit
# or from the monorepo workspace
```

```js
const {
  defineSound,
  layers,
  tone,
  noiseBurst,
  subBoom,
  generateSet,
  arcadePack,
  DEFAULT_SAMPLE_RATE,
} = require('@tiny-aster/arcade-sound-kit');

// Full pack (defaults: 22050 Hz, PCM16)
await generateSet(arcadePack(), {
  outDir: './sounds',
  seed: 42,
  arcadeColor: true,
  manifest: true,
});

// High-quality export if needed
await generateSet(arcadePack(), {
  outDir: './sounds-hq',
  sampleRate: 44100,
  bitDepth: 32,
});
```

### Progress callback

```js
await generateSet(arcadePack(), {
  outDir: './sounds',
  onProgress: ({ index, total, name, category, phase, elapsedMs }) => {
    if (phase === 'done') {
      console.log(`${index}/${total} ${category}/${name} (${elapsedMs}ms)`);
    }
  },
});
```

## CLI

```bash
# Default: 22050 Hz PCM16 + live progress
npx ask-generate generate --pack --out ./sounds --seed 42 --arcade-color

# CD-quality float WAV
npx ask-generate generate --pack --sample-rate 44100 --bit-depth 32

# Quiet / verbose
npx ask-generate generate --pack --quiet
npx ask-generate generate --pack --verbose
```

From the package scripts:

```bash
pnpm --filter @tiny-aster/arcade-sound-kit generate
```

## Output format

| Setting | Default | Notes |
|---------|---------|--------|
| `sampleRate` | `22050` | Enough bandwidth for arcade SFX; ~2× fewer samples than 44.1 kHz |
| `bitDepth` | `16` | Signed PCM WAV; ~half the size of float32 |
| Manifest | `manifest.json` | Includes `sampleRate`, `bitDepth`, per-sound paths |

## Recipe model

```text
SoundRecipe
  ├─ name / category / duration
  ├─ layers[]          (tone | noise | click | zap | whoosh | subBoom | chord)
  ├─ variation         (pitch, levelDb, duration)
  ├─ loop?             (soft edges + longer buffer)
  ├─ bitcrush?         (0–1 retro colour)
  └─ tags[]
```

## Included pack highlights

| Category    | Sounds |
|-------------|--------|
| Combat      | shoot, shoot_enemy, hit, hit_critical, explosion_small/large, shield_hit/break, reload, cooldown_ready, parry |
| Movement    | jump, land, land_heavy, dash, wall_slide (loop), bounce, spin_charge, flap, glide_loop, wrap, thrust_loop |
| Progression | score, combo_up/break, powerup_pickup/expire, collectible_pickup, achievement_unlock |
| UI          | game_over, wave_start, boss_incoming, menu_select/confirm |

## Architecture

```text
recipes → primitives → Pure DSP Render Engine
                      → Float32Array → PCM16 WAV + manifest
```

The renderer stays isolated so a future runtime player can consume the same semantic recipes.

## Performance notes

- Pure offline DSP synthesis without asynchronous clock yields or polyfills.
- Peak normalization happens in `writeWav`.

## License

MIT
