# Building a Third-Party BaseGame

This guide explains how to build a custom third-party game on top of `@tiny-aster/core` by extending the `BaseGame` abstract class.

---

## Overview

`BaseGame` is the template-method base class in `@tiny-aster/core` that integrates:
- **`World`**: The primary ECS container managing entities, components, and system schedules.
- **`EventBus`**: Typed event emitter for simulation and narrative events.
- **`ArcadeKernel`**: State machine managing high-level flow transitions (`BOOT` -\> `LOADING` -\> `TITLE` -\> `MENU` -\> `PLAYING` ⇄ `PAUSED` -\> `GAME_OVER`).
- **`SceneManager`**: Scene transitions and narrative integration.
- **`IAudioPlayer`** & **`IInputSystem`**: Abstractions for cross-platform audio and user input.

---

## The Lifecycle Sequence

The lifecycle of a `BaseGame` follows a strict, deterministic template sequence:

```
UNINITIALIZED
     │
   init()
     ├─► onRegisterSystems()      (Register ECS systems in Schedule)
     ├─► onInitializeEntities()   (Spawn initial entities & load scenes)
     ▼
   READY
     │
   start()
     ▼
  RUNNING ◄───► PAUSED (pause() / resume())
     │
  destroy() / restart()
     ▼
  DESTROYED / UNINITIALIZED
```

### Lifecycle Methods and Template Hooks

1. **`onRegisterSystems()`** *(Protected Template Method)*
   - Invoked asynchronously during `init()`.
   - Use `this.world.addSystem(new MySystem(), { phase: SystemPhase.Simulation })` to populate execution phases (`PreUpdate`, `Input`, `Simulation`, `PostSimulation`, `Render`).

2. **`onInitializeEntities()`** *(Protected Template Method)*
   - Invoked asynchronously during `init()` after systems have been registered.
   - Use `this.world.createEntity()` or `this.blueprints.spawn(...)` to populate initial game entities, components, and resources.

3. **`init()`** *(Public Method)*
   - Orchestrates setup: executes `onRegisterSystems()` -\> `onInitializeEntities()`.
   - Handles timeout safety (`initTimeout` config, default 10s).
   - Transitions state to `GameLifecycleState.READY` and automatically triggers `start()`.

4. **`start()`, `pause()`, `resume()`**
   - Idempotent lifecycle controls that drive ticker updates and sync `ArcadeKernel` states between `PLAYING` and `PAUSED`.

5. **`restart(seed?)`**
   - Re-initializes the session from scratch. Calls `onBeforeRestart()`, tears down current systems and listeners via `destroy()`, instantiates a clean `World`, and re-runs `init()`.

6. **`destroy()`**
   - Clears system schedules, unbinds `EventBus` handlers, releases input systems, and transitions state to `DESTROYED`.

---

## Re-exported SDK Symbols

All necessary symbols for implementing a custom `BaseGame` are exported directly from `@tiny-aster/core`:

```ts
import {
  BaseGame,
  BaseGameConfig,
  GameLifecycleState,
  IGame,
  GameDefinition,
  ComponentRegistry,
  EventRegistry,
  World,
  Entity,
  Schedule,
  System,
  SystemPhase,
  EventBus,
  ArcadeKernel,
  ArcadeState
} from "@tiny-aster/core";
```

---

## Minimal Third-Party Game Example

```ts
import {
  BaseGame,
  BaseGameConfig,
  ComponentRegistry,
  EventRegistry,
  System,
  SystemPhase,
  ArcadeState
} from "@tiny-aster/core";

// 1. Declare Custom Component & Event Registries
export interface MyComponents extends ComponentRegistry {
  Position: { type: "Position"; x: number; y: number };
  Velocity: { type: "Velocity"; vx: number; vy: number };
}

export interface MyEvents extends EventRegistry {
  ScoreChanged: { points: number };
}

// 2. Define Custom ECS System
class MovementSystem extends System<MyComponents, MyEvents> {
  update(world: any, dt: number): void {
    const entities = world.query("Position", "Velocity");
    for (const entity of entities) {
      world.mutateComponent(entity, "Position", (pos: any) => {
        const vel = world.getComponent(entity, "Velocity");
        if (vel) {
          pos.x += vel.vx * dt;
          pos.y += vel.vy * dt;
        }
      });
    }
  }
}

// 3. Implement Third-Party Game Class
export class MyCustomGame extends BaseGame<
  { score: number },
  { shoot: boolean },
  MyComponents,
  MyEvents
> {
  private score = 0;

  constructor(config: BaseGameConfig<MyComponents, MyEvents> = {}) {
    super(config);
  }

  protected async onRegisterSystems(): Promise<void> {
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
  }

  protected async onInitializeEntities(): Promise<void> {
    const { entity, add } = this.createBaseEntity();
    add({ type: "Position", x: 100, y: 100 });
    add({ type: "Velocity", vx: 10, vy: 0 });

    this.kernel.transitionTo(ArcadeState.PLAYING);
  }

  public update(dt: number): void {
    if (this.isPausedState() || this.isGameplayFrozen()) return;
    this.world.update(dt);
  }

  public getGameState(): { score: number } {
    return { score: this.score };
  }

  public isGameOver(): boolean {
    return false;
  }
}
