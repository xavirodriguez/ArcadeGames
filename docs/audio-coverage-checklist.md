# Audio Event Mapping & Coverage Checklist

## Overview

Tiny Aster implements a deterministic ECS architecture with a decoupled event-driven audio system.
All gameplay events emit `PlaySFX` through the global `EventBus`. `BaseGame` intercepts `PlaySFX` events and routes them to the platform `IAudioPlayer` (such as `WebAudioPlayer`) with game feel / juice parameters (`pitchRange`, `cooldownMs`, `volume`, `detune`, `playbackRate`) resolved via `DEFAULT_AUDIO_PRESETS`.

---

## Audio Asset Manifest (`SHARED_AUDIO_MANIFEST`)

All minigames preload the high-quality `.wav` audio collection from `/assets/audio/`:

### Combat (`/assets/audio/combat/`)
- `shoot` → `/assets/audio/combat/shoot.wav`
- `shoot_enemy` → `/assets/audio/combat/shoot_enemy.wav`
- `hit` → `/assets/audio/combat/hit.wav`
- `hit_critical` → `/assets/audio/combat/hit_critical.wav`
- `explosion_small` / `explosion` → `/assets/audio/combat/explosion_small.wav`
- `explosion_large` / `explosion2` → `/assets/audio/combat/explosion_large.wav`
- `shield_hit` → `/assets/audio/combat/shield_hit.wav`
- `shield_break` → `/assets/audio/combat/shield_break.wav`
- `parry` → `/assets/audio/combat/parry.wav`
- `reload` → `/assets/audio/combat/reload.wav`
- `cooldown_ready` → `/assets/audio/combat/cooldown_ready.wav`

### Movement (`/assets/audio/movement/`)
- `thrust_loop` → `/assets/audio/movement/thrust_loop.wav`
- `dash` → `/assets/audio/movement/dash.wav`
- `jump` → `/assets/audio/movement/jump.wav`
- `land` → `/assets/audio/movement/land.wav`
- `land_heavy` → `/assets/audio/movement/land_heavy.wav`
- `flap` → `/assets/audio/movement/flap.wav`
- `bounce` → `/assets/audio/movement/bounce.wav`
- `wrap` → `/assets/audio/movement/wrap.wav`
- `spin_charge` → `/assets/audio/movement/spin_charge.wav`
- `wall_slide` → `/assets/audio/movement/wall_slide.wav`
- `glide_loop` → `/assets/audio/movement/glide_loop.wav`

### Progression (`/assets/audio/progression/`)
- `score` → `/assets/audio/progression/score.wav`
- `collectible_pickup` → `/assets/audio/progression/collectible_pickup.wav`
- `powerup_pickup` → `/assets/audio/progression/powerup_pickup.wav`
- `powerup_expire` → `/assets/audio/progression/powerup_expire.wav`
- `combo_up` → `/assets/audio/progression/combo_up.wav`
- `combo_break` → `/assets/audio/progression/combo_break.wav`
- `achievement_unlock` → `/assets/audio/progression/achievement_unlock.wav`

### UI & Stingers (`/assets/audio/ui/`)
- `menu_select` → `/assets/audio/ui/menu_select.wav`
- `menu_confirm` → `/assets/audio/ui/menu_confirm.wav`
- `wave_start` → `/assets/audio/ui/wave_start.wav`
- `boss_incoming` → `/assets/audio/ui/boss_incoming.wav`
- `game_over` → `/assets/audio/ui/game_over.wav`

### Atmosphere & Music (`/assets/audio/`)
- `dark_atmosphere` → `/assets/audio/dark-atmosphere.wav`
- `ambient_loop` → `/assets/audio/ambient_loop.wav`
- `pad_chords` → `/assets/audio/pad-chords.wav`

---

## Game Feel & Juice Preset Parameters

`DEFAULT_AUDIO_PRESETS` configures default volume, pitch variation (`pitchRange`), and minimum re-trigger cooldowns (`cooldownMs`):

