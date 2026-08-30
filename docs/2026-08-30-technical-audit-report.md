# Technical Audit & Architecture Evaluation Report

**Date:** 2026-08-30
**Role:** Staff / Principal Software Engineer
**Scope:** Architectural Analysis, Technical Debt Assessment, Quality & Maintainability Audit
**Repository:** Tiny Aster — Deterministic ECS Arcade Engine & Game Suite

---

## 1. Project Overview & Mental Model

### Purpose & Domain
**Tiny Aster** is a cross-platform, deterministic Entity-Component-System (ECS) arcade engine and game suite (Asteroids, Space Invaders, Flappy Bird, Pong, Geometry Wars, Echo Runner). It achieves strict separation between gameplay logic, presentation (Canvas/Skia rendering), and network transport (Colyseus authoritative server netcode).

### Architectural Stack
1. **Core Engine (`@tiny-aster/core`)**: Platform-agnostic ECS runtime (`World`, `Entity`, `Component`, `System`, `Schedule`, `CommandBuffers`), physics engine, component pooling, snapshot/restore, rollback netcode simulation, event bus, and audio abstractions (`IAudioPlayer`).
2. **Render Adapters (`@tiny-aster/renderer-canvas`, `@tiny-aster/renderer-skia`)**: Surface-agnostic visual drawers implementing a shared registration contract (`registerShape`, `registerBackgroundEffect`).
3. **Network Adapters (`@tiny-aster/network`, `@tiny-aster/network-colyseus`, `server/`)**: Authoritative Colyseus room handlers (`BaseRoom`, `AsteroidsRoom`, `SpaceInvadersRoom`) executing core simulation headlessly with client prediction and delta/binary replication strategies.
4. **Game Implementations (`src/games/*`)**: Domain-specific entities, blueprints, scenes, and systems built strictly on top of `@tiny-aster/core`.
5. **App Shell (`src/app/*`, `src/components/*`)**: Expo Router React Native application providing UI, HUDs, menus, and stage canvases.

---

## 2. Identified Opportunities & Vulnerabilities

### Opportunity Index

| ID | Title | Domain | Priority |
|---|---|---|---|
| **OPP-01** | Dual World Instance Antipattern in `SpaceInvadersGame` | Architecture / ECS | 🔴 Critical |
| **OPP-02** | Non-Deterministic Synchronous Event Emissions (`eventBus.emit`) | Netcode / Determinism | 🟠 High |
| **OPP-03** | Direct Component Mutations Bypassing ECS Version Tracking | Engine / ECS | 🟠 High |
| **OPP-04** | Server Room Memory Leaks & Force-Exited Test Workers | Server / CI | 🟠 High |
| **OPP-05** | Monorepo Structure: Monolithic Games in Root vs Modular Packages | Architecture / CI | 🟠 High |
| **OPP-06** | Duplicated Null/Mock Implementations Across Game Modules | Maintainability | 🟡 Medium |
| **OPP-07** | Inconsistent Input Normalization & Bridge Transformers | DX / Architecture | 🟡 Medium |
| **OPP-08** | Non-Optimized JSON Stringification Hash Fallbacks during Resimulation | Performance / Netcode | 🟡 Medium |
| **OPP-09** | Broad Usage of `as any` Typecasts in Netcode & Game Adapters | Type Safety | 🟡 Medium |
| **OPP-10** | Duplicated State Extraction Boilerplate in Game State Getters | Code Quality | 🟢 Low |

---

## 3. Detailed Opportunity Assessment

### OPP-01: Dual World Instance Antipattern in `SpaceInvadersGame`

* **Problem:** `SpaceInvadersGame` overrides `getWorld()` to return `this.sceneManager.getCurrentScene().getWorld()`, while `BaseGame` owns and initializes `this.world`. As a result, two distinct `World` instances exist simultaneously. Calls to `BaseGame.snapshot()`, `BaseGame.hash()`, `BaseGame.restore()`, or `BaseGame.world.update()` operate on an empty/desynced base world rather than the active gameplay scene world.
* **Evidence:**
  * File: `src/games/space-invaders/SpaceInvadersGame.ts`
  * Symbol: `SpaceInvadersGame.getWorld()`
  * Consequences in server: `server/src/SpaceInvadersRoom.ts` must manually re-assign `this.world = this.gameSimulation.getWorld()` inside `spawnPlayer`, `despawnPlayer`, `tick`, and `syncWorldToSchema`.
* **Why it matters:** Breaks snapshot hashing, rollback reconciliation, replay recording, and state persistence whenever `BaseGame` interface methods are invoked.
* **Impact:** 5/5
* **Estimated Effort:** 2 days
* **Risk:** Medium
* **Proposed Solution:** Refactor `SpaceInvadersGameScene` to accept and operate on the single `World` instance managed by `BaseGame` rather than creating its own separate `World`.
* **Alternatives:** Forward snapshot and update calls to `sceneManager.getCurrentScene().getWorld()`, but maintaining two world instances violates engine single-source-of-truth invariants.
* **Priority:** 🔴 Critical

