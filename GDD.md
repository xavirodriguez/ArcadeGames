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

## 🗺️ Part 1: Core Gameplay Loop Document

Here we outline the moment-to-moment, session, and long-term meta-loops across the retro-arcade catalog, with special focus on how they interface with the central `@tiny-aster/core` engine.

### Core Loop: Space Invaders

```
     +-------------------------------------------------------------+
     |                 MOMENT-TO-MOMENT (0-30s)                    |
     |  Action: Shoot Invaders, Dodge Bullet, Use Shields          |
     |  Feedback: Hit Flashes, Popups (e.g., x2), Screen Shake     |
     |  Reward: Score Gain & Combo Multiplier Increment            |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                   SESSION LOOP (5-30 mins)                  |
     |  Goal: Clear Invader Rows & Boss Waves                      |
     |  Tension: Speed Scaling (remaining/total) + Kamikaze Dives  |
     |  Resolution: Victory (all clear) or Defeat (GameOver)       |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                LONG-TERM LOOP (META-PROGRESS)               |
     |  Progression: Accumulate XP from Scores & Accomplishments   |
     |  Retention: Unlock & Apply Beneficial Mutators via XP       |
     +-------------------------------------------------------------+
```

#### Moment-to-Moment (0–30 seconds)
- **Action**: The player moves left/right and fires bullets to destroy incoming rows of invaders, while using protective shields to absorb enemy fire.
- **Feedback**: Destroying an invader triggers an immediate white hit flash (`hitFlashFrames = 4`), spawns colorful explosion particles using `world.gameplayRandom` velocities, requests screen shake upon taking damage, and displays a floating combo multiplier text popup (e.g. `x2`, `x3`) which floats upwards using the `Juice` easing system.
- **Reward**: Intrinsic satisfaction of clearing rows plus immediate score increments multiplied by the player's active combo multiplier.

#### Session Loop (5–30 minutes)
- **Goal**: Clear successive waves of invaders and defeat boss entities (`BossComponent`) to advance level progression (`level++`).
- **Tension**: Escalating difficulty. The invader formation's speed increases inversely to the remaining invaders: speed scale = `1 - (remaining / total)`. Boss phases trigger distinct kamikaze dive attacks (`KamikazeComponent`).
- **Resolution**: Level completion triggers the next wave with `LEVEL_SPEED_MULTIPLIER` applied, while player death or a mother-ship breach at `limit = SCREEN_HEIGHT - 100` triggers the Game Over state.

#### Long-Term Loop (Meta-Progression)
- **Progression**: Post-session scores and high-score candidates are converted directly to player Profile Experience points (`XP`).
- **Retention Hook**: Players accumulate persistent XP to purchase beneficial mutators from the `MutatorRegistry` (`faster_bullets`, `extra_life`, `combo_head_start`, `shield_pulse`), drastically shifting the baseline difficulty of their next play sessions.

---

### Core Loop: Asteroids

#### Moment-to-Moment (0–30 seconds)
- **Action**: Rotate ship, apply forward thrust, navigate wrap-around screen boundaries, and split large asteroids into smaller, faster shards.
- **Feedback**: Dynamic particle thruster exhaust, boundary wrap-around teleportation, explosive asteroid fractures, and critical-angle hyperspace jumps.
- **Reward**: High-risk trajectory adjustments and precision shooting to compile points while managing momentum/drift.

#### Session Loop (5–30 minutes)
- **Goal**: Clear the playfield of all asteroids and hostile UFOs.
- **Tension**: Drift momentum vs. increasing count of smaller, high-velocity asteroid shards; random incoming UFO target acquisition.
- **Resolution**: Level cleared when asteroid and UFO queries return 0 entities; Game Over when ship lives reach 0.

#### Long-Term Loop (Meta-Progression)
- **Progression**: XP gained from asteroid fractures and UFO takedowns.
- **Retention Hook**: Meta-purchased upgrades like `hyper_drift` (highly responsive thrusters with low friction) or `bouncing_bullets` (projectiles bounce on boundary walls instead of wrapping around).

