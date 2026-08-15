import { World } from "./World";
import { ComponentRegistry } from "./Component";
import { EventRegistry } from "../events/EventBus";

/**
 * Resource shape for gameplay freeze / soft pause.
 * @public
 */
export interface GameplayFreeze {
  /** Optional countdown duration in seconds. */
  remaining?: number;
}

/**
 * Execution phases for systems within the World update loop.
 * @public
 */
export enum SystemPhase {
  /** Input processing and gathering. */
  Input = "Input",
  /** Core game logic and simulation. */
  Simulation = "Simulation",
  /** Coordinate transformations and hierarchy updates. */
  Transform = "Transform",
  /** Collision detection and resolution. */
  Collision = "Collision",
  /** Higher-level game rules and state transitions. */
  GameRules = "GameRules",
  /** Preparation for rendering and visual feedback. */
  Presentation = "Presentation"
}

/**
 * Configuration options for system registration within a {@link Schedule}.
 * @public
 */
export interface SystemConfig {
  /**
   * Execution phase in which this system should run.
   * Defaults to `SystemPhase.Simulation`.
   */
  phase?: SystemPhase | string;
  /**
   * Priority within the assigned phase.
   * Systems with higher numerical priority values execute first.
   */
  priority?: number;
  /**
   * Optional group tag used for phase-based or context-based system filtering
   * (e.g., active group subsets during transitions or wave states).
   */
  group?: string;
}

/**
 * Base abstract class for all ECS simulation systems.
 *
 * @remarks
 * Systems encapsulate behavior and logic, operating directly on entities and components
 * matched by queries within the {@link World}. They are organized and executed sequentially
 * by a {@link Schedule} ordered by phase and priority.
 *
 * **Statelessness Invariant**: Core simulation state must reside exclusively within components
 * in the `World`. Systems should remain stateless or only maintain transient, recomputable
 * helper state (such as query caches or scratch buffers). Storing mutable gameplay state
 * directly on system properties breaks snapshot capture, state serialization, and rollback netcode.
 *
 * @public
 */
export abstract class System<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  /**
   * Executes the system's logic for a single tick step.
   *
   * @param world - The active `World` instance containing entities and components.
   * @param deltaTime - Fixed time step in seconds (e.g., `1 / 60`).
   */
  public abstract update(world: World<TComponents, TEvents>, deltaTime: number): void;

  /**
   * Lifecycle hook invoked immediately when the system is added to a `Schedule` or registered with a `World`.
   *
   * @param world - The `World` instance the system is being attached to.
   */
  public onRegister(_world: World<TComponents, TEvents>): void {}

  /**
   * Lifecycle hook invoked when the system is being removed or when the containing `Schedule` is cleared.
   */
  public dispose(): void {}
}
