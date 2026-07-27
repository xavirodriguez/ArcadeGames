import { World, BaseGameStateSystem, TransformComponent, VelocityComponent, EventBus } from "@tiny-aster/core";
import { type PongState, type PongComponentRegistry } from "../types";
import { PongConfig } from "../types/PongConfigSchema";

export class PongGameStateSystem extends BaseGameStateSystem<PongState, PongComponentRegistry> {
  private config: PongConfig;
  private _isGameOver = false;

  constructor(config: PongConfig) {
    super();
    this.config = config;
  }

  protected updateGameState(
    world: World<PongComponentRegistry>,
    gameState: PongState,
    deltaTime: number
  ): void {
    if (gameState.isGameOver) {
      this._isGameOver = true;
      return;
    }

    const balls = world.query("Ball" as any);
    balls.forEach(ball => {
      const transform = world.getComponent(ball, "Transform") as TransformComponent;

      if (transform) {
        let scored = false;
        let scorer: "p1" | "p2" | null = null;

        // Ball passed left edge -> Player 2 scores
        if (transform.x < 0) {
          gameState.scoreP2++;
          scorer = "p2";
          scored = true;
        }
        // Ball passed right edge -> Player 1 scores
        else if (transform.x > this.config.WIDTH) {
          gameState.scoreP1++;
          scorer = "p1";
          scored = true;
        }

        if (scored && scorer) {
          // Play score audio
          const eventBus = world.getEventBus();
          eventBus.emit("PlaySFX" as any, { name: "score" });

          // Check Win Condition
          if (
            gameState.scoreP1 >= this.config.MAX_SCORE ||
            gameState.scoreP2 >= this.config.MAX_SCORE
          ) {
            gameState.isGameOver = true;
            this._isGameOver = true;
            eventBus.emit("PlaySFX" as any, { name: "game_over" });
          } else {
            // Reset ball position and send it towards the player who scored
            world.mutateComponent(ball, "Transform", (t: TransformComponent) => {
              t.x = this.config.WIDTH / 2;
              t.y = this.config.HEIGHT / 2;
            });
            world.mutateComponent(ball, "Velocity", (v: VelocityComponent) => {
              v.vx = scorer === "p1" ? -this.config.BALL_SPEED_START : this.config.BALL_SPEED_START;
              v.vy = this.config.BALL_SPEED_START * (world.gameplayRandom.next() > 0.5 ? 1 : -1);
            });
          }
        }
      }
    });
  }

  protected getGameState(world: World<PongComponentRegistry>): PongState | undefined {
    return world.getSingleton("PongState" as any);
  }

  public isGameOver(): boolean {
    return this._isGameOver;
  }

  public resetGameOverState(world: World<PongComponentRegistry>): void {
    this._isGameOver = false;
    const state = this.getGameState(world);
    if (state) {
      state.scoreP1 = 0;
      state.scoreP2 = 0;
      state.isGameOver = false;
    }
  }
}
