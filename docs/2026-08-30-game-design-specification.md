# Game Design Specification: Retro Arcade Engine & Gameplay Mechanics

**Author**: GameDesigner (Systems & Mechanics Architect)
**Status**: Active Design Specification
**Date**: 2026-08-30
**Target Engine**: `@tiny-aster/core` (Entity Component System)

---

## 🎯 Architectural Vision & Design Pillars

1. **Deterministic Execution**: Every gameplay interaction, bullet trajectory, spawn sequence, and AI state machine must execute identically across frame rates and platforms. All gameplay-affecting randomness is strictly isolated to `world.gameplayRandom` (e.g. `world.gameplayRandom.nextFloat()`) to ensure absolute netcode rollback stability and replay reproduction. Visual-only effects (particles, screen shake) utilize `world.renderRandom`.
2. **Kinetic Game Feel (Juice)**: High-frequency player inputs yield immediate visual, audio, and physical feedback (hit flashes, camera shakes, floating score popup text, squash & stretch easing).
3. **Session-to-Session Meta-Progression**: A persistent Experience Point (XP) economy bridges short 2-minute arcade runs with long-term player progression. Accumulated XP is spent on Beneficial Mutators from `MutatorRegistry.ts` or earned through high-risk Negative Mutator challenges.
4. **Shared ECS Architecture**: Arcade behaviors (combos, combat damage, sequential wave spawning, particle VFX) are implemented as reusable ECS components and systems in `@tiny-aster/core` and `src/games/shared/` rather than re-implemented inside per-game logic systems.

---

## 🗺️ Part 1: Core Gameplay Loops

### 1. Space Invaders

```
     +-------------------------------------------------------------+
     |                 MOMENT-TO-MOMENT (0-30s)                    |
     |  Action: Traverse laterally, fire bullets, utilize shields  |
     |  Feedback: Hit flash, particle burst, combo popup (x2)      |
     |  Reward: Invader score + incrementing combo multiplier     |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                   SESSION LOOP (5-30 mins)                  |
     |  Goal: Clear invader rows & defeat boss encounters          |
     |  Tension: Speed scaling 1 - (remaining/total) + Kamikaze    |
     |  Resolution: Stage clear / boss defeated or Game Over       |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                LONG-TERM LOOP (META-PROGRESS)               |
     |  Progression: Convert score & run achievements to XP        |
     |  Retention: Unlock & apply Beneficial Mutators via XP       |
     +-------------------------------------------------------------+
```

* **Moment-to-Moment (0–30s)**:
  * *Action*: Move left/right, shoot player bullets (`PLAYER_BULLET_SPEED = 500` px/s) to destroy enemy invaders, hide behind defensive shields (`SHIELD_COUNT = 4`).
  * *Feedback*: White hit flashes (`hitFlashFrames = 4`), directional explosion particles generated via `world.gameplayRandom`, screen shake upon player hit, and floating score popups (e.g., `x2`, `x3`) via `Juice.squash`.
  * *Reward*: Immediate score accumulation scaled by the active combo multiplier (`scoreGain = points * nextMultiplier`).
* **Session Loop (5–30m)**:
  * *Goal*: Clear invader waves and defeat bosses (`BossComponent`) to advance levels (`level++`).
  * *Tension*: Invader formation speed increases nonlinearly as invaders are destroyed (`INVADER_SPEED_BASE = 50` px/s to `INVADER_SPEED_MAX = 400` px/s). Kamikaze dives (`KamikazeComponent`) trigger aggressive low-altitude intercept runs.
  * *Resolution*: Wave clear triggers next level with `LEVEL_SPEED_MULTIPLIER = 1.1`; loss of all lives (`lives <= 0`) or invader reach at `limit = SCREEN_HEIGHT - 100` triggers Game Over.
* **Long-Term Meta-Loop**: Earn XP from scores to draft or permanently unlock beneficial mutators (`faster_bullets`, `extra_life`, `combo_head_start`, `shield_pulse`).

---

### 2. Asteroids

* **Moment-to-Moment (0–30s)**:
  * *Action*: Thrust, rotate ship, manipulate momentum drifting across wrapping screen borders, shoot asteroids to fragment large rocks into smaller, faster shards.
  * *Feedback*: Dynamic particle exhaust trails, wrap-around border teleportation, explosive fragmentation bursts.
  * *Reward*: High-risk trajectory corrections yield clean field wipes and rapid score chaining.
* **Session Loop (5–30m)**:
  * *Goal*: Clear all asteroid entities and alien UFO targets.
  * *Tension*: High velocity shards increase field density; erratic UFO targeting pressures positioning.
  * *Resolution*: Level clear when query for asteroids and UFOs returns 0; Game Over when ship lives exhaust.
* **Long-Term Meta-Loop**: Unlock game-specific mutators like `hyper_drift` (2x thrust, reduced friction `0.95`) and `bouncing_bullets` (`BULLET_BOUNDARY_BEHAVIOR = "bounce"`).

---

### 3. Pong, Flappy Bird, Geometry Wars, EchoRunner & Platformer

