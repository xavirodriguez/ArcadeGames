# @tiny-aster/arcade-sound-kit

Procedural sound-design toolkit for arcade games.
Design SFX as **recipes** (layers of primitives) instead of hand-editing waveforms.

**v0.2.0** adds:

- Full polished `arcadePack()` covering combat, movement, progression and UI
- First-class **loop** support (`loop: true` → longer buffer + soft edges for engine crossfades)
- Optional **arcade colour** (soft saturation) and per-recipe **bitcrush**
- Automatic **manifest.json** (name, category, duration, loop flag, tags, file path)
- Better CLI (`--pack`, `--variants`, `--arcade-color`, `--seed`)
- Improved variation, pitch curves and critical/shield/boss recipes
- **Live CLI progress** while generating (bar + current sound + elapsed time)

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
} = require('@tiny-aster/arcade-sound-kit');

// Full pack
await generateSet(arcadePack(), {
  outDir: './sounds',
  seed: 42,
  arcadeColor: true,
  manifest: true,
});

// Custom recipe
const shoot = defineSound('shoot', {
  category: 'combat',
  duration: 0.14,
  layers: layers(
    tone({ wave: 'triangle', startHz: 1500, endHz: 500, level: -7, decay: 0.11 }),
    noiseBurst({ level: -18, filter: [1800, 7000], decay: 0.035 })
  ),
});

await generateSet([shoot], { outDir: './sounds', seed: 7 });
```

### Progress callback

`generateSet` accepts an optional `onProgress` so you can show status in CLIs or UIs:

```js
await generateSet(arcadePack(), {
  outDir: './sounds',
  onProgress: ({ index, total, name, category, phase, file, elapsedMs }) => {
    if (phase === 'done') {
      console.log(`${index}/${total} ${category}/${name} (${elapsedMs}ms)`);
    }
  },
});
```

| Field | Meaning |
|-------|--------|
| `index` / `total` | 1-based position in the batch |
| `name` / `category` | Recipe being generated |
| `phase` | `'start'` before render, `'done'` after WAV is written |
| `file` | Absolute path (only on `'done'`) |
| `elapsedMs` | Time since `generateSet` started |

## CLI

```bash
# Generate the entire arcade pack (live progress bar in TTY)
npx ask-generate generate --pack --out ./sounds --seed 42 --arcade-color

# Quiet (no progress, only summary)
npx ask-generate generate --pack --quiet

# Verbose (one line per file with full path)
npx ask-generate generate --pack --verbose

# Generate from a custom recipe file
npx ask-generate generate examples/arcade.js --out ./custom
```

Example TTY output:

```text
Generating full arcade pack (40 sounds)…
[████████████░░░░░░░░░░░░]  50%  20/40  ✓ combat/explosion_large  (12.3s)
Wrote 40 file(s) to ./sounds in 24.1s
Manifest: sounds/manifest.json
```

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
recipes → primitives → renderer → (saturation / bitcrush) → WAV + manifest
                    ↘ variation (seeded RNG)
```

The renderer stays isolated so a future runtime player can consume the same semantic recipes.

## Integration notes (Tiny Aster / ArcadeGames)

- Generated WAVs + `manifest.json` are ready to be loaded by `@tiny-aster/core` `WebAudioPlayer` / `AssetLoader`.
- Loop recipes are tagged `loop: true` in the manifest so the audio system can start them as looping sources.
- Prefer `seed` + `variants` when you want a small pool of slightly different samples per event (reduces fatigue without runtime synthesis).

## License

MIT
