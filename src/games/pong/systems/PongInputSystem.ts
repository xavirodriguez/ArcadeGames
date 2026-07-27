import { World, System, VelocityComponent } from "@tiny-aster/core";
import { type PongInput, type PongComponentRegistry } from "../types";
import { PongConfig, DEFAULT_PONG_CONFIG } from "../types/PongConfigSchema";
import { AIPongController } from "../input/AIPongController";
import { NetworkController } from "../input/NetworkController";

export class PongInputSystem extends System<PongComponentRegistry> {
  private aiController?: AIPongController;
  private networkController?: NetworkController;
  public currentTick = 0;

  constructor(aiDifficulty?: "easy" | "medium" | "hard", networkController?: NetworkController) {
    super();
    this.networkController = networkController;
    if (aiDifficulty) {
      this.aiController = new AIPongController(aiDifficulty);
    }
  }

  public update(world: World<PongComponentRegistry>, deltaTime: number): void {
    this.currentTick++;
    const config = world.getResource<PongConfig>("GameConfig") || DEFAULT_PONG_CONFIG;

    // 1. Process player inputs (Left paddle / P1)
    const p1Paddles = world.query("Paddle" as any).filter(e => {
      const p = world.getComponent(e, "Paddle" as any) as any;
      return p && p.side === "left";
    });

    const inputSystem = world.getInputSystem();
    const p1Up = inputSystem.isPressed("p1Up");
    const p1Down = inputSystem.isPressed("p1Down");

    p1Paddles.forEach(entity => {
      world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
        if (p1Up) vel.vy = -config.PADDLE_SPEED;
        else if (p1Down) vel.vy = config.PADDLE_SPEED;
        else vel.vy = 0;
      });
    });

    // 2. Process opponent inputs (Right paddle / P2)
    const p2Paddles = world.query("Paddle" as any).filter(e => {
      const p = world.getComponent(e, "Paddle" as any) as any;
      return p && p.side === "right";
    });

    p2Paddles.forEach(entity => {
      world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
        if (this.networkController) {
          // Multiplayer online mode
          const netInput = this.networkController.getInputForTick(this.currentTick);
          if (netInput) {
            if (netInput.p2Up) vel.vy = -config.PADDLE_SPEED;
            else if (netInput.p2Down) vel.vy = config.PADDLE_SPEED;
            else vel.vy = 0;
          }
        } else if (this.aiController) {
          // Single-player AI mode
          const aiInput = this.aiController.update(world, entity);
          if (aiInput.p2Up) vel.vy = -config.PADDLE_SPEED;
          else if (aiInput.p2Down) vel.vy = config.PADDLE_SPEED;
          else vel.vy = 0;
        } else {
          // Local multiplayer mode
          const p2Up = inputSystem.isPressed("p2Up");
          const p2Down = inputSystem.isPressed("p2Down");
          if (p2Up) vel.vy = -config.PADDLE_SPEED;
          else if (p2Down) vel.vy = config.PADDLE_SPEED;
          else vel.vy = 0;
        }
      });
    });
  }
}
