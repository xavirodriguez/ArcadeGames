import { World } from "../ecs/World";
import { GameLoop } from "../loop/GameLoop";
import { EventBus, EventRegistry } from "../events/EventBus";
import { ComponentRegistry } from "../ecs/Component";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { CompactInputFrame } from "../input/InputFrame";
import { IGame } from "./IGame";
import { IInputSystem } from "../input/InputSystem";
import { NullInputSystem } from "../input/NullInputSystem";
import {
  enterGameplayFreeze,
  exitGameplayFreeze,
  isGameplayFrozen,
  getGameplayFreezeRemaining
} from "./GameplayFreezeMixin";

/**
 * Abstract Null Object base class providing trivial stubs for headless/mock minigame implementations.
 *
 * @remarks
 * Implements the Null Object pattern to provide default no-op behavior for minigame interfaces.
 *
 * @typeParam TState - Game state payload type.
 * @typeParam TInput - Input action dictionary type.
 * @typeParam TComponents - Component registry type.
 * @typeParam TEvents - Event registry type.
 *
 * @public
 */
export abstract class NullBaseGame<
  TState = unknown,
  TInput extends object = Record<string, unknown>,
  TComponents extends ComponentRegistry = import("../ecs/CoreComponents").CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> implements IGame<TState, TInput, TComponents, TEvents> {
  /**
   * Returns current tick index.
   * @remarks Null object pattern stub always returns `0`.
   */
  public get tick(): number { return 0; }

  /**
   * Returns current state.
   * @remarks Null object pattern stub delegates to `getGameState()`.
   */
  public get state(): TState { return this.getGameState(); }

  /**
   * Advances simulation frame.
   * @remarks Null object pattern stub performs no operation.
   */
  public step(_input: CompactInputFrame): void {}

  /**
   * Captures simulation snapshot.
   * @remarks Null object pattern stub returns default empty snapshot.
   */
  public snapshot(): WorldSnapshot {
    return {
      tick: 0,
      entities: [],
      componentData: {},
      stateVersion: 0,
      structureVersion: 0,
      seed: 0,
      nextEntityId: 0,
      freeEntities: []
    } as unknown as WorldSnapshot;
  }

  /**
   * Restores simulation state.
   * @remarks Null object pattern stub performs no operation.
   */
  public restore(_snapshot: WorldSnapshot): void {}

  /**
   * Computes state hash.
   * @remarks Null object pattern stub returns `"00000000"`.
   */
  public hash(): string { return "00000000"; }

  /** Internal stub World instance. */
  protected _world = new World<TComponents, TEvents>();
  /** Internal stub GameLoop instance. */
  protected _loop = new GameLoop();
  /** Internal stub EventBus instance. */
  protected _eventBus = new EventBus<TEvents>();
  /** Internal stub NullInputSystem instance. */
  protected _inputSystem = new NullInputSystem<TInput>();

  /**
   * Returns internal ECS world instance.
   * @remarks Null object pattern stub.
   */
  public getWorld(): World<TComponents, TEvents> { return this._world; }

  /**
   * Returns internal GameLoop instance.
   * @remarks Null object pattern stub.
   */
  public getGameLoop(): GameLoop { return this._loop; }

  /**
   * Returns internal EventBus instance.
   * @remarks Null object pattern stub.
   */
  public getEventBus(): EventBus<TEvents> { return this._eventBus; }

  /**
   * Checks paused state.
   * @remarks Null object pattern stub always returns `false`.
   */
  public isPausedState(): boolean { return false; }

  /**
   * Checks game over state.
   * @remarks Null object pattern stub always returns `false`.
   */
  public isGameOver(): boolean { return false; }

  /**
   * Pure state accessor implemented by subclasses.
   */
  public abstract getGameState(): TState;

  /**
   * Returns game seed.
   * @remarks Null object pattern stub always returns `0`.
   */
  public getSeed(): number { return 0; }

  /**
   * Initializes game resources.
   * @remarks Null object pattern stub resolves immediately.
   */
  public async init(): Promise<void> {}

  /**
   * Starts game loop.
   * @remarks Null object pattern stub performs no operation.
   */
  public start(): void {}

  /**
   * Stops game loop.
   * @remarks Null object pattern stub performs no operation.
   */
  public stop(): void {}

  /**
   * Pauses simulation.
   * @remarks Null object pattern stub performs no operation.
   */
  public pause(): void {}

  /**
   * Resumes simulation.
   * @remarks Null object pattern stub performs no operation.
   */
  public resume(): void {}

  /**
   * Restarts session.
   * @remarks Null object pattern stub resolves immediately.
   */
  public async restart(): Promise<void> {}

  /**
   * Destroys resources.
   * @remarks Null object pattern stub performs no operation.
   */
  public destroy(): void {}

  /**
   * Subscribes to state updates.
   * @remarks Null object pattern stub returns a no-op unsubscribe function.
   */
  public subscribe(_cb: (state: TState) => void): () => void {
    return () => {};
  }

  /**
   * Initializes renderer setup.
   * @remarks Null object pattern stub performs no operation.
   */
  public initializeRenderer(): void {}

  /**
   * Returns active input system.
   * @remarks Null object pattern stub returns `NullInputSystem`.
   */
  public getInputSystem(): IInputSystem<TInput> {
    return this._inputSystem;
  }

  /**
   * Sets input state.
   * @remarks Null object pattern stub performs no operation.
   */
  public setInputState(_input: Partial<TInput>): void {}

  /**
   * Triggers gameplay freeze effect on world.
   * @remarks Null object pattern stub applies freeze to internal World instance.
   */
  public enterGameplayFreeze(duration?: number): void {
    enterGameplayFreeze(this._world as unknown as World, duration);
  }

  /**
   * Clears active gameplay freeze effect on world.
   * @remarks Null object pattern stub clears freeze on internal World instance.
   */
  public exitGameplayFreeze(): void {
    exitGameplayFreeze(this._world as unknown as World);
  }

  /**
   * Checks if gameplay simulation is currently frozen.
   * @remarks Null object pattern stub queries freeze on internal World instance.
   */
  public isGameplayFrozen(): boolean {
    return isGameplayFrozen(this._world as unknown as World);
  }

  /**
   * Retrieves remaining gameplay freeze duration in ticks.
   * @remarks Null object pattern stub queries freeze remaining on internal World instance.
   */
  public getGameplayFreezeRemaining(): number | undefined {
    return getGameplayFreezeRemaining(this._world as unknown as World);
  }
}
