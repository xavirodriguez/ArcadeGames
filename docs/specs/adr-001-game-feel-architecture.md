# ADR 001: Game Feel Architecture & Shared Presentation Contracts

**Status:** Approved
**Date:** October 27, 2026
**Deciders:** ARQ (Architecture Lead), CORE (Engine Lead), GF (Game Feel Lead), GAME (Game Systems Lead), VFX (Visual Effects Lead), QA (Quality Lead), DESIGN (Design Lead)

---

## 1. Context and Problem Statement

ArcadeGames minigames currently employ a mixture of feedback mechanisms. While `@tiny-aster/core` provides `JuiceSystem`, `ScreenShakeSystem`, and `GameplayFreeze`, several minigames implement inline visual mutations directly inside physics or collision handlers (e.g. `ArkanoidCollisionSystem` manually setting `GameplayFreeze` resources and creating particle emitters, `HitRunFeedbackSystem` writing to both a custom `HitRunScreenShake` resource and `ScreenShakeComponent`, and `SpaceInvadersCollisionSystem` instantiating `new JuiceOrchestrator(world)` on every hit).

We need a unified, strictly typed, deterministic architecture for Game Feel without rewriting gameplay physics or stripping game-specific art styles.

---

## 2. Decision & Architecture Contracts

### 2.1 Role-Based Responsibilities

| Role | Domain Responsibility |
|---|---|
| **ARQ** | Approves architectural boundaries, ADRs, and module contracts. |
| **CORE** | Maintains core ECS, scheduler, `GameplayFreeze`, and temporal systems. |
| **GF** | Maintains `JuiceOrchestrator`, `JUICE_CATALOG`, and typed event interfaces. |
| **GAME** | Maintains gameplay rules, hit/death collision logic, and triggers semantic events. |
| **VFX** | Maintains particle emitters, shape drawers, and camera screen shake systems. |
| **QA** | Enforces unit, integration, rollback determinism, and performance testing. |
| **DESIGN** | Validates intensity, readability, and accessibility configurations. |

### 2.2 Temporal Contract: Hit-Stop & Gameplay Freeze

- **Canonical Mechanism**: `GameplayFreeze` (stored as a world resource) is the single source of truth checked by the engine scheduler (`Schedule.update()`) and movement/physics systems to suspend simulation updates during hit-stop.
- **Request Coordination**: All hit-stop requests MUST go through `requestHitStop(world, durationMs, priority)` or `JuiceOrchestrator.spawn` / `triggerEvent`.
- **Priority Hierarchy**:
  1. `CRITICAL (30)`: Player death, game over, critical damage.
  2. `HIGH (20)`: Boss / Elite destruction, major objective.
  3. `NORMAL (10)`: Standard enemy/block destruction.
  4. `LOW (5)`: Minor bullet grazing or non-destructive hit.
- **Rules**:
  - Overlapping hit-stops NEVER sum durations.
  - A higher priority request overrides lower priority active hit-stops.
  - Equal or lower priority requests are ignored during active hit-stops or cooldowns.

### 2.3 Presentation Lifecycle & Rollback Determinism

- **Rollback Isolation**: Feedback systems and particle emitters MUST check `if (world.isReSimulating) return;` to prevent duplicate sounds, particles, or shake triggers during rollback.
- **RNG Separation**: Visual effects and particle randomness MUST strictly consume `world.renderRandom` (or visual seeds) and NEVER consume `world.gameplayRandom`.
- **Orchestrator Instance Lifecycle**: `JuiceOrchestrator` instances MUST NOT be created transiently inside tight update loops (`new JuiceOrchestrator(world)` inside collision handlers). Games initialize or retrieve an orchestrator associated with the world lifecycle.

### 2.4 Low-Stimulation & Accessibility Mode

- `JuiceOrchestrator.setJuiceLevel(level, lowStimulationMode)` globally controls intensity (0.0 to 1.5).
- In `lowStimulationMode`:
  - Screen shake intensity is forced to `0`.
  - Hit flashes are disabled or converted to low-contrast muted pulses.
  - Particle spawn counts and effect scale are clamped to safe parameters.

---

## 3. Presentation and Temporal Dependency Diagram

```
+-----------------------------------------------------------------------+
|                            Gameplay System                            |
|     (e.g., ArkanoidCollisionSystem, CombatHit, CombatDeath)           |
+-----------------------------------------------------------------------+
                                   |
                                   | orchestrator.triggerEvent(gameId, event, ctx)
                                   v
+-----------------------------------------------------------------------+
|                           JuiceOrchestrator                           |
|  - Validates typed event in JUICE_CATALOG                             |
|  - Applies JuiceLevel & LowStimulationMode multipliers                |
+-----------------------------------------------------------------------+
         |                                         |
         | requestHitStop(ms, priority)            | Juice.shake(intensity, ms)
         v                                         v
+------------------------+             +------------------------+
|     HitStopSystem      |             |   ScreenShakeSystem    |
| (Priority Matrix Check)|             | (Mutates ScreenShake)  |
+------------------------+             +------------------------+
         |                                         |
         | enterGameplayFreeze(world, duration)    | Applies renderRandom offset
         v                                         v
+------------------------+             +------------------------+
|    GameplayFreeze      |             | VisualOffsetComponent  |
|  (Suspends Simulation) |             |    (Main Camera2D)     |
+------------------------+             +------------------------+
```

---

## 4. Prioritized Migration Plan

1. **Phase 1: Typed API & Catalog Consolidation**: GF consolidates `JUICE_CATALOG` with a generic TypeScript mapping (`GameJuiceEvents[G]`).
2. **Phase 2: Arkanoid Vertical Pilot**: GAME (Arkanoid) & GF replace direct `GameplayFreeze` mutations and inline particle emitters in `ArkanoidCollisionSystem` with `JuiceOrchestrator.triggerEvent("arkanoid", "brick:hit")` and `"brick:shatter"`.
3. **Phase 3: Pong & Asteroids Consolidation**: Migrate `PongCollisionSystem` and `AsteroidCollisionSystem` direct `Juice.shake` / `Juice.squash` calls to orchestrator events.
4. **Phase 4: Hit & Run Feedback Resolution**: Unify dual screen shake writing (`HitRunScreenShake` resource and `ScreenShakeComponent`) to single `ScreenShakeComponent`.
5. **Phase 5: Space Invaders & Geometry Wars Normalization**: Eliminate transient `new JuiceOrchestrator` instantiations in `SpaceInvadersCollisionSystem`.
6. **Phase 6 & 7: Auditing & Cleanup**: Clean legacy helpers and verify test suites.

---

## 5. Consequences

### Positive
- Presentation concerns are completely decoupled from gameplay physics code.
- Event key mismatches are caught at compile-time by TypeScript.
- Replays and multiplayer rollback determinism are strictly preserved.
- Full accessibility support via low-stimulation modes.

### Negative
- Requires updating existing calls to `JuiceOrchestrator` to pass typed event names.
