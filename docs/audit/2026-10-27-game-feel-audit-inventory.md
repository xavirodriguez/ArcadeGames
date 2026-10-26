# Game Feel Audit & Integration Inventory

**Date:** October 27, 2026
**Author:** Architecture Team (ARQ / CORE / GF / GAME / VFX / QA)
**Status:** Approved Phase 0 Deliverable

---

## 1. Overview & Objective

This document provides a comprehensive inventory of all audiovisual feedback ("Game Feel" / "Juice") paths across `@tiny-aster/core` and ArcadeGames minigames. Every route has been inspected in source code and classified according to its architectural role:

- `shared`: Shared core or shared presentation infrastructure with clean contracts.
- `game-specific`: Custom visual or gameplay feedback tied strictly to a specific minigame's mechanics/theme.
- `duplicate`: Redundant implementation where multiple systems trigger or manage the same effect through different state paths.
- `legacy`: Direct mutation or inline creation of presentation state inside physics or collision systems bypassing the orchestrator.
- `unknown`: Ambiguous or unverified integration path.

---

## 2. Core & Shared Infrastructure Inventory

| Module / System | File Path | Type | Role & Description |
|---|---|---|---|
| `Juice` static utility | `packages/core/src/utils/Juice.ts` | `shared` / `legacy` | Static helper methods (`Juice.flash`, `Juice.shake`, `Juice.squash`, `Juice.playShootJuice`, `Juice.playHitJuice`, `Juice.playDeathJuice`). Directly mutates `Render`, `Juice`, `ScreenShake`, or `GameState` components. Serves as low-level primitives for `JuiceSystem` and `JuiceOrchestrator`. |
| `JuiceSystem` | `packages/core/src/systems/JuiceSystem.ts` | `shared` | Core ECS system running in `Presentation` phase (`runsWhileFrozen = true`). Evaluates animated property interpolations on `JuiceComponent` and updates `VisualOffset` or `Render` properties. Skips execution during rollback (`world.isReSimulating`). |
| `ScreenShakeSystem` | `packages/core/src/systems/ScreenShakeSystem.ts` | `shared` | Evaluates remaining duration on `ScreenShakeComponent` and applies randomized camera displacement to `VisualOffsetComponent` on primary `Camera2D`. Uses `world.renderRandom` to preserve gameplay determinism. |
| `GameplayFreezeMixin` | `packages/core/src/runtime/GameplayFreezeMixin.ts` | `shared` | Core gameplay freeze resource helpers (`enterGameplayFreeze`, `exitGameplayFreeze`, `isGameplayFrozen`, `getGameplayFreezeRemaining`). Sets/reads `GameplayFreeze` resource checked by physics systems to pause simulation during hit-stop. |
| `HitStopSystem` | `src/games/shared/rendering/HitStopSystem.ts` | `shared` | Managed hit-stop system enforcing priority-based concurrency (`LOW`: 5, `NORMAL`: 10, `HIGH`: 20, `CRITICAL`: 30). Updates `hitStopTimer` and `hitStopCooldown` on `VFXWorldState`. |
| `JuiceOrchestrator` | `src/games/shared/rendering/JuiceOrchestrator.ts` | `shared` | Orchestrates visual effect primitives (`shockwave`, `shield_bubble`, `floating_text`, `hologram_glitch`, etc.) mapped via `JUICE_CATALOG`. Integrates hit-stop, screen shake, parameter tinting/scaling, and low-stimulation accessibility mode. |
| `SharedVFX` | `src/games/shared/rendering/SharedVFX.ts` | `shared` | Standardized rendering adapters (Canvas2D & Skia) for shared visual primitives and background effects. |

---

## 3. Minigame Integration Paths & Classification

### 3.1 Arkanoid (`src/games/arkanoid/`)

| File Path & Function | Event / Trigger | Implementation Path | Classification | Notes |
|---|---|---|---|---|
| `systems/ArkanoidCollisionSystem.ts:onCombatHit` | Non-destructive brick hit | Mutates `Render.hitFlashFrames = 4`, sets `GameplayFreeze` resource directly (`0.04s`), calls `Juice.squash`, spawns inline `spark` particle emitter. | `legacy` | Inline presentation inside collision system. To be migrated to `JuiceOrchestrator.triggerEvent("arkanoid", "brick:hit")` in Phase 2. |
| `systems/ArkanoidCollisionSystem.ts:onCombatDeath` | Brick destruction | Spawns score popups, creates inline `spark` explosion emitter, calls `Juice.shake`. | `legacy` | Particle creation and camera shake executed directly in collision callback. To be migrated in Phase 2. |
| `systems/ArkanoidCollisionSystem.ts:update` | Paddle bounce / Catch | Calls `Juice.squash(world, paddleEntity)` and emits deferred `PlaySFX`. | `legacy` / `game-specific` | Paddle squash feedback is localized and preserves catch mechanics. |

