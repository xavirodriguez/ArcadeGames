import { World, BaseGameStateSystem, TransformComponent, VelocityComponent, EventBus, createEmitter } from "@tiny-aster/core";
import { type PongState, type PongComponentRegistry } from "../types";
import { PongConfig } from "../types/PongConfigSchema";

export class PongGameStateSystem extends BaseGameStateSystem<PongState, PongComponentRegistry> {
  private config: PongConfig;
  private _isGameOver = false;

  constructor(config: PongConfig) {
    super("PongState");
    this.config = config;
  }

  protected evaluateGameOverCondition(gameState: PongState): boolean {
    return gameState.isGameOver;
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

    world.mutateSingleton("PongState" as any, (gs: any) => {
      // Decrement shield_pulse remaining timer if active
      if (gs.shieldPulseRemaining !== undefined && gs.shieldPulseRemaining > 0) {
        gs.shieldPulseRemaining = Math.max(0, gs.shieldPulseRemaining - deltaTime);
      }

      // Handle 1.2s Score Transition Freeze
      if (gs.scoreFreezeRemaining !== undefined && gs.scoreFreezeRemaining > 0) {
        gs.scoreFreezeRemaining = Math.max(0, gs.scoreFreezeRemaining - deltaTime);

        // Lock ball movement during freeze
        const balls = world.query("Ball" as any);
        balls.forEach(ball => {
          world.mutateComponent(ball, "Velocity", (v: VelocityComponent) => {
            v.vx = 0;
            v.vy = 0;
          });
        });

        // Freeze is over, launch the ball towards the player who was scored against (so, scorer launches)
        if (gs.scoreFreezeRemaining <= 0) {
          const scorer = gs.lastScorer;
          balls.forEach(ball => {
            world.mutateComponent(ball, "Transform", (t: TransformComponent) => {
              t.x = this.config.WIDTH / 2;
              t.y = this.config.HEIGHT / 2;
            });
            world.mutateComponent(ball, "Velocity", (v: VelocityComponent) => {
              v.vx = scorer === "p1" ? -this.config.BALL_SPEED_START : this.config.BALL_SPEED_START;
              v.vy = this.config.BALL_SPEED_START * (world.gameplayRandom.next() > 0.5 ? 1 : -1);
            });
            world.mutateComponent(ball, "Ball" as any, (b: any) => {
              b.spinFactor = 0;
            });
          });
          gs.lastScorer = null;
        }
        return;
      }

      const balls = world.query("Ball" as any);
      balls.forEach(ball => {
        const transform = world.getComponent(ball, "Transform") as TransformComponent;

        if (transform) {
          let scored = false;
          let scorer: "p1" | "p2" | null = null;

          // Ball passed left edge -> Check if shield pulse is active
          if (transform.x < 0) {
            if (gs.shieldPulseRemaining !== undefined && gs.shieldPulseRemaining > 0) {
              // Bounce ball off shield pulse barrier!
              world.mutateComponent(ball, "Velocity", (v: VelocityComponent) => {
                v.vx = this.config.BALL_SPEED_START * 1.1; // Bounces back
                v.vy = this.config.BALL_SPEED_START * (world.gameplayRandom.next() > 0.5 ? 1 : -1);
              });
              world.mutateComponent(ball, "Transform", (t: TransformComponent) => {
                t.x = 20; // Safe position inside
              });

              // Trigger visual feedback (Screen shake, particles, and sfx)
              const eventBus = world.getEventBus();
              eventBus.emit("PlaySFX" as any, { name: "hit" });
              const shake = world.getSingleton("ScreenShake" as any) as any;
              if (shake) {
                world.mutateSingleton("ScreenShake" as any, (s: any) => {
                  s.remaining = 0.3;
                  s.intensity = 8;
                });
              }

              const emitter = createEmitter(world as any, {
                type: "shield_bounce",
                x: 0,
                y: transform.y,
                rate: 0,
                burst: true,
                count: 15,
                lifetime: [0.4, 0.4],
                speed: [100, 200],
                color: "#00FFFF",
                size: [2, 4]
              });
              world.getCommandBuffer().addComponent(emitter, { type: "TTL", remaining: 0.55 } as any);
            } else {
              let multiplier = 1;
              const comboEntities = world.query("Combo" as any);
              if (comboEntities.length > 0) {
                const comboComp = world.getComponent(comboEntities[0], "Combo" as any) as any;
                if (comboComp) {
                  multiplier = comboComp.multiplier || 1;
                }
              }
              gs.scoreP2 += multiplier;
              scorer = "p2";
              scored = true;
            }
          }
          // Ball passed right edge -> Player 1 scores
          else if (transform.x > this.config.WIDTH) {
            let multiplier = 1;
            const comboEntities = world.query("Combo" as any);
            if (comboEntities.length > 0) {
              const comboComp = world.getComponent(comboEntities[0], "Combo" as any) as any;
              if (comboComp) {
                multiplier = comboComp.multiplier || 1;
              }
            }
            gs.scoreP1 += multiplier;
            scorer = "p1";
            scored = true;
          }

          if (scored && scorer) {
            // Reset combo on score
            const comboEntities = world.query("Combo" as any);
            const comboEntity = comboEntities[0];
            if (comboEntity !== undefined) {
              world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
                c.combo = 0;
                c.multiplier = 1;
                c.timerRemaining = 0;
              });
            }

            // Trigger particle celebration explosion at the scoring border (30+ particles)
            const emitterX = scorer === "p1" ? this.config.WIDTH : 0;
            const celebrationColor = scorer === "p1" ? "#FF00FF" : "#00FFFF";
            const emitter = createEmitter(world as any, {
              type: "goal_celebration",
              x: emitterX,
              y: transform.y,
              rate: 0,
              burst: true,
              count: 35,
              lifetime: [0.6, 1.0],
              speed: [150, 250],
              color: celebrationColor,
              size: [3, 6],
              angle: scorer === "p1" ? [135, 225] : [-45, 45] // Explode inwards
            });
            world.getCommandBuffer().addComponent(emitter, { type: "TTL", remaining: 1.2 } as any);

            // Play score audio
            const eventBus = world.getEventBus();
            eventBus.emit("PlaySFX" as any, { name: "score" });

            // Check Win Condition
            if (
              gs.scoreP1 >= this.config.MAX_SCORE ||
              gs.scoreP2 >= this.config.MAX_SCORE
            ) {
              gs.isGameOver = true;
              this._isGameOver = true;
              eventBus.emit("PlaySFX" as any, { name: "game_over" });
            } else {
              // Trigger 1.2-second transition freeze state instead of instant reset
              gs.scoreFreezeRemaining = 1.2;
              gs.lastScorer = scorer;

              // Move ball to center during freeze
              world.mutateComponent(ball, "Transform", (t: TransformComponent) => {
                t.x = this.config.WIDTH / 2;
                t.y = this.config.HEIGHT / 2;
              });
              world.mutateComponent(ball, "Velocity", (v: VelocityComponent) => {
                v.vx = 0;
                v.vy = 0;
              });
            }
          }
        }
      });

    });
  }

  protected getGameState(world: World<PongComponentRegistry>): PongState | undefined {
    return world.getSingleton("PongState" as any) as PongState | undefined;
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