---

### Core Loop: Flappy Bird

#### Moment-to-Moment (0–30 seconds)
- **Action**: Press Flap to exert vertical upward impulse, fighting gravity to thread the bird through narrow gaps in incoming obstacle pipes.
- **Feedback**: Immediate flapping bounce, near-miss score popups, and scrolling background adjustments.
- **Reward**: Pure focus and timing-based success as each pipe set is cleared.

#### Session Loop (5–30 minutes)
- **Goal**: Maximize pipe clear score without colliding with the ground or pipe segments.
- **Tension**: Constant gravity acceleration, unpredictable gap heights, and dwindling recovery windows.
- **Resolution**: Single-hit collision immediately initiates Game Over state.

#### Long-Term Loop (Meta-Progression)
- **Progression**: Earn XP per successfully cleared pipe gap and for near-miss maneuvers.
- **Retention Hook**: Unlock beneficial mutators like `heavy_gravity` (double gravity but stronger jumps) or cosmetic trails unlocked via level milestones.

---

### Core Loop: Pong

#### Moment-to-Moment (0–30 seconds)
- **Action**: Move paddle vertically to intercept and deflect a high-velocity bouncing ball, imparting vertical "spin" based on paddle movement on deflection.
- **Feedback**: Kinetic paddle impact sound requests, ball squish and stretch effects, hit flash animations.
- **Reward**: Bypassing the opponent's paddle defense to score a point.

#### Session Loop (5–30 minutes)
- **Goal**: Reach the maximum target score (`MAX_SCORE = 5`) before the opponent.
- **Tension**: Continuous ball velocity escalation (`BALL_ACCELERATION = 1.05`) with each successive paddle collision.
- **Resolution**: Reaching the score cap awards set victory and terminates the session.

#### Long-Term Loop (Meta-Progression)
- **Progression**: XP earned based on victory score margins and clean rally lengths.
- **Retention Hook**: Unlock modifiers like `ghost_ball` (making the ball invisible for 1 second after paddle deflection) to customize gameplay.

---

## 📊 Part 2: Economy Balance Spreadsheet Template

All numeric constants in the arcade engine must be grounded in actual code configurations and balanced systematically. The following tables outline the parameters, baseline limits, and meta-game pricing structures.

### Space Invaders & Core Game Balance Baseline

