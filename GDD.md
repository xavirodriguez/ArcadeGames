# Game Design Document: retro-arcade Systems & Progression

**Author**: GameDesigner (Systems & Mechanics Architect)
**Status**: Living Document
**Version**: 1.1.0
**Last Updated**: October 2023
**Target Engine**: `@tiny-aster/core` (Entity Component System)

---

## 📜 Revision History & Changelog

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2023-10-24 | GameDesigner | Initial specification of core gameplay loops, economy balance baseline, onboarding flows, beneficial mutator integration, and architectural combo unification proposal. |
| `1.1.0` | 2023-10-25 | GameDesigner | Refactored arcade games to prevent duplicate logic by fully unifying Pong and Flappy Bird around the shared ComboSystem & ComboComponent. Detailed phase-based durations, difficulty multipliers, and normalized XP mechanics. |

---

## 🎯 Design Pillars & Systems Vision

1. **Deterministic Execution**: Every mechanic, bullet spawn, and AI pattern must execute identically across frame rates and platforms. All gameplay-affecting randomness is strictly isolated to `world.gameplayRandom` to support replayability and netcode prediction.
2. **Kinetic Game Feel (Juice)**: Fast-paced inputs must yield immediate visual, audio, and physical reactions (hit-flashes, screen-shaking, floating popup text).
3. **Session-to-Session Hooks**: A robust, persistent meta-progression XP economy bridges short, intense, 2-minute arcade sessions with long-term completionist and tuning progression.
4. **Modular Architecture**: Shared arcade behaviors (e.g., combos, particle effects, score multipliers) are codified as reusable ECS components and systems in `@tiny-aster/core` rather than monolithic per-game implementations.

---

## 🗺️ Part 1: Core Gameplay Loop & Target Duration

We outline the moment-to-moment, session, and long-term meta-loops across the retro-arcade catalog, utilizing a progression-based target duration.

### ⏱️ Phase & Target Duration Progression
For any game phase `n`:
* **Odd Phases**: Increase the **target duration** required to survive and pass.
* **Even Phases**: Increase the **relative difficulty by 15%** multiplicatively.
* The player advances to the next phase only by successfully surviving the entire phase duration.

#### Phase Settings Formula
```typescript
const durationMinutes = 2 + Math.floor((phase - 1) / 2);
const difficultyMultiplier = Math.pow(1.15, Math.floor(phase / 2));
```

| Phase | Survived Duration Required | Relative Difficulty | Phase Change Focus |
| :---: | :---: | :---: | :--- |
| **1** | 2 minutes | 100.00% | Base Experience |
| **2** | 2 minutes | 115.00% | +15% Relative Difficulty |
| **3** | 3 minutes | 115.00% | +1 minute of survival duration |
| **4** | 3 minutes | 132.25% | +15% over previous difficulty |
| **5** | 4 minutes | 132.25% | +1 minute of survival duration |
| **6** | 4 minutes | 152.09% | +15% Relative Difficulty |

#### Game-Specific Difficulty Distribution
The `difficultyMultiplier` escalates the intensity of main simulation levers as follows:
* **Space Invaders**: Increases formation speed, reduces enemy shooting intervals, and increases kamikaze dive attack probabilities.
* **Asteroids**: Increases starting wave count, asteroid drift speeds, and UFO spawning frequency.
* **Flappy Bird**: Increases pipe scrolling velocity and vertical gap position variance.
* **Pong**: Increases AI opponent reaction time and balls' maximum speed limits.

---

## 📊 Part 2: Normalized XP Progression Economy

Rather than using score directly (which scales wildly across different games), player rewards are calculated using a normalized formula ensuring session length and skill performance are both highly valued.

### Normalized XP Formula
```text
XP = 20 × minutesSurvived + 60 × phasesCompleted + 40 × performanceRatio
```

