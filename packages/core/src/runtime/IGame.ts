import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";
import { IInputSystem } from "../input/InputSystem";
import { GameLoop } from "../loop/GameLoop";
import { Simulation } from "./Simulation";

/**
 * Interface representing game lifecycle hooks.
 * Can be used to mock or verify hooks in testing environments by casting the game instance.
 * @public
 */
export interface IGameLifecycleHooks {
  /**
   * Hook called during game initialization (`init()`).
   * Used to register systems on the ECS World.
   */
  onRegisterSystems(): Promise<void>;

  /**
   * Hook called during game initialization (`init()`) after systems registration.
   * Used to populate the world with initial entities and load active scenes.
   */
  onInitializeEntities(): Promise<void>;

  /**
   * Hook called at the beginning of `restart()` before existing systems and events are destroyed.
   * Used for teardown, saving scores/high-level session state, or metrics collection.
   */
  onBeforeRestart(): Promise<void>;
}

/**
 * Interface representing a runnable game.
 * @public
 */
export interface IGame<
  TState = unknown,
  TInput extends Record<string, any> = Record<string, any>
> extends Simulation {
  getWorld(): World<any, any, any>;
  getEventBus(): EventBus<any>;
  getGameLoop(): GameLoop;
  getGameState(): TState;
  isGameOver(): boolean;
  getSeed(): number;
  init(): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  restart(seed?: number): Promise<void>;
  subscribe(callback: (state: TState) => void): () => void;
  isPausedState(): boolean;
  getInputSystem(): IInputSystem<TInput>;
  setInputState(input: Partial<TInput>): void;
  enterGameplayFreeze(duration?: number): void;
  exitGameplayFreeze(): void;
  isGameplayFrozen(): boolean;
  getGameplayFreezeRemaining(): number | undefined;
}
