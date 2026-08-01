# Game Design Document: retro-arcade Systems & Progression

**Author**: GameDesigner (Systems & Mechanics Architect)
**Status**: Living Document
**Version**: 1.1.0
**Last Updated**: November 2023
**Target Engine**: `@tiny-aster/core` (Entity Component System)

---

## 📜 Revision History & Changelog

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2023-10-24 | GameDesigner | Initial specification of core gameplay loops, economy balance baseline, onboarding flows, beneficial mutator integration, and architectural combo unification proposal. |
| `1.1.0` | 2023-11-10 | GameDesigner | Fully designed and implemented Beneficial Mutators (faster_bullets, extra_life, shield_pulse) and integrated falling loot & powerup spawning mechanics in Space Invaders. |

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

## 🛠️ Part 4: Mechanic Specification (Repo-Aligned)

These specifications provide unambiguous guidelines for implementing core progression and unifying duplicate gameplay loops within `@tiny-aster/core`.

### Mechanic: XP-Based Meta-Progression Beneficial Mutators

**Purpose**: Drive session retention by allowing players to cash in accumulated XP for permanent or session-based modifiers.
**Player Fantasy**: Power fantasy. Transforming starting stats to bypass early-game friction.

#### 1. Mutator: `faster_bullets` (10% Speed Increase)
- **Purpose**: Increase player projectile velocity to minimize travel latency and improve target hit probability under high speeds.
- **Input State**:
  - Read from active game configuration: `world.getResource<Config>("GameConfig")`
- **Output Mutation**:
  - Modifies the active "GameConfig" resource, setting the bullet speed parameters 10% higher.
  - Implementation:
    ```typescript
    apply: (world: World) => {
      const config = world.getResource<any>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_BULLET_SPEED === "number") {
          newConfig.PLAYER_BULLET_SPEED = Math.round(newConfig.PLAYER_BULLET_SPEED * 1.10);
        }
        if (typeof newConfig.BULLET_SPEED === "number") {
          newConfig.BULLET_SPEED = Math.round(newConfig.BULLET_SPEED * 1.10);
        }
        world.setResource("GameConfig", newConfig);
      }
    }
    ```
- **Success Condition**: Player bullets across Asteroids and Space Invaders travel 10% faster on the screen, verified by checking entity velocity vectors.
- **Failure State**: Physics validation fails or bullet speed exceeds maximum safe limits (`1000`), handled gracefully by `PhysicsSafetySchema` which catches and rejects the configuration.

#### 2. Mutator: `extra_life` (Start with +1 Life)
- **Purpose**: Direct survival extension. Grants players an extra margin of error to explore deep waves and compile higher scores.
- **Input State**:
  - Read from active game configuration: `world.getResource("GameConfig")`
  - Singleton read: `world.getSingleton("GameState")`
- **Output Mutation**:
  - Modifies `PLAYER_INITIAL_LIVES` on the `GameConfig` resource, increments `lives` inside the `GameState` singleton, and increments player entity's `HealthComponent` parameters to guarantee consistency across any setup order.
- **Success Condition**: Player starts with 4 lives visible on the UI.
- **Failure State**: Player starts with the default 3 lives because the mutator was applied after the initial singleton/entity instantiation.

#### 3. Mutator: `combo_head_start` (Start with x2 Multiplier)
- **Purpose**: Accelerate progression velocity. Bypasses the initial build-up phase to let players score heavily on early, easier targets.
- **Input State**:
  - Singleton read: `world.getSingleton("GameState")`
- **Output Mutation**:
  - On game start, sets the base combo count to 5 (threshold for x2), multiplier to 2, and restarts the combo expiration timer.
- **Success Condition**: The very first hit scores double the base score value.
- **Failure State**: Combo timer expires instantly before the first shot lands due to a lack of cooldown initialization.

#### 4. Mutator: `shield_pulse` (3-Second Invulnerability)
- **Purpose**: On-spawn tactical protection. Prevents cheap deaths from rapid spawns and allows players to establish immediate lateral dominance.
- **Input State**:
  - Sets a `HasShieldPulse` resource flag on the world which is read by player initialization factories/blueprints.
- **Output Mutation**:
  - Initializes player `HealthComponent` with `invulnerableRemaining = 3.0` (3.0 seconds).
- **Success Condition**: Player can absorb damage for the first 3 seconds without losing life points.
- **Failure State**: Player takes damage immediately on frame 1 due to delay in system registration.

---

### Mechanic: Falling Loot & Power-Up System (Space Invaders)

**Purpose**: High-agency positive feedback loop. Rewards destroying invaders with procedural drops that fall downward for tactical capture.
**Player Fantasy**: Direct battlefield augmentation and momentum shifts.

#### 1. Drop Generation & Spawning
- **Trigger**: Triggered via `LootSystem` when an entity carrying a `LootTable` component (like invaders) is flagged as `Dead`.
- **RNG Sourcing**: Sourced strictly from `world.gameplayRandom` to calculate weighted probability rolls.
- **Entity Spawning**: Emits `"loot:spawn"`, caught by the Scene. Creates a Power-Up entity with the following blueprint payload:
  - **Transform**: At coordinates `(x, y)` of the destroyed invader.
  - **Velocity**: `vx: 0`, `vy: 100` px/s (falling vertically towards the player).
  - **Collider2D**: `shape: aabb` (`halfWidth: 7.5`, `halfHeight: 7.5`), `layer: CollisionLayers.DEBRIS`, `mask: CollisionLayers.PLAYER`, and `isTrigger: true`.
  - **Render**: `shape: "shield_block"` (15px colored square) with custom color-coding depending on type.
  - **Boundary**: `mode: "destroy"` so falling power-ups that exit the bottom boundary are automatically reaped.

#### 2. Power-Up Effects Specification
Upon colliding with the player, the power-up is consumed and applies its custom effects payload defined on the active `PowerUpEffects` resource registry:

- **Speed Boost (`speed_boost`)**:
  - *Effect*: Amplifies player's move speed `PLAYER_SPEED` by 30% permanently for the current round, allowing extremely fast lateral evasions.
  - *Color*: Yellow (`#FFFF00`)
- **Shield Protection (`shield`)**:
  - *Effect*: Grants the player `3.0` seconds of absolute invulnerability.
  - *Color*: Cyan (`#00FFFF`)
- **Extra Life (`extra_life`)**:
  - *Effect*: Increments current player health and GameState lives, clamped to max capacity.
  - *Color*: Magenta (`#FF00FF`)
- **Score Multiplier (`score_multiplier`)**:
  - *Effect*: Instantly builds +5 combo count, boosting multiplier and resetting the combo grace period timer.
  - *Color*: Orange (`#FFA500`)

---

## ⚠️ Known Architecture Inconsistency to Flag

### Combo System Unification (Complete)
All compatible arcade games (Space Invaders, Pong, and Flappy Bird) are integrated with and 100% reliant on the shared/generic `ComboSystem` and `ComboComponent` (located in `src/games/shared/arcade/`). All fallback/duplicated local combo and timer decrement blocks have been completely removed from their collision and game state systems to ensure that the generic components remain the absolute single source of truth.

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