---

### OPP-02: Non-Deterministic Synchronous Event Emissions (`eventBus.emit`)

* **Problem:** Gameplay systems in multiple games invoke synchronous `eventBus.emit()` during tick updates rather than `eventBus.emitDeferred()`. Synchronous emissions execute event handlers immediately during system loop iterations, causing unexpected entity state mutations or query iterator invalidations mid-tick.
* **Evidence:**
  * Script output: `scripts/check-ecs-invariants.ts`
  * Symbols:
    * `FlappyBirdGameStateSystem.ts`: `eventBus.emit("PlaySFX", { name: "score" })`
    * `PongGameStateSystem.ts`: `eventBus.emit("PlaySFX", { name: "hit" })`
    * `SpaceInvadersGameStateSystem.ts`: `eventBus.emit("stage:cleared", ...)`
    * `AchievementSystem.ts`: `eventBus.emit("achievement:unlocked", ...)`
* **Why it matters:** Causes non-deterministic side effects during multiplayer rollback resimulation and replay playback.
* **Impact:** 4/5
* **Estimated Effort:** 0.5 days
* **Risk:** Low
* **Proposed Solution:** Replace synchronous `eventBus.emit()` calls inside system `update()` routines with `eventBus.emitDeferred()`. Ensure deferred events are flushed at designated system phase boundaries (`world.getEventBus().flushDeferred()`).
* **Alternatives:** None; `emitDeferred()` is already the established engine standard.
* **Priority:** 🟠 High

---

### OPP-03: Direct Component Mutations Bypassing ECS Version Tracking

* **Problem:** Physical systems mutate component properties directly on read-only references obtained via `getComponent()` rather than invoking `getMutableComponent()`.
* **Evidence:**
  * Script output: `scripts/check-hardened-invariants.ts`
  * Files:
    * `packages/core/src/systems/InvulnerabilitySystem.ts`: `inv.remaining -= deltaTime`
    * `packages/core/src/systems/RenderUpdateSystem.ts`: `mutable.rotation += angularVelocity * deltaTime`
    * `packages/core/src/systems/RespawnSystem.ts`: `trans.x = respawnX`
    * `packages/core/src/physics/systems/BoundarySystem.ts`: `mt.x = 0`
    * `packages/core/src/physics/systems/PlatformCarrySystem.ts`: `t.x += platformVel.vx * deltaTime`
* **Why it matters:** Bypassing `getMutableComponent()` prevents the world from incrementing `stateVersion`, causing snapshot change tracking and reactive listeners to miss component updates.
* **Impact:** 4/5
* **Estimated Effort:** 1 day
* **Risk:** Low
* **Proposed Solution:** Migrate direct component field writes in core systems to `world.getMutableComponent()`.
* **Alternatives:** Use `world.getCommandBuffer()` for deferred structural writes where appropriate.
* **Priority:** 🟠 High

---

### OPP-04: Server Room Memory Leaks & Force-Exited Test Workers

* **Problem:** Test suite executions trigger Jest worker force-exit warnings: `"A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown."`
* **Evidence:**
  * Test runner output: `pnpm test`
  * File: `server/src/metrics/NetworkMetrics.ts` (`PerformanceObserver` observing `"gc"` events created per instance without global unregister).
  * File: `server/src/AsteroidsRoom.ts` (`onDispose()` missing explicit world teardown and event listener unhooking).
* **Why it matters:** Memory leaks in production game room lifecycle lead to gradual heap exhaustion on authoritative servers and slow, unstable CI runs.
* **Impact:** 4/5
* **Estimated Effort:** 1 day
* **Risk:** Low
* **Proposed Solution:** Ensure `BaseRoom.onDispose()` explicitly invokes `gameSimulation.destroy()`, clears active timers/intervals, and properly disconnects `PerformanceObserver` instances in `NetworkMetricsCollector`.
* **Alternatives:** Ignore test teardown warnings (unacceptable for long-running servers).
* **Priority:** 🟠 High

---

### OPP-05: Monorepo Structure: Monolithic Games in Root vs Modular Packages

* **Problem:** All game implementations reside under `src/games/*` within the root app workspace instead of being decoupled into separate packages (`packages/games-*`).
* **Evidence:**
  * File structure: `src/games/asteroids`, `src/games/space-invaders`, `src/games/pong`, `src/games/flappybird`, `src/games/geometrywars`, `src/games/echorunner`.
  * `README.md` Section: "Architectural Evaluation: Modularizing Games into Subpackages".