* **Pong**: High-speed paddle reaction loop. Paddle deflection imparts velocity spin (`BALL_ACCELERATION = 1.05`). First to 5 points wins session. XP rewarded on rally lengths and win margins.
* **Flappy Bird**: Tap/flap vertical impulse fighting gravity through pipe gaps. Score popups per gap passed. Single collision triggers game over.
* **Geometry Wars**: Dual-stick multidirectional arena survival. Chaining spawn kills increments `ComboComponent` up to max multiplier.
* **EchoRunner**: High-velocity runner using `StateMachineSystem` for enemy AI (`enemy_sentinel`, `enemy_hopper`).
* **Platformer**: Momentum jumping and hazard avoidance.

---

## 📊 Part 2: Economy & Tuning Balance Table

All numeric tuning values are grounded directly in source constants. Any proposed value without a pre-existing constant is explicitly designated as `[PLACEHOLDER]`.

| Variable Name | Base Value | Min Limit | Max Limit | Code Location / Source File |
| :--- | :--- | :--- | :--- | :--- |
| `PLAYER_SPEED` | `300` px/s | `150` | `600` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.PLAYER_SPEED` |
| `PLAYER_INITIAL_LIVES` | `3` | `1` | `5` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.PLAYER_INITIAL_LIVES` |
| `PLAYER_SHOOT_COOLDOWN` | `500` ms | `100` | `1000` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.PLAYER_SHOOT_COOLDOWN` |
| `PLAYER_BULLET_SPEED` | `500` px/s | `300` | `1000` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.PLAYER_BULLET_SPEED` |
| `ENEMY_BULLET_SPEED` | `250` px/s | `100` | `600` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.ENEMY_BULLET_SPEED` |
| `ENEMY_FIRE_INTERVAL_MIN`| `1000` ms | `500` | `2000` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.ENEMY_FIRE_INTERVAL_MIN` |
| `ENEMY_FIRE_INTERVAL_MAX`| `3000` ms | `1500` | `5000` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.ENEMY_FIRE_INTERVAL_MAX` |
| `INVADER_SPEED_BASE` | `50` px/s | `20` | `150` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.INVADER_SPEED_BASE` |
| `INVADER_SPEED_MAX` | `400` px/s | `200` | `800` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.INVADER_SPEED_MAX` |
| `INVADER_DESCENT_STEP` | `20` px | `5` | `50` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.INVADER_DESCENT_STEP` |
| `LEVEL_SPEED_MULTIPLIER` | `1.1` | `1.0` | `1.5` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.LEVEL_SPEED_MULTIPLIER` |
| `SHIELD_SEGMENT_HP` | `3` | `1` | `10` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.SHIELD_SEGMENT_HP` |
| `COMBO_TIMEOUT` | `2000` ms | `1000` | `5000` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.COMBO_TIMEOUT` |
| `MAX_MULTIPLIER` | `10` | `3` | `20` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.MAX_MULTIPLIER` |
| `PARTICLE_COUNT` | `8` | `0` | `24` | `src/games/space-invaders/types/SpaceInvadersTypes.ts::GAME_CONFIG.PARTICLE_COUNT` |
| `HYPER_DRIFT_THRUST_MULT`| `2.0` | `1.2` | `3.0` | `src/utils/MutatorRegistry.ts::BENEFICIAL_MUTATORS.hyper_drift` |
| `HYPER_DRIFT_FRICTION` | `0.95` | `0.80` | `0.99` | `src/utils/MutatorRegistry.ts::BENEFICIAL_MUTATORS.hyper_drift` |
| `SHIELD_PULSE_DURATION` | `3.0` s | `1.0` | `10.0` | `src/utils/MutatorRegistry.ts::BENEFICIAL_MUTATORS.shield_pulse` |
| `XP_COST_FASTER_BULLETS` | `500` XP | `100` | `2000` | `src/utils/MutatorRegistry.ts::BENEFICIAL_MUTATORS.faster_bullets` |
| `XP_COST_EXTRA_LIFE` | `800` XP | `200` | `3000` | `src/utils/MutatorRegistry.ts::BENEFICIAL_MUTATORS.extra_life` |
| `XP_COST_COMBO_HEADSTART`| `300` XP | `100` | `1000` | `src/utils/MutatorRegistry.ts::BENEFICIAL_MUTATORS.combo_head_start` |
| `XP_COST_SHIELD_PULSE` | `1000` XP | `500` | `5000` | `src/utils/MutatorRegistry.ts::BENEFICIAL_MUTATORS.shield_pulse` |
| `PROPOSED_SHIELD_REGEN` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | Proposed future mutator constant |

---

## 🛠️ Part 3: Mechanic Specifications (Repo-Aligned)

