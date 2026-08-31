# Platformer: Kinetic Momentum & Precision Jump Design Document

**Author**: GameDesigner (Systems & Mechanics Architect)
**Status**: Living Specification
**Version**: 1.0.0
**Target Engine**: `@tiny-aster/core` (Entity Component System)
**Game Module**: `src/games/platformer/`

---

## 🎯 Design Pillars & Player Experience

1. **Responsive Kinetic Control**: Asymmetrical gravity curves and momentum interpolation give the player immediate, fluid control over movement arcs, aerial drift, and platform landings.
2. **Precision Platforming Mechanics**: Forgiving mechanics like Coyote Time and Jump Buffering minimize frustrating input misses while keeping skill expression high.
3. **Deterministic Physics Simulation**: Movement calculations, jump impulse arcs, tile collisions, and random level generation source seed randomness strictly from `world.gameplayRandom` to guarantee replayability and state reconciliation.
4. **Unified Arcade Ecosystem**: Integrates shared arcade progression (XP mutators, shared combo/score multipliers) using standardized core ECS components.

---

## 🔄 Part 1: Core Gameplay Loop Document

```
     +-------------------------------------------------------------+
     |                 MOMENT-TO-MOMENT (0-30s)                    |
     |  Action: Run, Jump, Wall-Bounce, Apex Float, Land           |
     |  Feedback: Dust Particles, Landing Squish, Jump Audio       |
     |  Reward: Precision Trajectory & Continuous Momentum         |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                   SESSION LOOP (5-30 mins)                  |
     |  Goal: Traverse Hazard Zones & Reach Checkpoints / Exit     |
     |  Tension: Precision Gaps, Moving Platforms, Spike Hazards   |
     |  Resolution: Stage Clear or Respawn at Active Checkpoint    |
     +------------------------------+------------------------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                LONG-TERM LOOP (META-PROGRESS)               |
     |  Progression: Earn XP & Collectibles across Runs            |
     |  Retention: Unlock Kinetic Mutators (e.g. Apex Booster)     |
     +-------------------------------------------------------------+
```

### Moment-to-Moment (0–30 seconds)
- **Action**: Player executes directional running, variable-height jumps, airborne micro-adjustments, and momentum preservation across varied surfaces (e.g., normal ground, ice platforms, bounce tiles).
- **Feedback**: Immediate kinetic visual/audio feedback: squash-and-stretch on jump launch, particle trail on ice platforms, visual landing squish, and dynamic screen shake on bounce tile impacts.
- **Reward**: Kinetic flow and speed preservation as the player navigates complex obstacle geometry without losing momentum.

### Session Loop (5–30 minutes)
- **Goal**: Clear platformer stages by reaching destination checkpoints (`RespawnPointComponent`) and stage exits while collecting persistent or temporal collectibles.
- **Tension**: Escalating environmental hazards (moving platforms, ice friction zones, spike traps, one-way ledges) requiring tight jump timing.
- **Resolution**: Reaching stage finish advances `RunState` and awards XP; depleting lives or falling into fatal hazards triggers a respawn at the active checkpoint or Game Over.

### Long-Term Loop (Meta-Progression)
- **Progression**: Accumulated score and level completion stats convert into Profile XP (`MutatorService`).
- **Retention Hook**: Unlock platformer-focused beneficial mutators via `MutatorRegistry` (e.g., `coyote_extension`, `apex_booster`, `kinetic_saver`) to customize platforming dynamics in subsequent runs.

---

## 📊 Part 2: Economy Balance & Tuning Table

All baseline values are grounded in `PLATFORMER_CONFIG` inside `src/games/platformer/PlatformerGame.ts`. Proposed expansions for kinetic mechanics are explicitly marked with rationale.

