# Geometry Wars: Kinetic Energy Accumulator & Overdrive Mode Design Document

**Author**: GameDesigner (Systems & Mechanics Architect)
**Status**: Living Specification
**Version**: 1.0.0
**Target Engine**: `@tiny-aster/core` (Entity Component System)
**Game Module**: `src/games/geometrywars/`

---

## 🎯 Design Pillars & Player Experience

1. **High-Risk Graze Rewards**: Encourages risky near-miss positioning close to hostile geometric entities to rapidly accumulate energy via `KineticAccumulatorComponent`.
2. **Explosive Overdrive State**: Reaching max energy enables an Overdrive shockwave burst that clears surrounding threats and boosts firing rate by 200% for high kinetic feedback.
3. **Deterministic Bullet & Particle Waves**: All enemy AI movement vectors, projectile trajectories, and particle explosions pull strictly from `world.gameplayRandom` for state determinism and replay accuracy.
4. **Standardized Arcade Economy**: Integrates shared score multiplier mechanics (`ComboComponent`) and XP-purchased mutators (`MutatorRegistry.ts`).

---

## 🔄 Part 1: Core Gameplay Loop Document

```
     +-------------------------------------------------------------+
     |                 MOMENT-TO-MOMENT (0-30s)                    |
     |  Action: Twin-Stick Aim, High-Speed Graze, Energy Charge   |
     |  Feedback: Neon Glow, Energy Meter Pulse, Burst Shockwave   |
     |  Reward: Overdrive Burst & Rapid Multiplier Stacking       |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                   SESSION LOOP (5-30 mins)                  |
     |  Goal: Survive Escalating Geometric Wave Swarms            |
     |  Tension: Swarm Density, Fast Chargers, Chasing Sentinels    |
     |  Resolution: Wave Clear or Fleet Destruction (GameOver)     |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                LONG-TERM LOOP (META-PROGRESS)               |
     |  Progression: Earn XP for Wave Clears & Overdrive Multipliers|
     |  Retention: Unlock Kinetic Mutators (e.g. Overdrive Boost)   |
     +-------------------------------------------------------------+
```

### Moment-to-Moment (0–30 seconds)
- **Action**: Kiting geometric swarms (Diamonds, Squares, Pins), grazing past enemies within `grazeRadius` (40px) to charge `KineticAccumulatorComponent`, and triggering Overdrive bursts when full.
- **Feedback**: Neon outline brightness scaling with energy charge level, energetic audio hum, intense screen shake upon burst discharge, and rapid-fire particle streams during Overdrive.
- **Reward**: Massive screen clearance, multiplier multiplier build (`ComboComponent`), and adrenaline rush from near-miss evasions.

### Session Loop (5–30 minutes)
- **Goal**: Survive sequential geometric waves driven by `SpawnDirectorComponent` (`src/games/shared/spawn/`).
- **Tension**: Exponentially increasing enemy entity count and spawn frequency, requiring frequent Overdrive triggers to clear bottlenecks.
- **Resolution**: Reaching target score/wave advances level state; depleting lives (`INITIAL_LIVES = 3`) and bombs (`INITIAL_BOMBS = 3`) ends session.

### Long-Term Loop (Meta-Progression)
- **Progression**: Convert session score performance and graze counts into Profile XP (`MutatorService`).
- **Retention Hook**: Unlock beneficial mutators (`faster_bullets`, `combo_head_start`, `shield_pulse`) in `MutatorRegistry.ts`.

---

## 📊 Part 2: Economy Balance & Tuning Table

All baseline values are grounded in `DEFAULT_CONFIG` in `src/games/geometrywars/config/GeometryWarsConfig.ts`. Proposed kinetic extensions are explicitly marked.

