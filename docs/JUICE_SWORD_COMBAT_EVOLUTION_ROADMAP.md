# Unified Combat Juice Evolution Roadmap (Sword & Fireball Weight & Impact)

**Target:** `docs/JUICE_SWORD_COMBAT_EVOLUTION_ROADMAP.md`
**Repository:** [xavirodriguez/ArcadeGames](https://github.com/xavirodriguez/ArcadeGames)
**Status:** Implementation Roadmap — Verified against current checkout (`src/games/` and `packages/`).

---

## 1. Objective and Core Philosophy

Transform the combat feel across TinyAsterEngine arcade games by making attacks feel weighted, tangible, and visually expressive.

Rather than building isolated systems for sword slashes and fireball projectiles, both attack families derive from a single unified combat lifecycle system (`CombatJuicePipeline`). The pipeline unifies two fundamental feedback paradigms into one single phase-driven engine model:

1. **Impact Punch:** Immediate feedback on contact (White flash, impact sound, directional sparks/particles, impulse knockback, camera shake, freeze/hit-stop).
2. **Disney Animation Principles:** Telegraphed animation cues (Anticipation, squash & stretch along movement axes, follow-through drag/settling, hit-stop, parabolic arc motion).

Every visual and kinetic feedback effect is driven by explicit lifecycle phase transitions (`anticipation` → `execution` → `contact` → `impact` → `follow_through`), decoupling deterministic simulation from high-fidelity visual rendering.

---

## 2. Verification Status and Codebase Evidence

The implementation decisions in this document are strictly based on static code inspection and unit test verification across the repository.

### 2.1 Verified Evidence Summary

- **Engine Timestep & Simulation:**
  - `BaseGame.ts` (`packages/core/src/runtime/BaseGame.ts`) runs a fixed deterministic 60Hz tick loop (`dt = 1/60`s).
  - Component storage is managed by `SparseSetStorage.ts` and `MapStorage.ts`. World states and snapshot hashes are binary-deterministic.
- **Hitbox & Spatial Queries:**
  - Hitboxes use `BoxColliderComponent` (`packages/core/src/ecs/CoreComponents.ts`) and `SpatialCullingSystem` / `Broadphase`.
  - Physics/Collision positions read directly from `TransformComponent.x`, `y`, `rotation`.
  - Hitbox detection is completely independent of visual rendering transformations (`VisualTransformComponent`).
- **Existing Melee and Projectile Implementations:**
  - `hitandrun` (`src/games/hitandrun/`): Fully implements both families! Sword melee sweep (`HitRunMeleeSystem.ts`, `ComboMeleeSystem.ts`) and fire/projectile attacks (`HitRunWeaponSystem.ts`, `HitRunBulletPool.ts`).
  - `platformer` (`src/games/platformer/`): Melee stomps and contact damage, but lacks directional sword sweeps.
  - `geometrywars` (`src/games/geometrywars/`): Rapid projectile weapons with directional recoil, but no sword melee.
  - `asteroids`, `space-invaders`, `vertical-shmup`: Projectiles and explosive contact damage.
  - `tower-defense`: Turret projectiles and slow-on-hit effects.
- **Visual Effects & Juice Architecture:**
  - `JuiceOrchestrator.ts` (`src/games/shared/rendering/JuiceOrchestrator.ts`) processes event-driven screen shake, camera rumble, and primitive VFX (`shockwave`, `screen_border_glow`, `hologram_glitch`).
  - `HitStopSystem.ts` (`src/games/shared/rendering/HitStopSystem.ts`) provides global frame freeze handling with priority queuing (`requestHitStop`).
  - `VisualParticlePool.ts` (`src/games/shared/rendering/VisualParticlePool.ts`) manages zero-allocation particle pooling.
  - `CircularPositionBuffer.ts` (`src/games/shared/rendering/CircularPositionBuffer.ts`) provides zero-allocation motion trail position history.
- **Audio Infrastructure:**
  - `@tiny-aster/arcade-sound-kit` (`packages/arcade-sound-kit/`) generates procedural 8-bit sound syntheses via `SoundSynthesizer`, `validateRecipe`, and `RecipeValidationError`.
- **Renderers:**
  - Dual rendering backend exists across Canvas2D (`CanvasRenderer.ts`) and Skia (`SkiaRenderer.ts`). Visual draw routines inspect entity components and theme tokens.

### 2.2 Evidence Labels

- **Verified:** Inspected in source code and confirmed via executable test or file inspection.
- **No verificado:** Unconfirmed assumption or pending experimental tuning.

---

## 3. Unified Phase-Driven Lifecycle Model

Both Melee (Sword) and Projectile (Fireball) attacks follow a single unified 5-phase timeline. Each effect is bound to one or more specific phases:

```
+---------------------------------------------------------------------------------------------+
|                                UNIFIED ATTACK LIFECYCLE TIMELINE                            |
+-------------------+------------------+-------------------+------------------+---------------+
| 1. ANTICIPATION   | 2. EXECUTION     | 3. CONTACT        | 4. IMPACT        | 5. FOLLOW-THRU|
| (Wind-up / Lean)  | (Travel / Arc)   | (Collision Detect)| (Blast / Punch)  | (Settle / Drag)|
+-------------------+------------------+-------------------+------------------+---------------+
| Hero leans back   | Arc sweep trail  | Contact trigger   | White Flash      | Body settles  |
| Fireball charges  | Stretched sphere | Hit stop start    | Knockback impulse| Trail lingers |
| Threat telegraph  | Parabolic arc    | Sound trigger     | Particle burst   | Burst drifts  |
|                   |                  |                   | Screen shake     | Arc damage num|
+-------------------+------------------+-------------------+------------------+---------------+
```

### Phase Mapping Table

| Phase | Melee (Sword Sweep) | Projectile (Fireball) |
|---|---|---|
| **1. Anticipation** | Hero leans back (`-15%` x-scale, `-5°` rotation), weapon shines. | Hero leans back, energy ball squashes (`0.7` length, `1.3` width) at hands. |
| **2. Execution** | Rapid forward arc sweep with motion ribbon trail. | Projectile travels along path (or subtle arc) stretched along velocity vector (`1.4` length, `0.75` width). |
| **3. Contact** | Sword hitbox intersects enemy collider. Triggers sound & hit stop. | Projectile collider intersects enemy/obstacle. Triggers sound & hit stop. |
| **4. Impact** | Target flashes white for 3 ticks; directional particle spark burst; knockback impulse applied; camera shake; enemy squashes on impact axis (`0.6` length, `1.4` width). | Target & fireball squash on impact axis; fireball detonate explosion burst; directional debris particles; knockback impulse applied; camera shake. |
| **5. Follow-through** | Hero body settles back to neutral (`easeInOut`); sword trail fades out over 4 ticks. | Projectile trail lingers and dissolves; fire smoke particles retain inertia drifting outward; floating damage numbers fly in parabolic arcs. |

---

## 4. Game × Attack Type × Effect Matrix

Comprehensive audit across all 15 arcade games currently in `src/games/`.

| Game | Melee Family | Projectile Family | Applied Effects | Excluded Effects & Justification |
|---|---|---|---|---|
| `hitandrun` **(PILOT)** | Sword Slash / Combo Sweep | Fireball / Laser / Shotgun / Grenade | **ALL EFFECTS:** Anticipation, Stretch/Squash, Flash, Sound, Particles, Knockback, Shake, Hit Stop, Arcs, Follow-through. | None. Target pilot game containing full combat mechanics. |
| `platformer` | Stomp / Kick | Enemy Projectiles | Flash, Sound, Particles, Knockback, Shake, Hit Stop, Squash/Stretch on stomp. | Sword Arc Sweep: Player uses stomps/dashes rather than sword. |
| `geometrywars` | None | Rapid Plasma / Homing Missiles | Flash, Sound, Directional Particles, Recoil Knockback, Screen Shake, Trail Follow-through. | Melee Anticipation: Hyper-fast twin-stick shooter requires instant input response (0-tick windup). |
| `space-invaders` | None | Cannon Shot / Alien Plasma | Flash, Sound, Explosion Particles, Hit Stop on Shield/UFO, Screen Shake. | Knockback: Aliens move on fixed grid step matrix; knockback would break grid invaders logic. |
| `asteroids` | None | Ship Laser / Asteroid Splat | Recoil, Explosive Particles, Screen Shake, Flash, Sound, Hit Stop on large breakup. | Melee Arc Sweep: No melee combat. |
| `vertical-shmup` | Shield Ram (contact) | Plasma Bullets / Bombs | Flash, Sound, Particle Spray, Screen Shake, Hit Stop on Bosses. | Grid/Position Knockback: Bullet hell movement requires precise position control. |
| `tower-defense` | None | Arrow / Cannon / Magic / Slow Orb | Sound, Impact Burst Particles, Floating Damage Arcs, Enemy Flash, Target Squash. | Player Anticipation: Towers fire automatically based on range timers. |
| `arkanoid` | Paddle Deflect (contact) | Laser Powerup / Doh Bullets | Paddle Squash/Stretch, Flash, Sound, Spark Particles, Ball Trail, Screen Shake on Brick Shatter. | Entity Knockback: Bricks are static grid items; ball trajectory is governed by reflection math. |
| `pong` | Paddle Hit | Ball | Paddle Stretch on impact, Flash, Sound, Particle Spark Burst, Screen Shake on Goal. | Sword/Fireball Anticipation: Pure classic pong physics model. |
| `echorunner` | Slide Tackle (contact) | Echo Wave | Flash, Sound, Particle Dust, Camera Shake, Hit Stop. | Knockback: Runner game velocity is strictly governed by lane scrolling. |
| `flappybird` | Pipe Collision (death) | None | Flash, Sound, Feathers Particle Burst, Screen Shake, Hit Stop on crash. | Melee / Fireball attack pipelines (pure avoidance gameplay). |
| `frogger` | Splat / Water Sink | None | Flash, Sound, Water Splash Particles, Hit Stop. | Attack mechanics (pure river crossing puzzle). |
| `outrun` | Vehicle Crash | None | Screen Shake, Sound, Smoke/Debris Particles, Speed Penalty. | Combat attacks. |
| `racing` | Car Collision | None | Tire Smoke Particles, Crash Sound, Camera Shake, Impulsive Collision Bounce. | Combat attacks. |
| `story` (shared) | Delegates to underlying minigame | Delegates to underlying minigame | Inherits from minigame adapter (`BaseArcadeAdapter`). | N/A |

---

## 5. Key Architecture & Design Decisions

### 5.1 Simulation vs. Presentation Boundary

To guarantee deterministic simulation and multiplayer synchronization (Colyseus rollback / snapshot reconciliation):

- **Pure Presentation (Client-Local / Visual Only):**
  - Flash (tint overlay), visual particles, audio playback, camera shake, squash & stretch visual scales, cosmetic damage number arcs, visual motion trails.
  - *Invariant:* Disabling presentation effects alters 0 bytes of simulation state or snapshot output.
- **Simulation Logic (Deterministic Core):**
  - Knockback velocity impulse (mutates `VelocityComponent`), hit stop tick counter (when pausing physics simulation), anticipation windup duration (when delaying attack hitbox activation).
  - *Invariant:* Executed identically across server and client simulation ticks.

### 5.2 Squash & Stretch Without Hitbox Mutation

- **Component:** `VisualTransformComponent` (`packages/core/src/ecs/CoreComponents.ts` or `src/games/shared/rendering/`).
  ```typescript
  export interface VisualTransformComponent {
    scaleX: number;
    scaleY: number;
    rotationOffset: number;
    skewX: number;
    skewY: number;
    offsetX: number;
    offsetY: number;
  }
  ```
- **Hitbox Isolation:** `BoxColliderComponent` and `TransformComponent` store untransformed world bounds `(x, y, width, height)`. Collision systems read `TransformComponent` directly. Renderers multiply canvas/Skia matrix by `VisualTransformComponent` scales without touching physics colliders.
- **Directional Alignment:**
  - For Projectiles: Eje de deformación alineado con el vector de velocidad normalizado `(vx, vy)`.
  - For Melee Hits: Eje de deformación alineado con la normal del impacto `(nx, ny)`.
- **Canvas / Skia Parity:** Both `CanvasRenderer` and `SkiaRenderer` push matrix, translate to `(x + offsetX, y + offsetY)`, rotate by `rotation + rotationOffset`, scale by `(scaleX, scaleY)`, draw shape/sprite, and pop matrix.

### 5.3 Anticipation, Latency, and Network Synchronization

- **Gameplay Impact:** A 6-tick (100ms) anticipation windup delays hitbox creation. In fast arcade games, heavy windups feel unresponsive if unbuffered.
- **Policy by Attack Family:**
  - *Light Melee:* 2 ticks (33ms) anticipation. Non-cancelable.
  - *Heavy Melee / Sword Sweep:* 5 ticks (83ms) anticipation. Cancelable by player roll/dash up to tick 3.
  - *Fireball Projectile:* 4 ticks (66ms) character cast windup before projectile spawn. Projectile spawns at tick 5.
- **Multiplayer / Remote Players:** On remote clients, input prediction plays the anticipation animation instantly upon button press. If server reconciles a rollback, the animation smoothly interpolates to correct phase without desyncing hitbox position.
- **Tuning Range (Initial Ticks at 60Hz):**
  - Melee: `startupTicks = 4`, `activeTicks = 3`, `recoveryTicks = 8`.
  - Fireball: `castTicks = 5`, `flyTicks = 30` (max TTL), `detonateTicks = 6`.

### 5.4 Arcos (Gameplay vs. Cosméticos)

- **Gameplay Trajectories (Simulation):** Fireballs travel either in a straight line or along a deterministic parabolic arc calculated via fixed gravimetric steps in `MovementSystem` (`vy += gravity * dt`).
- **Cosméticos (Presentation):**
  - Directional Sparks & Blood/Ember Particles: Calculated via quadratic Bezier control points:
    $$P(t) = (1-t)^2 P_0 + 2(1-t)t P_c + t^2 P_1$$
    where $P_c$ is perturbed perpendicular to impact normal $N$.
  - Floating Damage Text: Spawns at impact point $P_0$, arc height $H = 24\text{px}$, velocity $V_x = \text{randomDirection} \times 30\text{px/s}$, dropping down via gravity factor over $0.5\text{s}$.

### 5.5 Follow-Through & Trail Inertia

- **Motion Trails:** Uses `CircularPositionBuffer` (`capacity = 16`). Each tick stores position `(x, y)`, velocity, and rotation.
- **Lag / Delay Effect:** Renderers sample position history with a decay curve $A(i) = (i / capacity)^{1.5}$. When hero stops moving, the trail points continue forward along stored velocity vectors for 3 ticks before collapsing.
- **Particle Inertia:** On fireball explosion or sword hit, particles inherit 30% of projectile/sword velocity vector $\vec{V}_{\text{parent}}$ added to their random explosion radial vector $\vec{V}_{\text{radial}}$.

### 5.6 Unified Hit Stop Architecture

- Uses `HitStopSystem.ts` with explicit `HitStopPriority`:
  - `LIGHT_HIT` (Weak projectile / light slash): 2 ticks (33ms), priority `LOW`.
  - `MEDIUM_HIT` (Heavy sword slash / fireball direct hit): 4 ticks (66ms), priority `NORMAL`.
  - `CRITICAL_HIT` (Kill blow / boss impact / hero damage): 8 ticks (133ms), priority `CRITICAL`.
- **Freeze Mechanism:** `HitStopSystem` decrements `HitStopRemaining`. While `HitStopRemaining > 0`, positional physics updates (`MovementSystem`, `PhysicsSystem`) skip entity translation for affected entities, while `VisualParticlePool` and rendering loops continue drawing ambient animation and CRT scanlines.

### 5.7 Decoupled Event-Driven Architecture

Collision and combat systems emit structured events on `world.getEventBus()` instead of calling juice logic inline:

```typescript
export interface CombatAttackPhaseEvent {
  entity: number;
  attackId: string;
  family: "melee" | "projectile";
  phase: "anticipation" | "execution" | "contact" | "impact" | "follow_through";
  position: { x: number; y: number };
  direction: { x: number; y: number };
}

export interface CombatImpactEvent {
  attackerEntity: number;
  targetEntity: number;
  attackFamily: "melee" | "projectile";
  profileId: string;
  position: { x: number; y: number };
  normal: { x: number; y: number }; // Normalized impact vector (nx, ny)
  damage: number;
  isFatal: boolean;
}
```

Independent Juice listeners (`CombatJuiceSystem`, `JuiceOrchestrator`) subscribe to these events and trigger visual transforms, particle spawns, sound recipes, and camera rumbles.

### 5.8 Data-Driven Combat Juice Profiles

Per-attack feel parameters are stored in typed data schemas:

```typescript
export interface CombatJuiceProfile {
  id: string;
  family: "melee" | "projectile";
  phases: {
    anticipationTicks: number;
    executionTicks: number;
    contactTicks: number;
    followThroughTicks: number;
  };
  squashStretch: {
    anticipationScaleX: number;
    anticipationScaleY: number;
    impactTargetScaleX: number; // e.g. 0.6
    impactTargetScaleY: number; // e.g. 1.4
    recoveryDurationTicks: number;
  };
  flash: {
    durationTicks: number;
    colorHex: string; // e.g. "#FFFFFF"
  };
  particles: {
    count: number;
    speedMin: number;
    speedMax: number;
    spreadAngleRad: number;
    inheritVelocityFactor: number;
    tintTokens: string[];
  };
  knockback: {
    impulseMagnitude: number;
    decayFactor: number;
  };
  shake: {
    intensity: number;
    durationMs: number;
  };
  hitStop: {
    durationMs: number;
    priority: number;
  };
  soundRecipe: {
    recipeId: string;
    pitchVariation: number;
  };
}
```

Profiles live in `packages/gameplay-kit/src/combat/profiles/` and are registered in `World` resources, easily overrideable via `Theme` overrides or game blueprints.

### 5.9 Package and Module Boundaries

- `packages/gameplay-kit/src/combat/`:
  - `CombatJuicePipeline.ts`: Core system orchestrating attack phases.
  - `CombatJuiceProfileSchema.ts`: Profile types and validation schemas.
  - `components/VisualTransformComponent.ts`: Visual transform offsets for squash/stretch.
  - `systems/VisualSquashStretchSystem.ts`: Smooth spring-damper recovery for visual scale.
- `src/games/shared/rendering/`:
  - `SharedVFX.ts`: Reusable particle profile spawners and floating text arcs.
  - `JuiceOrchestrator.ts`: Event bus adapter mapping `CombatImpactEvent` to screen shake and audio.
- `@tiny-aster/arcade-sound-kit`:
  - Sound recipes for sword slashes (`sword_sweep`, `sword_clash`, `sword_flesh_hit`) and fireballs (`fireball_cast`, `fireball_fly_loop`, `fireball_detonate`).

### 5.10 Resource Pooling, Caps, and Sound Voice Limits

- **Particle Pooling:** `VisualParticlePool` uses preallocated fixed-capacity array (max 256 active particles per game instance). When capacity is reached, oldest low-priority particles are recycled. Max 32 particles spawned per impact frame.
- **Sound Voice Limits:** Audio system limits concurrent impact sounds to max 4 voices per frame, prioritizing local player impacts over background NPC hits. Pitch is randomized by $\pm 8\%$ (`1 + (random - 0.5) * 0.16`) to eliminate machine-gun repetition.
- **Knockback Bounds Safety:** Knockback velocities applied to entities check map boundaries and static colliders using `GridRaycast` / `SpatialCulling`. If an impulse pushes an entity into a wall, velocity is clamped and secondary wall-bounce spark particles spawn.

### 5.11 Global Toggle and Motion Reduction Accessibility

- `Theme` resource and `VFXWorldState` include accessibility flags:
  ```typescript
  export interface VFXWorldState {
    juiceLevel: number;        // 0.0 (off) to 1.0 (full)
    motionReduction: boolean; // Accessible low-motion mode
  }
  ```
- **When `juiceLevel === 0`:**
  - All visual squash/stretch, screen shake, flashes, damage numbers, and particles are skipped.
  - Hit stop duration is forced to 0.
  - Simulation behavior (knockback impulse and attack phase tick timing) remains 100% unchanged.
- **When `motionReduction === true`:**
  - Camera shake intensity scaled to 0.
  - Screen flashes replaced with subtle outline highlights.
  - Squash/stretch maximum scale clamped to $\pm 10\%$ max deformation.

---

## 6. Phased Implementation Plan

Each phase is sized for a single focused work session with a dedicated git commit.

```
+-----------------------------------------------------------------------------------+
|                            PHASED EXECUTION ROADMAP                               |
+-----------------------------------------------------------------------------------+
| PHASE 1: Core Combat Juice Engine & Visual Transform (packages/gameplay-kit)     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 2: Shared VFX Utilities, Sound Recipes & Floating Damage Arcs               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 3: Pilot Integration in Hit & Run (Sword Melee & Fireball Weapons)          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 4: Secondary Game Integrations (Platformer, GeometryWars, TowerDefense)     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 5: Accessibility, Motion Reduction & Determinism Test Guardrails            |
+-----------------------------------------------------------------------------------+
```

---

### Phase 1 — Core Combat Juice Engine & Visual Transform Component

**Session Goal:** Implement the foundational `VisualTransformComponent`, `VisualSquashStretchSystem`, and data-driven `CombatJuicePipeline` in `packages/gameplay-kit`.

- **Target Packages/Files:**
  - `packages/gameplay-kit/src/combat/components/VisualTransformComponent.ts` (NEW)
  - `packages/gameplay-kit/src/combat/systems/VisualSquashStretchSystem.ts` (NEW)
  - `packages/gameplay-kit/src/combat/types/CombatJuiceTypes.ts` (NEW)
  - `packages/gameplay-kit/src/combat/systems/CombatJuicePipeline.ts` (NEW)
  - `packages/renderer-canvas/src/CanvasRenderer.ts`
  - `packages/renderer-skia/src/SkiaRenderer.ts`
- **Atomic Steps:**
  1. Create `VisualTransformComponent` definition with `scaleX`, `scaleY`, `rotationOffset`, `offsetX`, `offsetY`.
  2. Implement `VisualSquashStretchSystem` applying critically damped spring-damper recovery ($k = 300, c = 20$) back to unit scale $(1, 1)$ every tick.
  3. Update `CanvasRenderer` and `SkiaRenderer` matrix transforms to apply `VisualTransformComponent` offsets without touching `TransformComponent` or `BoxColliderComponent`.
  4. Implement `CombatJuicePipeline` listening to `combat:attack_phase` and `combat:impact` events.
- **Acceptance Criteria:**
  - Unit tests verify that applying visual squash/stretch does not alter `BoxColliderComponent` bounding box or collision detection output.
  - Dual renderers (Canvas & Skia) render identical visual deformations.
- **Risks & Mitigations:**
  - *Risk:* Matrix stack leak in render loops. *Mitigation:* Wrap transform operations in strict `ctx.save()` / `ctx.restore()` or Skia `canvas.save()` / `canvas.restore()` blocks.

---

### Phase 2 — Shared VFX Utilities, Sound Recipes & Damage Arcs

**Session Goal:** Expand `@tiny-aster/arcade-sound-kit` with sword/fireball recipes and extend `SharedVFX` with directional particle bursts and parabolic damage text arcs.

- **Target Packages/Files:**
  - `packages/arcade-sound-kit/src/recipes/combatRecipes.ts` (NEW)
  - `src/games/shared/rendering/SharedVFX.ts`
  - `src/games/shared/rendering/VisualParticlePool.ts`
- **Atomic Steps:**
  1. Add 6 procedural sound recipes in `arcade-sound-kit`: `sword_sweep`, `sword_clash`, `sword_flesh_hit`, `fireball_cast`, `fireball_fly_loop`, `fireball_detonate`.
  2. Add `spawnDirectionalBurst()` to `SharedVFX.ts` taking impact origin $(x, y)$, normal vector $(nx, ny)$, spread angle, and speed.
  3. Add `spawnParabolicDamageText()` to `SharedVFX.ts` animating floating numbers along Bezier arc trajectories.
  4. Integrate voice limit caps (max 4 concurrent impact sounds per frame) and particle allocation guards.
- **Acceptance Criteria:**
  - `pnpm --filter=@tiny-aster/arcade-sound-kit test` passes with recipe validation.
  - Particle spawns recycle cleanly when cap (256) is reached without garbage collection allocations.
- **Risks & Mitigations:**
  - *Risk:* Audio distortion from overlapping noise bursts. *Mitigation:* Apply soft clipping compressor in `arcade-sound-kit` synthesis buffer.

---

### Phase 3 — Pilot Integration in Hit & Run (Sword Melee & Fireball Weapons)

**Session Goal:** Integrate the complete unified combat juice pipeline into `hitandrun`, validating both Sword Melee and Fireball/Laser weapons in a real game.

- **Target Files:**
  - `src/games/hitandrun/melee/HitRunMeleeSystem.ts`
  - `src/games/hitandrun/weapons/HitRunWeaponSystem.ts`
  - `src/games/hitandrun/systems/HitRunCombatSystem.ts`
  - `src/games/hitandrun/systems/registerHitRunFeedback.ts`
  - `src/games/hitandrun/HitAndRunGame.ts`
  - `src/games/hitandrun/__tests__/HitRunCombatJuice.test.ts` (NEW)
- **Atomic Steps:**
  1. Emit `combat:attack_phase` in `HitRunMeleeSystem.ts` during sword windup, active sweep, and follow-through recovery.
  2. Emit `combat:attack_phase` in `HitRunWeaponSystem.ts` when firing fireball projectiles and upon projectile detonation.
  3. Emit `combat:impact` in `HitRunCombatSystem.ts` carrying attacker, target, impact normal vector, and damage.
  4. Register `CombatJuicePipeline` in `registerHitRunFeedback.ts` and attach profiles for `sword_slash` and `fireball_blast`.
  5. Run integration tests and measure feel across Canvas2D and Skia visual modes.
- **Acceptance Criteria:**
  - Sword slash triggers hero windup lean, arc trail, impact flash, sound, directional spark burst, enemy squash, and 4-tick hit stop.
  - Fireball triggers cast squash, traveling stretched sphere, detonation explosion burst, camera shake, and knockback impulse.
  - All existing `hitandrun` unit tests continue passing with zero regressions.
- **Risks & Mitigations:**
  - *Risk:* Hit stop interfering with weapon cooldown timers. *Mitigation:* Weapon cooldown systems check `isHitStopActive(world)` and pause cooldown decrement during freeze ticks.

---

### Phase 4 — Secondary Game Integrations (Platformer, Geometry Wars, Tower Defense)

**Session Goal:** Roll out the unified combat juice pipeline to `platformer`, `geometrywars`, and `tower-defense`.

- **Target Files:**
  - `src/games/platformer/systems/PlatformerDamageSystem.ts`
  - `src/games/geometrywars/systems/`
  - `src/games/tower-defense/systems/`
- **Atomic Steps:**
  1. Attach `VisualTransformComponent` to platformer player on stomp and damage impact.
  2. Wire `geometrywars` plasma impacts and missile detonations to emit `combat:impact` with directional recoil.
  3. Wire `tower-defense` turret projectile impacts to trigger enemy flash, impact sound, target squash, and floating damage arcs.
- **Acceptance Criteria:**
  - Impact feedback works consistently across all 3 games according to the Game × Effect matrix.
- **Risks & Mitigations:**
  - *Risk:* Performance slowdown with dense enemy swarms in Geometry Wars or Tower Defense. *Mitigation:* Enforce strict particle caps (max 8 particles per swarm hit) and priority hit stop overrides.

---

### Phase 5 — Accessibility, Motion Reduction & Determinism Test Guardrails

**Session Goal:** Implement motion reduction controls and comprehensive automated regression test suites.

- **Target Files:**
  - `src/games/shared/rendering/JuiceOrchestrator.ts`
  - `packages/core/src/theme/Theme.ts`
  - `packages/core/tests/CombatDeterminismParity.test.ts` (NEW)
  - `packages/core/tests/HitboxIsolation.test.ts` (NEW)
- **Atomic Steps:**
  1. Implement `juiceLevel` and `motionReduction` toggles in `JuiceOrchestrator`.
  2. Write determinism test: run 100 combat ticks with `juiceLevel = 1.0` and `juiceLevel = 0.0`; verify resulting `World` snapshot hashes are 100% identical.
  3. Write hitbox isolation test: apply max squash/stretch deformation $(2.0, 0.5)$; verify `BoxColliderComponent` bounds remain un-deformed.
  4. Write particle pool bound test: spawn 1000 impact events in a single tick; verify memory allocation does not grow beyond preallocated 256 capacity.
- **Acceptance Criteria:**
  - All 3 automated test suites pass cleanly.
  - `pnpm run ci` passes without typecheck or ratchet errors.

---

## 7. Required Automated Test Guardrails

1. **Determinism Parity Test (`CombatDeterminismParity.test.ts`):**
   - *Requirement:* Simulation snapshot hashes after $N$ combat ticks must be binary-identical regardless of whether visual juice is enabled (`juiceLevel = 1.0`) or disabled (`juiceLevel = 0.0`).
2. **Hitbox Isolation Test (`HitboxIsolation.test.ts`):**
   - *Requirement:* Mutating `VisualTransformComponent` (scaleX, scaleY, skew, rotationOffset) must not alter spatial culling queries, AABB bounding boxes, or raycast intersections on `BoxColliderComponent`.
3. **Particle Pool Boundedness Test (`ParticlePoolBoundedness.test.ts`):**
   - *Requirement:* Spawning continuous combat impacts over 10,000 frames must maintain constant memory footprint with zero heap allocations after initial pool warm-up.

---

## 8. Open Questions Requiring User Input

1. **Hit Stop Mechanics in Local Co-op / Multiplayer:**
   - *Question:* Should hit stop pause physics simulation for ALL entities globally (standard arcade style), or only pause physics for the attacker and target entities (preserving movement for non-involved remote players)?
   - *Recommendation:* Global freeze for single-player games and local co-op; entity-isolated freeze for Colyseus online multiplayer to prevent remote player stutter.
2. **Sword Slash Canceling Window:**
   - *Question:* Should heavy sword melee attacks be cancelable by a dash/roll during the initial anticipation phase (2-3 ticks), or should all melee attacks commit full animation length once button is pressed?
   - *Recommendation:* Allow dash-canceling during windup for high-skill expression in `hitandrun`.
3. **Floating Damage Text Visual Style:**
   - *Question:* Should damage numbers use retro 8-bit bitmap font characters or procedural stroke vectors matching the active game concept pack/theme?
   - *Recommendation:* Use procedural vector characters derived from the game theme font tokens to maintain theme decoupling parity.

---

## 9. Definition of Done

- Unified combat juice engine (`CombatJuicePipeline`) implemented in `packages/gameplay-kit`.
- Dual Canvas2D and Skia renderers support `VisualTransformComponent` squash & stretch without altering physics colliders.
- Pilot game `hitandrun` exhibits complete weighted feedback for both sword slashes and fireball projectiles.
- All automated guardrail tests (Determinism, Hitbox Isolation, Particle Cap) pass with 100% coverage.
- Full workspace verification (`pnpm run ci`) completes with zero errors.