| Variable Name | Base Value | Min Limit | Max Limit | Tuning Notes & Code Config Location |
| :--- | :--- | :--- | :--- | :--- |
| `PLAYER_SPEED` | `200` px/s | `100` | `400` | Maximum horizontal running speed. `PLATFORMER_CONFIG.PLAYER_SPEED` |
| `PLAYER_ACCEL` | `800` px/s² | `400` | `1600` | Ground acceleration rate. `PLATFORMER_CONFIG.PLAYER_ACCEL` |
| `PLAYER_DECEL` | `1200` px/s² | `600` | `2400` | Ground braking/deceleration rate. `PLATFORMER_CONFIG.PLAYER_DECEL` |
| `PLAYER_AIR_ACCEL` | `400` px/s² | `200` | `800` | Aerial horizontal acceleration. `PLATFORMER_CONFIG.PLAYER_AIR_ACCEL` |
| `PLAYER_AIR_DECEL` | `600` px/s² | `300` | `1200` | Aerial horizontal drag/deceleration. `PLATFORMER_CONFIG.PLAYER_AIR_DECEL` |
| `PLAYER_JUMP_VEL` | `350` px/s | `200` | `500` | Full jump initial upward impulse. `PLATFORMER_CONFIG.PLAYER_JUMP_VEL` |
| `PLAYER_MIN_JUMP_VEL` | `150` px/s | `80` | `250` | Minimum velocity on tap jump release. `PLATFORMER_CONFIG.PLAYER_MIN_JUMP_VEL` |
| `RISE_GRAVITY` | `800` px/s² | `400` | `1600` | Gravity applied while moving upward (`vy < 0`). `PLATFORMER_CONFIG.RISE_GRAVITY` |
| `FALL_GRAVITY` | `1200` px/s² | `600` | `2400` | Gravity applied while falling (`vy > 0`) for snappy feel. `PLATFORMER_CONFIG.FALL_GRAVITY` |
| `coyoteTimeMax` | `0.15` s | `0.05` | `0.30` | Grace window to jump after leaving ledge. `PlatformerJumper.coyoteTimeMax` |
| `jumpBufferMax` | `0.10` s | `0.05` | `0.25` | Input buffer window before landing. `PlatformerJumper.jumpBufferMax` |
| `apexThreshold` | `[PLACEHOLDER]` | `20` | `80` | `vy` magnitude window for jump apex floatness. Proposed extension to `PlatformerGravityConfig` |
| `apexGravityMultiplier` | `[PLACEHOLDER]` | `0.3` | `0.8` | Gravity factor multiplier at apex. Proposed extension to `PlatformerGravityConfig` |
| `BOUNCE_TILE_IMPULSE` | `[PLACEHOLDER]` | `400` | `800` | Upward impulse multiplier on bounce tile hit. Grounded in `tileDefinitions` bounce factor (`1.2`) |

---

## 🚶 Part 3: Player Onboarding Flow

### Onboarding Checklist

- [ ] **Core Verb Introduction (First 15 seconds)**
  - Display clear controls overlay (`A/D` or Left/Right Arrow to Move, `Space` / `W` to Jump) or touch UI overlay.
- [ ] **First Jump Success Guarantee**
  - Initial platform gap is narrow (< 80px) and level layout has flat ground before hazards, guaranteeing safe jump testing.
- [ ] **Safe Mechanical Progression**
  - Ice platforms, bounce tiles, and one-way ledges are introduced individually in safe zones without immediate death drops.
  - Spikes (`kind: "spike"`) are preceded by a visual checkpoint (`RespawnPointComponent`).
- [ ] **Session Retention Hook**
  - Stage completion or game over displays total score, collectibles acquired, and XP gained toward unlocking beneficial mutators in `MutatorRegistry`.

---

## 🛠️ Part 4: Mechanic Specification (Repo-Aligned)

### Mechanic 1: Asymmetrical Gravity & Variable Jump Height

**Purpose**: Provide tactile, reactive jump feel where holding jump grants full height and tapping grants short hops, with snappier falling speed.
**Player Fantasy**: Direct, weightless control over aerial movement.

#### ECS Input & Component State
- **Input Query**:
  ```typescript
  world.query("PlatformerInput", "PlatformerGravityConfig", "Velocity", "PlatformerGroundState")
  ```
- **Component Structures**:
  - `PlatformerInput`: `{ moveDir: number, jumpPressed: boolean, jumpHeld: boolean, jumpReleased: boolean }`
  - `PlatformerGravityConfig`: `{ riseGravity: 800, fallGravity: 1200, jumpVelocity: 350, minJumpVelocity: 150, apexThreshold?: number, apexGravityMultiplier?: number }`
  - `Velocity`: `{ vx: number, vy: number }`
  - `PlatformerGroundState`: `{ isGrounded: boolean }`