| SFX Key | Pitch Variation (`pitchRange`) | Cooldown (`cooldownMs`) | Volume | Purpose / Feeling |
|---|---|---|---|---|
| `shoot` | ±5% (`0.05`) | 60 ms | 0.80 | Avoids machine-gun repetition on player firing |
| `shoot_enemy` | ±5% (`0.05`) | 80 ms | 0.70 | Enemy firing feedback |
| `hit` | ±6% (`0.06`) | 40 ms | 0.80 | Crisp, varied collision impact |
| `hit_critical` | ±4% (`0.04`) | - | 1.00 | High-impact critical hit |
| `explosion_small` | ±6% (`0.06`) | 50 ms | 0.85 | Standard entity destruction |
| `explosion_large` | ±3% (`0.03`) | - | 1.00 | Major boss or player destruction |
| `shield_hit` | ±4% (`0.04`) | - | 0.70 | Shield damage |
| `shield_break` | ±2% (`0.02`) | - | 0.90 | Shield rupture warning |
| `flap` | ±6% (`0.06`) | 70 ms | 0.75 | Organic flapping movement |
| `bounce` | ±5% (`0.05`) | 30 ms | 0.80 | Elastic boundary collision |
| `score` | ±3% (`0.03`) | 50 ms | 0.75 | Rewarding score pickup |
| `combo_up` | ±3% (`0.03`) | - | 0.85 | Progressive reward stinger |
| `combo_break` | - | - | 0.80 | Combo loss feedback |
| `wave_start` | - | - | 0.85 | Wave start stinger |
| `boss_incoming` | - | - | 0.90 | Boss entrance tension |
| `game_over` | - | - | 0.90 | Terminal game over |

---

## Audio Coverage Matrix by Game

| Minigame | Player Fire | Enemy Fire | Impact / Hit | Destruction | Special Mechanics | Wave / Level Clear | Game Over | BGM Atmosphere |
|---|---|---|---|---|---|---|---|---|
| **Asteroids** | `shoot` | `shoot_enemy` | `hit` / `hit_critical` | `explosion_small` / `explosion_large` | `wrap`, `thrust_loop`, `shield_hit`/`break` | `combo_up` | `game_over` | `dark_atmosphere` |
| **Space Invaders** | `shoot` | `shoot_enemy` | `hit` | `explosion_small` | `shield_hit`/`break`, `combo_up`/`break` | `wave_start`, `boss_incoming` | `game_over` | `dark_atmosphere` |
| **Flappy Bird** | - | - | `hit` | `explosion_small` | `flap`, `glide_loop`, `pipe:passed` | `score`, `combo_up` | `game_over` | `dark_atmosphere` |
| **Pong** | - | - | `hit` | - | `bounce`, paddle recoil, hit-stop | `score`, `achievement_unlock` | `game_over` | `dark_atmosphere` |
| **Arkanoid** | `shoot` (laser) | - | `hit` | `explosion_small` | `launch`, `powerup_pickup` | `level_up` | `game_over` | `dark_atmosphere` |
| **Geometry Wars** | `shoot` | `shoot_enemy` | `hit` | `explosion` / `explosion2` | Kinetic accumulator pulse, bomb | `combo_up` | `game_over` | `dark_atmosphere` |
| **Echo Runner** | `pulse` | - | `hit` | `explosion` | Jump, dash, wall slide | `score`, `collectible_pickup` | `game_over` | `dark_atmosphere` |
| **Frogger** | - | - | `hit` / `drown` | `explosion` | `jump`, log carry | `goal` / `score` | `game_over` | `dark_atmosphere` |
| **Platformer** | - | - | `hit` | `explosion` | `jump`, `dash`, wall jump | `score`, `level:completed` | `game_over` | `dark_atmosphere` |

---

## Bus Balancing & Quality Standards

- **Master Bus**: 1.0 (Full output)
- **SFX Bus**: 0.85 (High presence, zero clipping)
- **BGM Bus**: 0.35 (Subtle, non-intrusive background ambience)
- **Deterministic Execution**: All audio triggers route asynchronously via `EventBus.emitDeferred("PlaySFX")` or `BaseGame.audio.playSFX()`. Sound execution is non-blocking and zero-side-effect on gameplay simulation state.