### 1. Mutator: `faster_bullets`
* **Purpose**: Increases bullet velocity by 10% across all titles.
* **Input State**: `world.getResource("GameConfig")`
* **Output Mutation**:
  ```typescript
  apply: (world, context) => {
    const config = world.getResource<Record<string, unknown>>("GameConfig");
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
* **RNG Source**: N/A (deterministic config override).

### 2. Mutator: `extra_life`
* **Purpose**: Grants +1 starting life to Player entity or GameState singleton.
* **Input State**: `world.getSingleton("GameState")`, `world.query("Player", "Health")`
* **Output Mutation**:
  ```typescript
  apply: (world, context) => {
    const gameState = world.getSingleton("GameState");
    if (gameState) {
      world.mutateSingleton("GameState", (gs: any) => {
        if (typeof gs.lives === "number") gs.lives += 1;
      });
    }
    const players = world.query("Player", "Health");
    for (const player of players) {
      world.mutateComponent(player, "Health" as any, (h: any) => {
        h.current += 1;
        h.max += 1;
      });
    }
  }
  ```

### 3. Mutator: `combo_head_start`
* **Purpose**: Initializes wave start with combo = 5 and multiplier = x2.
* **Input State**: `world.query("Combo")`
* **Output Mutation**:
  ```typescript
  apply: (world, context) => {
    const comboEntities = world.query("Combo");
    if (comboEntities[0] !== undefined) {
      world.mutateComponent(comboEntities[0], "Combo" as any, (c: any) => {
        c.combo = 5;
        c.multiplier = 2;
        c.timerRemaining = 2.0;
      });
    }
  }
  ```

### 4. Mutator: `shield_pulse`
* **Purpose**: Sets 3 seconds of invulnerability on Player `HealthComponent`.
* **Input State**: `world.query("Player", "Health")`
* **Output Mutation**:
  ```typescript
  apply: (world, context) => {
    const players = world.query("Player", "Health");
    for (const player of players) {
      world.mutateComponent(player, "Health" as any, (h: any) => {
        h.invulnerableRemaining = 3.0;
      });
    }
  }
  ```

### 5. Mutator: `hyper_drift` (Asteroids Specific)
* **Purpose**: Doubles thrust power (`2.0x`) and lowers friction (`0.95`) for high-inertia drift.
* **Input State**: `world.getResource("GameConfig")`
* **Output Mutation**: Multiplies `SHIP_THRUST` by 2 and sets `FRICTION` to `0.95`.

### 6. Mutator: `bouncing_bullets` (Asteroids Specific)
* **Purpose**: Sets bullet boundary behavior to bounce rather than wrap/destroy.
* **Input State**: `world.getResource("GameConfig")`
* **Output Mutation**: Sets `BULLET_BOUNDARY_BEHAVIOR = "bounce"`.

---

## 🏗️ Part 4: Architectural Combo Unification Proposal

### Identified Duplication & Current Architecture
* **Core Generic System**: `@tiny-aster/core` provides `ComboComponent` (`combo`, `multiplier`, `timerRemaining`) and `ComboSystem` (`packages/core/src/systems/ComboSystem.ts`).
* **Space Invaders Local Implementation**: `SpaceInvadersCollisionSystem.ts` mutates combo values directly on `ComboComponent` attached to a single `Combo` entity, while also exposing fallback getters in `GameStateComponent` (`gs.combo`, `gs.multiplier`).
* **Unification Strategy**:
  1. All 7 arcade titles attach `ComboComponent` to the primary `Player` entity or a `Combo` singleton entity during scene initialization.
  2. All games register `@tiny-aster/core`'s `ComboSystem` in the `GameRules` schedule phase to automatically decrement `timerRemaining` and reset `combo`/`multiplier` upon expiration in a deterministic manner.
  3. Game-specific collision systems (e.g. `SpaceInvadersCollisionSystem.ts`, `PongCollisionSystem.ts`) only handle combo *increments* (`combo++`, `timerRemaining = COMBO_TIMEOUT / 1000`) on hit events, leaving timer decay to the core `ComboSystem`.

---

## 🔒 Part 5: Determinism & Randomness Isolation Rules

1. **Gameplay Affecting Logic**:
   * Spawn positions, loot table rolls, enemy shooting intervals, kamikaze dive selection, and draft shuffling **MUST** use `world.gameplayRandom` (e.g. `world.gameplayRandom.nextFloat()`).
   * `Math.random()` is strictly prohibited in all `systems/`, `components/`, `runtime/`, and `utils/` code paths.
2. **Visual & Presentation Logic**:
   * Particle scatter angles, cosmetic pitch shifts, screen shake offsets, and UI jitter use `world.renderRandom`.
3. **Rollback & Replay Guard**:
   * Side-effect audio calls (`PlaySFX`) inside system event reactions must check `!world.isReSimulating` and use `eventBus.emitDeferred()` instead of synchronous `eventBus.emit()`.

---

## 🚶 Part 6: Player Onboarding Checklist

- [x] **Core Control Introduction (< 30s)**: Control instructions rendered on initial ready screen (keyboard or touch overlays).
- [x] **Low-Threat First Wave**: Initial invader formation speed set to baseline `50` px/s with `ENEMY_FIRE_INTERVAL_MAX = 3000` ms.
- [x] **Safe Defensive Zone**: Protective shields positioned between player and invaders to absorb initial misfires.
- [x] **Retention XP Hook**: Session summary calculates total earned XP and displays progress toward next `BeneficialMutator` unlock.