### 3.2 Pong (`src/games/pong/`)

| File Path & Function | Event / Trigger | Implementation Path | Classification | Notes |
|---|---|---|---|---|
| `systems/PongCollisionSystem.ts:85` | Ball & paddle bounce | Calls `Juice.shake(world, 4, 150)`, `Juice.squash` on ball and paddle. | `legacy` | Inline calls to `Juice.shake` and `Juice.squash`. |
| `systems/PongGameStateSystem.ts:87` | Goal scored | Mutates `ScreenShake` singleton directly. | `legacy` | Mutates singleton directly instead of issuing high-level hit-stop or orchestrator event. |

### 3.3 Asteroids (`src/games/asteroids/`)

| File Path & Function | Event / Trigger | Implementation Path | Classification | Notes |
|---|---|---|---|---|
| `systems/AsteroidInputSystem.ts:114` | Ship primary fire | Calls `Juice.playShootJuice(world, entity)`. | `shared` | Uses helper `Juice.playShootJuice`. |
| `systems/AsteroidCollisionSystem.ts:281` | Ship destruction | Calls `Juice.playDeathJuice(world, ship, { shakeIntensity: 6.0 })`. | `shared` | Uses helper `Juice.playDeathJuice`. |
| `systems/AsteroidCollisionSystem.ts:337` | Asteroid break | Calls `Juice.shake(world, size === "large" ? 3.0 : 1.5, 80)`. | `shared` / `legacy` | Direct call to `Juice.shake`. |

### 3.4 Space Invaders (`src/games/space-invaders/`)

| File Path & Function | Event / Trigger | Implementation Path | Classification | Notes |
|---|---|---|---|---|
| `scenes/SpaceInvadersGameScene.ts:180` | Scene setup | Registers `HitStopSystem` and `JuiceSystem`. | `shared` | Correctly registers hit-stop and juice presentation systems. |
| `systems/SpaceInvadersCollisionSystem.ts:132, 246, 493` | Alien / UFO destroyed | Instantiates local `new JuiceOrchestrator(world)` and calls `triggerEvent`. | `duplicate` | Creates new `JuiceOrchestrator` instance on every collision trigger rather than using a single world resource or member instance. |
| `systems/SpaceInvadersCollisionSystem.ts:87, 254` | Damage / Destroy | Calls `Juice.shake` and `Juice.squash` alongside orchestrator calls. | `duplicate` | Screen shake triggered twice (once via `Juice.shake` and once via orchestrator catalog). |

### 3.5 Hit & Run (`src/games/hitandrun/`)

| File Path & Function | Event / Trigger | Implementation Path | Classification | Notes |
|---|---|---|---|---|
| `systems/HitRunFeedbackSystem.ts` | Player/Enemy hit and death | Reads hit/death feedback profiles. Calls `enterGameplayFreeze` for canonical hit-stop. Writes both `HitRunScreenShake` resource AND core `ScreenShakeComponent` on main camera. | `duplicate` / `game-specific` | Hit-stop is canonical (`GameplayFreeze`). Screen shake writes to two parallel sources (`HitRunScreenShake` resource and `ScreenShakeComponent`). |
| `weapons/HitRunWeaponSystem.ts:110` | Weapon discharge / Explosions | Mutates `HitRunScreenShake` resource AND core `ScreenShakeComponent`. | `duplicate` | Parallel writing to resource and core component. |

---

## 4. Architectural Findings & Action Items

1. **Hit-Stop Alignment**:
   `GameplayFreeze` is the canonical runtime mechanism used by `Schedule.update()` to freeze simulation phase systems. `HitStopSystem` updates `VFXWorldState.hitStopTimer` and delegates to `enterGameplayFreeze(world, duration)`. Systems must never bypass `HitStopSystem` or `enterGameplayFreeze` by writing custom freeze objects directly to resources.

2. **Screen Shake Single Source of Truth**:
   Core `ScreenShakeSystem` reads `ScreenShakeComponent` on entities or the `ScreenShake` singleton/resource and applies randomized camera offset via `VisualOffsetComponent` using `world.renderRandom`. Game-specific resources like `HitRunScreenShake` must be consolidated onto `ScreenShakeComponent`.

3. **Orchestrator Lifecycle**:
   `JuiceOrchestrator` must not be instantiated via `new JuiceOrchestrator(world)` inside collision loops. A single instance must be managed or accessed via world helper to prevent unnecessary object creation.

4. **Rollback & Determinism Verification**:
   All visual particle and shake generators must strictly use `world.renderRandom` and check `world.isReSimulating === true` to avoid consuming gameplay random seeds or duplicating visual effects during rollback.