Where the `performanceRatio` is clamped between `0` and `1` using game-specific target metrics:
* **Space Invaders**: `clamp(playerScore / (1000 * level), 0, 1)`
* **Asteroids**: `clamp(playerScore / (1500 * level), 0, 1)`
* **Flappy Bird**: `clamp(playerScore / 10, 0, 1)`
* **Pong**: `clamp(maxPoints / 5, 0, 1)`

### XP Progress Examples
* **Novice session (1 min survival, 0 phases, 0.40 performance)**: `20 * 1 + 60 * 0 + 40 * 0.40 = 36 XP`
* **Onboarding success (2 min survival, 1 phase, 0.50 performance)**: `20 * 2 + 60 * 1 + 40 * 0.50 = 120 XP`
* **Advanced session (4 mins survival, 2 phases, 0.65 performance)**: `20 * 4 + 60 * 2 + 40 * 0.65 = 226 XP`
* **Master session (10 mins survival, 4 phases, 0.80 performance)**: `20 * 10 + 60 * 4 + 40 * 0.80 = 472 XP`

---

## 🚶 Part 3: Mutator Classification & Upgrades

We organize modifiers into four explicit categories to declare compatibility and manage risks:

1. **Beneficial**: Direct power-ups.
2. **Trade-off**: High-reward with a clear operational cost.
3. **Challenge**: Intentionally scales game difficulty.
4. **Cosmetic**: Visual enhancements with zero gameplay impact.

| Mutator ID | Category | XP Cost | Compatible Games | Economy Rationale & Tuning Notes |
| :--- | :--- | :--- | :--- | :--- |
| `combo_head_start` | Beneficial | `300` XP | All | Starts with x2 multiplier to maximize early-stage scoring. |
| `faster_bullets` | Beneficial | `500` XP | Space Invaders, Asteroids | 10% speed increase across player bullets, directly improving hit probability. |
| `extra_life` | Beneficial | `800` XP | Space Invaders, Asteroids | Start with +1 life. Avoided in Flappy Bird/Pong due to mechanics. |
| `shield_pulse` | Beneficial | `1000` XP | All | Grants 3 seconds of absolute invulnerability on startup. |
| `hyper_drift` | Trade-off | N/A (Daily) | Asteroids | Higher thruster response, but friction drops significantly. |
| `bouncing_bullets` | Trade-off | N/A (Daily) | Asteroids | Proyectiles bounce off borders, but can clutter screen. |
| `heavy_gravity` | Trade-off | N/A (Daily) | Flappy Bird | Double gravity paired with stronger flap jumps. |
| `ghost_ball` | Trade-off | N/A (Daily) | Pong | Ball disappears for 1 sec on impact, confusing both players. |

---

## 🛠 ] Part 4: Mechanic Specification & Unification

### Unification of the Combo System
The arcade combo systems have been unified under the core `@tiny-aster/core` shared `ComboComponent` and `ComboSystem`:
1. **Consolidated Engine logic**: All games query, update, and manage combo expiration uniformly inside `ComboSystem`.
2. **Game-specific multipliers**:
   - Space Invaders updates multiplier at `1 + floor(combo / 5)` up to `MAX_MULTIPLIER`.
   - Pong updates multiplier at `1 + floor(combo / 3)` up to `10`. Resets on any player score.
   - Flappy Bird updates multiplier at `1 + floor(combo / 3)` up to `10`. Resets on hit.

---

## 🔒 Determinism Constraint

To prevent desynchronizations and state variance, the following rules are strictly enforced:

1. **Strictly Forbidden**:
   - `Math.random()` anywhere in simulation systems.
2. **Mandatory Practice**:
   - Sourcing all simulation RNG from `world.gameplayRandom` (which is a seeded pseudorandom number generator):
     ```typescript
     const rng = world.gameplayRandom;
     const speedVariance = rng.nextFloat() * 50 - 25; // Safe and deterministic
     ```
   - Visual-only effects (such as particles or screen shakes) can utilize `world.renderRandom` safely without impacting the gameplay simulation path.
