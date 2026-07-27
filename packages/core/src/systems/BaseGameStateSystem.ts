import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";

/** @public */
export abstract class BaseGameStateSystem<
  TGameState = unknown,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {
  protected _world?: World<TComponents, TEvents>;

  constructor(protected singletonType: string) {
    super();
  }

  public onRegister(world: World<TComponents, TEvents>): void {
    this._world = world;
  }

  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    const gameState = this.getGameState(world);
    if (!gameState) return;

    const gameStateObj = gameState as Record<string, unknown>;
    if (gameStateObj.isGameOver) return;

    this.updateGameState(world, gameState, deltaTime);

    if (this.evaluateGameOverCondition(gameState)) {
      gameStateObj.isGameOver = true;
      const eventBus = world.getEventBus() as unknown as { emit: (event: string, payload: unknown) => void };
      eventBus.emit("game:over", { state: gameState });
    }
  }

  protected abstract getGameState(world: World<TComponents, TEvents>): TGameState | undefined;
  protected abstract updateGameState(world: World<TComponents, TEvents>, gameState: TGameState, deltaTime: number): void;
  protected abstract evaluateGameOverCondition(gameState: TGameState): boolean;

  public abstract resetGameOverState(world?: World<TComponents, TEvents>): void;
}
