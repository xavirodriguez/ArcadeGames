## 1. Project Overview

### TinyAster Monorepo Package List

The repository is structured as a `pnpm`/`Turborepo` monorepo containing a root application (the `asteroides` Expo/React Native app), a Colyseus server (`/server`), and eight specialized packages inside `packages/`. Each package enforces isolated responsibilities and architectural boundaries via custom linters.

| Package                     | npm Package Name               | Responsibility                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/core`             | `@tiny-aster/core`             | Platform-agnostic ECS engine: `World`, `Schedule`, fixed-timestep `GameLoop`, physics, snapshots/rollback, shared systems (TTL, Juice, Particles), audio contracts (`IAudioPlayer`), and assets. Zero dependencies on React Native, Expo, Colyseus, or Skia.                                                             |
| `packages/gameplay-kit`     | `@tiny-aster/gameplay-kit`     | Reusable arcade gameplay systems: combat/damage (`CombatSystem`), loot (`LootSystem`), power-ups (`PowerUpSystem`/`PowerUpEffectRegistry`), enemy waves (`SpawnDirectorSystem`), enemy blueprints, mutators/modifiers, and AI behaviors. Depends on `@tiny-aster/core` with no knowledge of specific platforms or games. |
| `packages/network`          | `@tiny-aster/network`          | Pure networking logic: client-side prediction (`RemoteInputPredictor`, `PredictionBuffer`), remote interpolation, rollback buffers (`InputRingBuffer`), and binary snapshot compression (`InputSerializer`). Depends exclusively on `@tiny-aster/core`.                                                                  |
| `packages/network-colyseus` | `@tiny-aster/network-colyseus` | Client-side Colyseus transport adapters connecting `@tiny-aster/network` and `@tiny-aster/core` to the Colyseus protocol.                                                                                                                                                                                                |
| `packages/renderer-canvas`  | `@tiny-aster/renderer-canvas`  | Web renderer implementation utilizing `CanvasRenderingContext2D` (`CanvasRenderer`, `CanvasShapeDrawers`, `CanvasSpriteDrawer`).                                                                                                                                                                                         |
| `packages/renderer-skia`    | `@tiny-aster/renderer-skia`    | Native mobile GPU-accelerated renderer implementation using `@shopify/react-native-skia` (`SkiaRenderer`, `SkiaShapeDrawers`, `SkiaSpriteDrawer`).                                                                                                                                                                       |
| `packages/react-native`     | `@tiny-aster/react-native`     | React hooks and providers bridging the React lifecycle with the ECS `World` (e.g., `useGame.ts`).                                                                                                                                                                                                                        |
| `packages/arcade-sound-kit` | `@tiny-aster/arcade-sound-kit` | Pure DSP procedural sound generator rendering deterministic WAV files from declarative recipes (`tone`, `noise`, `whoosh`, etc.). No dependency on Web Audio or Tone.js; includes the `ask-generate` CLI.                                                                                                                |
| `root` (`asteroides`)       | —                              | Main Expo/React Native application assembling all packages.                                                                                                                                                                                                                                                              |
| `server`                    | —                              | Headless Colyseus Node.js server importing `@tiny-aster/core`, `@tiny-aster/network`, and `@tiny-aster/gameplay-kit` for authoritative simulation. Importing UI or React code is forbidden.                                                                                                                              |

---

## 2. Determinism Principles & Technical Glossary

### Understanding Determinism

**Determinism** guarantees that executing the simulation twice with the same initial seed and input sequence yields an exact bit-for-bit identical state across all devices and times. This is essential for:

- **Rollback Netcode**: The client predicts local inputs immediately. When receiving server updates, the client rewinds to a past tick and re-simulates with corrected inputs. Without determinism, re-simulating would diverge and break state synchronization.
- **Replays**: Matches are saved purely as the seed and input stream, replayed step-by-step to perfectly reconstruct the match.

#### Pillars of Determinism

1. **Fixed Timestep**: The simulation strictly advances in increments of `1/60` seconds regardless of real-time frame rates, preventing variance between fast and slow devices.
2. **Isolated Randomness (`world.gameplayRandom`)**: All deterministic gameplay factors (enemy spawns, damage rolls, loot drops) must use a seed-driven pseudo-random generator (`world.gameplayRandom`), never `Math.random()`. Visual-only effects (particles, screen shake) use `world.renderRandom`.

---

### Technical Glossary

#### Core ECS Architecture

The engine uses a high-performance Entity Component System (ECS) designed for determinism and serializable state.

| Term                   | Definition                                                                                              | Key Source File / Class                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **ECS**                | Entity Component System. An architectural pattern favoring composition over class inheritance.          | `packages/core/src/ecs/World.ts`              |
| **World**              | The central container managing entities, component storages, resources, and systems.                    | `packages/core/src/ecs/World.ts`              |
| **Component**          | Plain data structure attached to an entity. Must be fully serializable.                                 | `packages/core/src/ecs/Component.ts`          |
| **System**             | Stateful or stateless logic processing entities containing specific query components.                   | `packages/core/src/ecs/System.ts`             |
| **Schedule**           | Manages system execution sequence ordered into logical phases.                                          | `packages/core/src/ecs/Schedule.ts`           |
| **SystemPhase**        | Execution ordering enum (`Input`, `Simulation`, `Transform`, `Collision`, `GameRules`, `Presentation`). | `packages/core/src/ecs/System.ts`             |
| **WorldCommandBuffer** | Defers structural mutations (add/remove entities) to be applied safely at tick completion.              | `packages/core/src/ecs/WorldCommandBuffer.ts` |
| **ComponentCloner**    | Utility for deep-copying component states for snapshot generation.                                      | `packages/core/src/ecs/ComponentCloner.ts`    |
| **Blueprint**          | Template definition used to instantiate pre-configured entity graphs.                                   | `packages/core/src/ecs/BlueprintRegistry.ts`  |

#### Game Loop & Runtime

- **GameLoop**: Ticker driving fixed-timestep updates (`packages/core/src/loop/GameLoop.ts`).
- **FrameScheduler**: Orchestrates simulation timing with platform render frames (`packages/core/src/loop/FrameScheduler.ts`).
- **BaseGame**: Abstract base class implementing `IGame` and `Simulation` contracts (`packages/core/src/runtime/BaseGame.ts`).
- **ArcadeKernel**: State machine handling transitions across high-level game states (`packages/core/src/runtime/ArcadeKernel.ts`). _(Verify exact state names against source before relying on them — do not assume specific enum literals without checking the file directly.)_
- **GameLifecycleState**: Enum representing runtime statuses. _(Same caveat: confirm exact literal values in source rather than assuming.)_
- **GameplayFreeze**: System freeze mechanism typically used for hit-stop visual feedback (`packages/core/src/runtime/GameplayFreezeMixin.ts`).

#### Networking & Physics

- **InputFrame / CompactInputFrame**: Raw dictionary or bitmask-compressed input payloads (`packages/core/src/input/InputFrame.ts`).
- **InputRingBuffer**: Circular buffer enabling O(1) tick state lookups for rollback resimulation (`packages/network/src/InputRingBuffer.ts`).
- **PredictionBuffer**: Stores historic snapshots for state reconciliation (`packages/network/src/PredictionBuffer.ts`).
- **FNV-1a Hash**: Fast non-cryptographic hashing algorithm for snapshot verification, implemented in `packages/core/src/snapshots/SnapshotHash.ts` (`hashSoA`) and consumed by `packages/core/src/runtime/BaseGame.ts` for state verification.
- **BroadPhase / NarrowPhase**: Sweep & Prune candidate filtering followed by SAT (Separating Axis Theorem) collision calculation (`packages/core/src/physics/collision/`).
- **TTL (Time To Live)**: Component scheduling entity destruction after a timed duration (`packages/core/src/ecs/CoreComponents.ts`).

#### Narrative, Meta-Game & Optimization

- **StoryRuntime / StoryGraph / StoryNode**: Data-driven story engine managing dialogue graphs, conditions, and choices (`packages/core/src/story/`).
- **Mutator**: Session modifiers or persistent player upgrades (`src/utils/MutatorRegistry.ts`).
- **ObjectPool / PrefabPool**: GC-friendly instance recycling system (`packages/core/src/ecs/CoreComponents.ts`).
- **WorldSnapshot (AoS vs SoA)**: Array of Structures (standard JavaScript objects) versus Structure of Arrays (binary packed array format optimized for network transmission).

---

## 3. Architecture & Code Style Guidelines

### Composition Over Inheritance

Traditional deep inheritance trees (`GameObject` → `Ship` → `PlayerShip`) create tight coupling, bloated base classes, and "diamond inheritance" problems. TinyAster solves this by completely separating **Data** (`Components`) from **Logic** (`Systems`). Games are assembled by composing systems rather than extending gameplay classes.

#### Two-Tier Structural Hierarchy

1. **`BaseGame`** (`packages/core/src/runtime/BaseGame.ts`): The root abstract class that all games extend **once**. It contains zero game-specific logic; instead, it manages lifecycle handlers (`init`, `start`, `pause`, `destroy`), the `World`, `EventBus`, `SceneManager`, audio, and state verification hashes.
2. **Concrete Games** (`AsteroidsGame`, `PongGame`, `SpaceInvadersGame`, etc.): Extend `BaseGame` and compose their mechanics by registering `System` instances inside the `onRegisterSystems()` hook:

```
BaseGame (Inherited once)
   └── AsteroidsGame extends BaseGame
          └── onRegisterSystems() { world.addSystem(new X(), {...}); ... }  ← Composition