| Variable Name | Base Value | Min Limit | Max Limit | Tuning Notes & Code Config Location |
| :--- | :--- | :--- | :--- | :--- |
| `PLAYER_SPEED` | `300` px/s | `150` | `600` | Ship lateral traversal speed. `GAME_CONFIG.PLAYER_SPEED` |
| `PLAYER_INITIAL_LIVES` | `3` | `1` | `5` | Lives assigned at session start. `GAME_CONFIG.PLAYER_INITIAL_LIVES` |
| `PLAYER_SHOOT_COOLDOWN` | `500` ms | `100` | `1000` | Minimum firing interval. `GAME_CONFIG.PLAYER_SHOOT_COOLDOWN` |
| `PLAYER_BULLET_SPEED` | `500` px/s | `300` | `1000` | Upward bullet travel velocity. `GAME_CONFIG.PLAYER_BULLET_SPEED` |
| `ENEMY_BULLET_SPEED` | `250` px/s | `100` | `600` | Downward bullet velocity. `GAME_CONFIG.ENEMY_BULLET_SPEED` |
| `ENEMY_FIRE_INTERVAL_MIN`| `1000` ms | `500` | `2000` | Minimum delay between invader shots. `GAME_CONFIG.ENEMY_FIRE_INTERVAL_MIN` |
| `ENEMY_FIRE_INTERVAL_MAX`| `3000` ms | `1500` | `5000` | Maximum delay between invader shots. `GAME_CONFIG.ENEMY_FIRE_INTERVAL_MAX` |
| `INVADER_SPEED_BASE` | `50` px/s | `20` | `150` | Initial movement speed of the wave. `GAME_CONFIG.INVADER_SPEED_BASE` |
| `INVADER_SPEED_MAX` | `400` px/s | `200` | `800` | Formation speed when 1 invader remains. `GAME_CONFIG.INVADER_SPEED_MAX` |
| `INVADER_DESCENT_STEP` | `20` px | `5` | `50` | Downward descent distance on edge wall hit. `GAME_CONFIG.INVADER_DESCENT_STEP` |
| `LEVEL_SPEED_MULTIPLIER` | `1.1` | `1.0` | `1.5` | Formation speed scaling factor per level cleared. `GAME_CONFIG.LEVEL_SPEED_MULTIPLIER` |
| `SHIELD_SEGMENT_HP` | `3` | `1` | `10` | Durability of individual shield blocks. `GAME_CONFIG.SHIELD_SEGMENT_HP` |
| `COMBO_TIMEOUT` | `2000` ms | `1000` | `5000` | Grace period in ms before combo resets. `GAME_CONFIG.COMBO_TIMEOUT` |
| `MAX_MULTIPLIER` | `10` | `3` | `20` | Score multiplier cap = `1 + floor(combo / 5)`. `GAME_CONFIG.MAX_MULTIPLIER` |
| `PARTICLE_COUNT` | `8` | `0` | `24` | Burst particles spawned on invader death. `GAME_CONFIG.PARTICLE_COUNT` |

### Meta-Progression & XP Upgrade Economy

XP costs are designed around a curve where early-game upgrades can be achieved in 1–2 high-score sessions (~10–15 mins), while advanced upgrades require mastery over several play sessions.

| Mutator ID | Upgrade Name | XP Cost | Economy Rationale & Tuning Notes |
| :--- | :--- | :--- | :--- |
| `combo_head_start` | Combo Head Start | `300` XP | **Low-tier**: Immediate x2 multiplier; helps players maximize early-stage score multipliers. Good initial purchase. |
| `faster_bullets` | Faster Bullets | `500` XP | **Mid-tier**: 10% speed increase across all games. Decreases bullet travel time, directly increasing hit probability. |
| `extra_life` | Extra Life | `800` XP | **High-tier**: +1 starting life. Directly increases session duration and high score potential. |
| `shield_pulse` | Shield Pulse | `1000` XP | **Top-tier**: 3 seconds of absolute invulnerability at game start. Allows aggressive early positioning. |

---

## 🚶 Part 3: Player Onboarding Flow

To maximize player retention and minimize initial frustration, retro-arcade games implement the following onboarding flow:

### Onboarding Checklist & Progress Gates

- [ ] **Core Verb Introduction (First 30 seconds)**
  - Instantly display a clear overlay of the core controls (e.g., `A/D` or Left/Right Arrow to Move, `Space` to Shoot).
  - High-visibility mobile UI overlays are rendered if a touch device is detected.
- [ ] **First Success Guarantee (Safe Start)**
  - Initial invader rows move at baseline speed (`INVADER_SPEED_BASE = 50`), rendering them very slow-moving targets.
  - Enemy fire cooldowns start on their maximum interval, reducing projectile spam during the first 15 seconds.
- [ ] **Safe-Context Mechanic Training**
  - Shields (`SHIELD_COUNT = 4`) are positioned as massive protective walls absorbing early erratic fire.
  - Gives the player space to learn the lateral movement and bullet velocities in a safe zone before enemies descend.
- [ ] **The Session Hook (Retention Gate)**
  - On first game over, display the calculated Score and any High Score Achievements.
  - Render the **Passport Overlay** displaying XP progress. Explicitly state the progress made toward unlocking their first beneficial mutator (e.g., *"You earned 120 XP! Just 180 XP more to unlock Combo Head Start!"*).

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