* **Why it matters:** Modifying a single file in one game invalidates Turborepo build and test caches for all other games, increasing CI execution times.
* **Impact:** 4/5
* **Estimated Effort:** 3 days
* **Risk:** Low
* **Proposed Solution:** Extract games into modular workspace packages (`packages/games-asteroids`, `packages/games-space-invaders`, etc.) leveraging pnpm workspace aliases (`@tiny-aster/games-asteroids`).
* **Alternatives:** Keep single folder structure with granular Turborepo path filters.
* **Priority:** 🟠 High

---

### OPP-06: Duplicated Null/Mock Implementations Across Game Modules

* **Problem:** Production game files duplicate large mock class definitions (`NullSpaceInvadersGame`, `NullAsteroidsGame`, `NullPongGame`) that manually stub 20+ interface methods with zero-value returns.
* **Evidence:**
  * Files: `src/games/space-invaders/SpaceInvadersGame.ts` (lines 583-630), `src/games/asteroids/AsteroidsGame.ts` (lines 485-520).
* **Why it matters:** Duplication creates maintenance friction whenever `IGame` or `BaseGame` interfaces evolve, as every null mock class must be updated manually across multiple files.
* **Impact:** 3/5
* **Estimated Effort:** 0.5 days
* **Risk:** Low
* **Proposed Solution:** Create a single generic `NullGame<TState, TInput>` class in `@tiny-aster/core` extending `BaseGame` with headless options.
* **Alternatives:** Keep per-game null classes but derive them from a central `BaseNullGame`.
* **Priority:** 🟡 Medium

---

### OPP-07: Inconsistent Input Normalization & Bridge Transformers

* **Problem:** Each game controller handles input state conversion differently (`CanonicalInputState`, `InputFrame`, `InputState`, raw action maps) using ad-hoc object checks and `as any` assertions.
* **Evidence:**
  * Files: `SpaceInvadersGame.ts` (`setInputState`), `AsteroidsGame.ts` (`setInputState`), `PongGame.ts` (`setInputState`).
* **Why it matters:** Increases bug surface when introducing new input devices (touch joysticks, gamepads) or adding new games.
* **Impact:** 3/5
* **Estimated Effort:** 1 day
* **Risk:** Low
* **Proposed Solution:** Standardize an `InputAdapter<TInput>` interface in `@tiny-aster/core` that translates `CanonicalInputState` into game-specific `Input` components deterministically.
* **Alternatives:** Keep per-game methods but centralize parsing helper functions.
* **Priority:** 🟡 Medium

---

### OPP-08: Non-Optimized JSON Stringification Hash Fallbacks during Resimulation

* **Problem:** For legacy Array of Structures snapshots (`isSoA === false`), `BaseGame.hash()` uses `hashAoS`, which performs `JSON.stringify()` on the entire world state to generate an FNV-1a hash.
* **Evidence:**
  * File: `packages/core/src/runtime/BaseGame.ts` (`hash()`)
  * File: `packages/core/src/snapshots/SnapshotHash.ts` (`hashAoS`)
* **Why it matters:** Executing `JSON.stringify()` every tick during resimulation or rollback reconciliation creates heavy heap allocations and CPU spikes.
* **Impact:** 3/5
* **Estimated Effort:** 1.5 days
* **Risk:** Medium
* **Proposed Solution:** Enforce `UseSoASnapshots = true` across all game modes or implement zero-allocation binary hash buffer serialization for AoS snapshots.
* **Alternatives:** Cache hash calculations when `stateVersion` has not changed.
* **Priority:** 🟡 Medium

---

### OPP-09: Broad Usage of `as any` Typecasts in Netcode & Game Adapters

* **Problem:** Over 600 total `as any` typecasts exist across the repository, tracked by `scripts/typecast-baseline.json`.
* **Evidence:**
  * Baseline file: `scripts/typecast-baseline.json`
  * Concentrations: `CombatRollbackResimulation.test.ts` (80), `SpaceInvadersGame.ts` (49), `AsteroidsGame.ts` (42), `BaseRoom.ts` (33).
* **Why it matters:** Disables TypeScript static analysis in critical netcode and game state pathways, hiding potential runtime type errors.
* **Impact:** 3/5
* **Estimated Effort:** 2 days
* **Risk:** Low
* **Proposed Solution:** Systematically replace `as any` in game state getters and room handlers with strongly typed generics and Zod schema validations, lowering the ratchet baseline via `pnpm check:ratchet`.
* **Alternatives:** Leave ratchet as-is and prevent new additions only.
* **Priority:** 🟡 Medium

---

### OPP-10: Duplicated State Extraction Boilerplate in Game State Getters

* **Problem:** `getGameState()` in `SpaceInvadersGame`, `AsteroidsGame`, and `GeometryWarsGame` repeats identical 30-line code blocks for extracting `Combo`, `DialogueBox`, `RunMutatorChoices`, and `ActiveRunMutators`.
* **Evidence:**
  * Files: `SpaceInvadersGame.ts` (`getGameState`), `AsteroidsGame.ts` (`getGameState`).