```

#### Registering Systems

Systems are decoupled units of behavior. Systems **must not** store mutable gameplay state as instance properties, as this violates snapshot rewindability and breaks rollback netcode.

Systems are added via `world.addSystem(instance, { phase, priority, group })`. The `phase` controls runtime ordering while `priority` sorts execution within the phase.

```typescript
// Example inside AsteroidsGame.onRegisterSystems()
this.world.addSystem(new AsteroidInputSystem(this.config), {
  phase: SystemPhase.Simulation,
});
this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
this.world.addSystem(new AsteroidCollisionSystem(), {
  phase: SystemPhase.GameRules,
});
```

#### Shared Category Base Classes

For shared mechanics within specific genres (e.g., platformers), an intermediate helper class like `PlatformerArcadeGame` can extend `BaseGame` to share common setup code (`registerCommonPlatformerSystems`). Child games call `await super.onRegisterSystems()` before registering unique systems. This keeps inheritance strictly scoped to setup utilities rather than deep gameplay behavior.

---

## 4. Testing & Extension Guidelines

### Adding a New Game to the Monorepo

To create a new game without breaking core invariants, follow this process:

1. **Extend BaseGame:** Define explicit type boundaries.
   Create `MyGame extends BaseGame<TState, TBlueprints, TComponents, TEvents, TInput>` (or extend `PlatformerArcadeGame` if building a platformer).

2. **Implement System Setup:** Override `onRegisterSystems()`.
   Set shared configuration, register entity blueprints via `this.blueprints.register(...)`, and attach systems via `world.addSystem(...)`.

3. **Reuse Generic Core Systems:** Leverage pre-built primitives first.
   Incorporate existing core systems (`MovementSystem`, `CollisionSystem2D`, `TTLSystem`, `ComboSystem`, `JuiceSystem`) before writing game-specific systems from scratch.

4. **Write Custom Systems Correctly:** Maintain pure functional behavior.
   Ensure new custom systems extend `System<TComponents, TEvents>` and only mutate component data inside `update(world, deltaTime)`. Do not write state to system fields.

5. **Assign Proper Execution Phases:** Respect execution boundaries.
   Map systems to their corresponding execution order:

- `Input`: Controller/input ingestion
- `Simulation`: Physics calculations and movement
- `Transform`: Spatial hierarchy updates
- `Collision`: Detection and contact resolution
- `GameRules`: High-level logic and game-over evaluation
- `Presentation`: Particle effects and rendering instructions

---

## 5. Security Considerations

- **Headless Server Simulation**: Client instances must not be trusted. All state updates, collisions, damage, and scoring are validated on the headless Colyseus server (`/server`).
- **Inputs & Desynchronization**: The client sends compressed inputs (`CompactInputFrame`) rather than authoritative entity positions. The server applies inputs to its isolated simulation state to prevent client-side manipulation.
- **Pure State Separation**: Code inside `/server` is strictly isolated from platform UI packages (`@tiny-aster/react-native`, `@tiny-aster/renderer-skia`). Importing UI dependencies into the server runtime is forbidden by linter rules.
