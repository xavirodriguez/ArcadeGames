import { World, System, InputSystem } from "@tiny-aster/core";
import { type PongComponentRegistry } from "../types";
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
    const inputSystem = world.getResource<InputSystem>("InputSystem");

    const paddles = world.query("Paddle" as any);
    const len = paddles.length;

    // Safe for determinism/rollback. Single pass indexed loop replaces array filter/forEach closures to eliminate per-tick array allocations.
    for (let i = 0; i < len; i++) {
      const entity = paddles[i];
      const p = world.getComponent(entity, "Paddle" as any) as any;
      if (!p) continue;

      let targetVy = 0;

      if (p.side === "left") {
        const p1Up = inputSystem ? inputSystem.getAction("p1Up") : false;
        const p1Down = inputSystem ? inputSystem.getAction("p1Down") : false;
        if (p1Up) targetVy = -config.PADDLE_SPEED;
        else if (p1Down) targetVy = config.PADDLE_SPEED;
      } else if (p.side === "right") {
        if (this.networkController) {
          const netInput = this.networkController.getInputForTick(this.currentTick);
          if (netInput) {
            if (netInput.p2Up) targetVy = -config.PADDLE_SPEED;
            else if (netInput.p2Down) targetVy = config.PADDLE_SPEED;
          }
        } else if (this.aiController) {
          const aiInput = this.aiController.update(world, entity);
          if (aiInput.p2Up) targetVy = -config.PADDLE_SPEED;
          else if (aiInput.p2Down) targetVy = config.PADDLE_SPEED;
        } else {
          const p2Up = inputSystem ? inputSystem.getAction("p2Up") : false;
          const p2Down = inputSystem ? inputSystem.getAction("p2Down") : false;
          if (p2Up) targetVy = -config.PADDLE_SPEED;
          else if (p2Down) targetVy = config.PADDLE_SPEED;
        }
      }

      // Safe for determinism/rollback. Direct getMutableComponent with value checking avoids callback closure allocation and stateVersion bumps when velocity hasn't changed.
      const vel = world.getComponent(entity, "Velocity" as any) as any;
      if (vel && vel.vy !== targetVy) {
        const mutVel = world.getMutableComponent(entity, "Velocity" as any) as any;
        if (mutVel) {
          mutVel.vy = targetVy;
        }
      }
    }
  }
}