* **Why it matters:** Code duplication increases maintenance burden and chance of inconsistent state reporting across games.
* **Impact:** 2/5
* **Estimated Effort:** 0.5 days
* **Risk:** Low
* **Proposed Solution:** Extract a `GameStateExtractor` helper in `@tiny-aster/core` or `src/games/shared` to populate shared state fields (`combo`, `multiplier`, `dialogue`).
* **Alternatives:** Leave duplicate getters in each game.
* **Priority:** 🟢 Low

---

## 4. Quick Wins

1. **Migrate Synchronous `eventBus.emit` to `emitDeferred` (OPP-02):**
   * Instant fix for ECS determinism warnings across Flappy Bird, Pong, Space Invaders, and AchievementSystem.
2. **Generic `BaseNullGame` Class (OPP-06):**
   * Eliminates ~200 lines of duplicated mock class code across `SpaceInvadersGame.ts`, `AsteroidsGame.ts`, and `PongGame.ts`.
3. **Explicit Room Teardown in `onDispose` (OPP-04):**
   * Fixes worker thread leak warnings in `pnpm test` by cleaning up `PerformanceObserver` and game simulation listeners on room disposal.
4. **Shared `GameStateExtractor` Helper (OPP-10):**
   * Deduplicates combo and dialogue state extraction logic across all arcade game controllers.

---

## 5. Architectural Improvements

### Architectural Improvement 1: Single World Instance Architecture for Game Controllers

* **Current Problem:** `SpaceInvadersGame` instantiates a secondary `World` within `SpaceInvadersGameScene`, decoupling gameplay systems from `BaseGame.world`.
* **Proposed Architecture:**
  * `BaseGame` owns the canonical `World` instance.
  * Scenes receive `world` via constructor/injection and add/remove systems on scene transition without creating a new `World`.
* **Advantages:** Strict single source of truth; snapshotting, rollback, and hash calculations operate seamlessly on the active world.
* **Trade-offs:** Requires minor refactoring of scene setup hooks.

### Architectural Improvement 2: Modular Game Package Workspaces

* **Current Problem:** All games are bundled directly under `src/games/*` in the main application package.
* **Proposed Architecture:**
  * Move games to `packages/games-asteroids`, `packages/games-space-invaders`, `packages/games-pong`, etc.
  * Use pnpm workspace references (`@tiny-aster/games-asteroids`).
* **Advantages:** Independent Turborepo caching, granular testing (`pnpm --filter=@tiny-aster/games-asteroids test`), faster CI.
* **Trade-offs:** Additional `package.json` and `tsconfig.json` maintenance per game package.

---

## 6. Top 10 Prioritized Opportunities

Ordered by **Impact / Effort / Risk**:

1. **OPP-01: Dual World Instance Antipattern in `SpaceInvadersGame`** (🔴 Critical)
2. **OPP-02: Non-Deterministic Synchronous Event Emissions** (🟠 High)
3. **OPP-04: Server Room Memory Leaks & Test Teardown** (🟠 High)
4. **OPP-03: Direct Component Mutations Bypassing Version Tracking** (🟠 High)
5. **OPP-06: Generic `BaseNullGame` Class** (🟡 Medium - Quick Win)
6. **OPP-07: Standardized Input Normalization Adapter** (🟡 Medium)
7. **OPP-08: Zero-Allocation Hash Serialization for Netcode** (🟡 Medium)
8. **OPP-05: Modular Game Package Workspaces** (🟠 High)
9. **OPP-09: Typecast (`as any`) Ratchet Reduction** (🟡 Medium)
10. **OPP-10: Shared `GameStateExtractor` Helper** (🟢 Low - Quick Win)

---

## 7. Proposed Execution Roadmap

```
Phase 1: Quick Wins (Week 1)
  ├── OPP-02: Migrate eventBus.emit -> emitDeferred in systems
  ├── OPP-04: Fix server room disposal and PerformanceObserver leaks
  ├── OPP-06: Replace per-game NullGame classes with BaseNullGame
  └── OPP-10: Extract shared GameStateExtractor helper

Phase 2: Maintainability & Quality Gates (Week 2)
  ├── OPP-01: Refactor SpaceInvadersGame to single World architecture
  ├── OPP-03: Enforce getMutableComponent across physical systems
  └── OPP-09: Ratchet down 'as any' baseline in netcode and server rooms

Phase 3: Architectural Refactoring (Week 3)
  ├── OPP-07: Implement unified InputAdapter contract for all games
  └── OPP-08: Enforce zero-allocation SoA snapshots for resimulation

Phase 4: Long-term Evolution (Week 4+)
  └── OPP-05: Modularize games into packages/games-* workspace subpackages
```