#### System Output Mutation
- Managed by `PlatformerGravitySystem` in `packages/core/src/physics/systems/PlatformerGravitySystem.ts`:
  ```typescript
  // In PlatformerGravitySystem.update(world, deltaTime):
  let gravity = vel.vy < 0 ? config.riseGravity : config.fallGravity;

  if (config.apexThreshold !== undefined && config.apexGravityMultiplier !== undefined) {
    if (Math.abs(vel.vy) < config.apexThreshold) {
      gravity *= config.apexGravityMultiplier;
    }
  }

  const mutableVel = world.getMutableComponent(entity, "Velocity");
  if (mutableVel) {
    mutableVel.vy += gravity * deltaTime;
  }
  ```

#### Variable Cut-Off Impulse
- When `input.jumpReleased` is detected while `vel.vy < -config.minJumpVelocity`, set `vel.vy = -config.minJumpVelocity` to instantly cap upward velocity.

#### Determinism & Safety Rules
- Uses `world.getMutableComponent` inside indexed loops without allocating temporary objects per frame.
- Any particle dispersion on jump/landing must source randomness from `world.renderRandom` (never `Math.random()`).

---

### Mechanic 2: Coyote Time & Jump Buffering (`PlatformerCoyoteSystem`)

**Purpose**: Eliminate input timing penalties when jumping off cliff edges or pressing jump frames before landing.
**Player Fantasy**: Seamless, highly responsive jumping execution.

#### ECS State Mutation
- `PlatformerJumper`: `{ coyoteTimer: number, jumpBufferTimer: number, coyoteTimeMax: 0.15, jumpBufferMax: 0.10 }`
- Managed by `PlatformerCoyoteSystem` in `packages/core/src/systems/PlatformerCoyoteSystem.ts`:
  - When grounded: reset `coyoteTimer = coyoteTimeMax`.
  - When leaving ground without jumping: decrement `coyoteTimer -= dt`.
  - When `jumpPressed`: set `jumpBufferTimer = jumpBufferMax`. Decrement `jumpBufferTimer -= dt` each frame.
  - If `jumpBufferTimer > 0` and `(isGrounded || coyoteTimer > 0)`: trigger jump, set `vy = -jumpVelocity`, reset `coyoteTimer = 0`, `jumpBufferTimer = 0`.

---

### Mechanic 3: Surface Friction Interaction (Ice & Bounce Tiles)

**Purpose**: Vary horizontal and vertical momentum based on ground surface classifications in `TilemapComponent`.
**Player Fantasy**: Mastering terrain characteristics for high-speed runs.

#### Surface Rules
- **Ice Ground (`kind: "ice"`)**: Sets `groundState.iceMultiplier = 0.25` `[PLACEHOLDER]`. Lowers effective acceleration and deceleration (`effectiveAccel = config.acceleration * iceMultiplier`), causing sliding drift.
- **Bounce Tiles (`kind: "bounce"`)**: Handled by `TileCollisionSystem`. On downward landing collision (`vy > 0`), multiplies landing velocity by tile bounce factor (`vy = -vy * tileDef.bounce`), launching player upward.

---

## ⚠️ Known Architecture Inconsistencies & Recommendations

### Combo System Duplication Notice
- **Current State**: Combo logic in Space Invaders, Pong, Flappy Bird, and Geometry Wars utilizes `ComboComponent` and `ComboSystem`.
- **Platformer Integration Proposal**: If combo or score multiplier mechanics (e.g. chaining enemy stomps or collecting coins in quick succession) are added to Platformer, they **MUST** consume the shared `ComboSystem` and `ComboComponent` from `packages/core/src/games/arcade/` rather than creating a local implementation.

---

## ⚡ Meta-Progression & Mutator Integration

Platformer hooks directly into `MutatorRegistry.ts` (`BENEFICIAL_MUTATORS`) to allow XP-purchased upgrades:

1. **`coyote_extension`**:
   - **XP Cost**: `400` `[PLACEHOLDER]`
   - **Effect**: Increases `coyoteTimeMax` from `0.15s` to `0.25s`.
2. **`apex_booster`**:
   - **XP Cost**: `600` `[PLACEHOLDER]`
   - **Effect**: Reduces gravity near jump apex by 50% (`apexGravityMultiplier = 0.5`), giving extended hang-time.
3. **`kinetic_saver`**:
   - **XP Cost**: `750` `[PLACEHOLDER]`
   - **Effect**: Retains 50% horizontal velocity when landing on ice or normal platforms from high-speed aerial movement.