| Variable Name | Base Value | Min Limit | Max Limit | Tuning Notes & Code Config Location |
| :--- | :--- | :--- | :--- | :--- |
| `WIDTH` | `800` px | `800` | `1920` | Playfield arena width. `DEFAULT_CONFIG.WIDTH` |
| `HEIGHT` | `600` px | `600` | `1080` | Playfield arena height. `DEFAULT_CONFIG.HEIGHT` |
| `PLAYER_SPEED` | `220` px/s | `150` | `400` | Ship speed. `DEFAULT_CONFIG.PLAYER_SPEED` |
| `PLAYER_FIRE_COOLDOWN`| `0.12` s | `0.05` | `0.30` | Base firing cooldown interval. `DEFAULT_CONFIG.PLAYER_FIRE_COOLDOWN` |
| `BULLET_SPEED` | `500` px/s | `300` | `1000` | Projectile speed. `DEFAULT_CONFIG.BULLET_SPEED` |
| `BULLET_TTL` | `1.2` s | `0.5` | `3.0` | Projectile lifetime duration. `DEFAULT_CONFIG.BULLET_TTL` |
| `INITIAL_LIVES` | `3` | `1` | `5` | Lives on session start. `DEFAULT_CONFIG.INITIAL_LIVES` |
| `INITIAL_BOMBS` | `3` | `0` | `5` | Screen-clearing smart bombs. `DEFAULT_CONFIG.INITIAL_BOMBS` |
| `INVULNERABILITY_DURATION`| `2.0` s | `1.0` | `4.0` | Respawn invulnerability duration. `DEFAULT_CONFIG.INVULNERABILITY_DURATION` |
| `maxEnergy` | `100` | `50` | `200` | Energy capacity for burst. `KineticAccumulatorComponent.maxEnergy` |
| `chargeOnMoveRate` | `10` /s | `5` | `30` | Energy gained per second of max movement speed. `KineticAccumulatorComponent` |
| `grazeRadius` | `40` px | `20` | `80` | Graze distance threshold around player ship. `KineticAccumulatorComponent` |
| `grazeChargeAmount` | `15` | `5` | `30` | Flat energy bonus per graze event. `KineticAccumulatorComponent` |
| `burstRadius` | `150` px | `80` | `300` | Radius of kinetic burst shockwave. `KineticAccumulatorComponent` |
| `OVERDRIVE_DURATION` | `[PLACEHOLDER]` | `3.0` s | `8.0` s | Overdrive mode duration window. Proposed extension |
| `OVERDRIVE_FIRE_RATE_MULT`| `[PLACEHOLDER]` | `2.0` | `4.0` | Firing rate multiplier during Overdrive (`0.12s -> 0.04s`). Proposed extension |

---

## 🚶 Part 3: Player Onboarding Flow

### Onboarding Checklist

- [ ] **Core Verb Introduction (First 15 seconds)**
  - Display twin-stick controls overlay (`WASD` to move, Arrow Keys / Mouse to aim & fire, `Space` for Bomb).
- [ ] **First Graze Success Guarantee**
  - Wave 1 features slow-moving wanderers (`kind: "patrol"`), permitting safe graze proximity testing without instant death risks.
- [ ] **Overdrive Shockwave Tutorial**
  - Energy meter glows brightly when full; trigger prompt indicates Overdrive activation capability.
- [ ] **Session Retention Hook**
  - Game Over displays total score, graze count achievements, and XP earned toward mutator unlocks in `MutatorRegistry`.

---

## 🛠️ Part 4: Mechanic Specification (Repo-Aligned)

### Mechanic 1: Kinetic Energy Accumulation (`KineticAccumulatorSystem`)

**Purpose**: Reward aggressive near-miss positioning close to enemies and continuous movement with stored energy.
**Player Fantasy**: Channeling proximity danger into explosive offensive power.

#### ECS State Mutation
- **Component**: `KineticAccumulatorComponent` attached to player entity (`packages/core/src/components/KineticAccumulatorComponent.ts`):
  - `storedEnergy`: `number` (0 to 100)
  - `maxEnergy`: `100`
  - `chargeOnMoveRate`: `10`
  - `grazeRadius`: `40`
  - `grazeChargeAmount`: `15`
  - `isBurstReady`: `boolean`
  - `isBurstActive`: `boolean`

#### Firing Overdrive State
- When `storedEnergy === maxEnergy`, set `isBurstReady = true`.
- Upon player activation (or bomb key secondary effect), set `isBurstActive = true`, reset `storedEnergy = 0`, trigger surrounding entity displacement within `burstRadius` (150px), and enter Overdrive mode (`cooldownRemaining` reduced to `0.04s` for `OVERDRIVE_DURATION` of 5.0s).

#### Determinism & Performance Rules
- Uses indexed loop iteration over `world.query("KineticAccumulator", "Transform", "Velocity")` without per-frame object allocations.
- Visual particles emitted during energy accumulation and burst shockwave source randomness from `world.renderRandom`.

---

## ⚠️ Known Architecture Inconsistencies & Recommendations

### Combo System Duplication Notice
- Geometry Wars utilizes the shared `ComboComponent` (`@tiny-aster/core`) and `ComboSystem` (`src/games/shared/arcade/`).
- Overdrive multipliers must directly increment `ComboComponent.multiplier` using `world.mutateComponent(playerEntity, "Combo", (c) => { c.multiplier += 1; })` rather than introducing isolated local multiplier variables.

---

## ⚡ Meta-Progression & Mutator Integration

Hooks into `MutatorRegistry.ts` (`BENEFICIAL_MUTATORS`):

1. **`combo_head_start`** (XP Cost: 300): Starts wave with x2 multiplier, allowing faster energy build-up.
2. **`faster_bullets`** (XP Cost: 500): Increases bullet speed by 10% during both normal and Overdrive states.
3. **`shield_pulse`** (XP Cost: 1000): Provides 3s invulnerability on session start for aggressive initial grazing.
