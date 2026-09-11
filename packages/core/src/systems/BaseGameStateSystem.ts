import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry, EventBus } from "../events/EventBus";

/**
 * Base class centralizing the "pause → read state → update → evaluate game over →
 * emit event" lifecycle shared by every game's top-level game-state system.
 *
 * @remarks
 * Subclasses implement the three abstract hooks (`getGameState`, `updateGameState`, `evaluateGameOverCondition`);
 * `update()` itself is not meant to be overridden — prefer overriding the hook methods instead.
 *
 * `TGameState` is expected to include an `isGameOver: boolean` field — this is not statically enforced
 * by the generic bound, but `update()` reads/writes it via an internal cast.
 *
 * @example
 * ```ts
 * class MyGameStateSystem extends BaseGameStateSystem<MyGameState, MyComponents, MyEvents> {
 *   constructor() {
 *     super("GameState");
 *   }
 *   protected getGameState(world: World<MyComponents, MyEvents>) { return world.getSingleton("GameState"); }
 *   protected updateGameState(world: World<MyComponents, MyEvents>, state: MyGameState, dt: number) { state.score += 1; }
 *   protected evaluateGameOverCondition(state: MyGameState) { return state.lives <= 0; }
 *   public resetGameOverState(world?: World<MyComponents, MyEvents>) { if (world) world.mutateSingleton("GameState", s => { s.isGameOver = false; }); }
 * }
 * ```
 *
 * @public
 */
export abstract class BaseGameStateSystem<
  TGameState = unknown,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {
  /** Reference to the active ECS world instance stored upon registration. */
  protected _world?: World<TComponents, TEvents>;

  /**
   * Constructs a BaseGameStateSystem.
   *
   * @param singletonType - Identifier of the game-state singleton this system manages (e.g. `"GameState"`).
   */
  constructor(protected singletonType: string) {
    super();
  }

  /**
   * Registers the system with the target ECS world and caches the world reference.
   *
   * @param world - The ECS world registering this system.
   * @returns Void.
   *
   * @example
   * ```ts
   * gameStateSystem.onRegister(world);
   * ```
   */
  public onRegister(world: World<TComponents, TEvents>): void {
    this._world = world;
  }

  /**
   * Executes the standard game state update step: checks pause state, retrieves game state,
   * updates state timer/logic, evaluates game-over condition, and emits `"game:over"` on trigger.
   *
   * @param world - The target ECS world.
   * @param deltaTime - Frame elapsed time in seconds (e.g., `0.016`).
   * @returns Void.
   *
   * @example
   * ```ts
   * gameStateSystem.update(world, 0.016);
   * ```
   */
  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const gameState = this.getGameState(world);
    if (!gameState) return;

    const gameStateObj = gameState as Record<string, unknown>;
    if (gameStateObj.isGameOver) return;

    this.updateGameState(world, gameState, deltaTime);

    if (this.evaluateGameOverCondition(gameState)) {
      gameStateObj.isGameOver = true;
      (world.getEventBus() as EventBus).emit("game:over", { state: gameState });
    }
  }

  /**
   * Retrieves the game state object from the world.
   *
   * @param world - The ECS world containing game state.
   * @returns The game state object or undefined if not found.
   */
  protected abstract getGameState(world: World<TComponents, TEvents>): TGameState | undefined;

  /**
   * Hook method called each tick when game state is active to advance game state timers and counters.
   *
   * @param world - The target ECS world.
   * @param gameState - The current active game state object.
   * @param deltaTime - Frame elapsed time in seconds.
   * @returns Void.
   */
  protected abstract updateGameState(world: World<TComponents, TEvents>, gameState: TGameState, deltaTime: number): void;

  /**
   * Hook method evaluating whether active game state satisfies game-over termination conditions.
   *
   * @param gameState - The active game state object.
   * @returns `true` if game over condition is met, `false` otherwise.
   */
  protected abstract evaluateGameOverCondition(gameState: TGameState): boolean;

  /**
   * Resets game-over state flag and associated session metrics.
   *
   * @param world - Optional target ECS world containing game state.
   * @returns Void.
   *
   * @example
   * ```ts
   * gameStateSystem.resetGameOverState(world);
   * ```
   */
  public abstract resetGameOverState(world?: World<TComponents, TEvents>): void;
}
