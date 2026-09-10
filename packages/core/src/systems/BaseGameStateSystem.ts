import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry, EventBus } from "../events/EventBus";

  
/**  
 * Base class centralizing the "pause → read state → update → evaluate game over →  
 * emit event" lifecycle shared by every game's top-level game-state system.  
 *  
 * @remarks  
 * Subclasses implement the three abstract hooks below; `update()` itself is not  
 * meant to be overridden — prefer overriding `getGameState`, `updateGameState`,  
 * and `evaluateGameOverCondition` instead. If a subclass overrides `update()`  
 * directly (e.g. to repeat the `IsPaused` check), that duplication should be  
 * called out explicitly in that subclass, since the base already guarantees it.  
 *  
 * `TGameState` is expected to include an `isGameOver: boolean` field — this is  
 * not statically enforced by the generic bound, but `update()` reads/writes it  
 * via an internal cast.  
 *  
 * @example  
 * ```ts  
 * class MyGameStateSystem extends BaseGameStateSystem<MyGameState, MyComponents, MyEvents> {  
 *   constructor() {  
 *     super("GameState");  
 *   }  
 *   protected getGameState(world) { return world.getSingleton("GameState"); }  
 *   protected updateGameState(world, state, dt) { ... }  
 *   protected evaluateGameOverCondition(state) { return state.lives <= 0; }  
 *   public resetGameOverState(world) { world.mutateSingleton("GameState", s => { s.isGameOver = false; }); }  
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
  protected _world?: World<TComponents, TEvents>;

  constructor(protected singletonType: string) {
    super();
  }

  /**  
   * @param singletonType - Identifier of the game-state singleton this system manages  
   * (e.g. `"GameState"`). Currently informational/for-subclass-use only; not read  
   * internally by this base class.  
   */  
  public onRegister(world: World<TComponents, TEvents>): void {
    this._world = world;
  }

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

  protected abstract getGameState(world: World<TComponents, TEvents>): TGameState | undefined;
  protected abstract updateGameState(world: World<TComponents, TEvents>, gameState: TGameState, deltaTime: number): void;
  protected abstract evaluateGameOverCondition(gameState: TGameState): boolean;

  public abstract resetGameOverState(world?: World<TComponents, TEvents>): void;
}
