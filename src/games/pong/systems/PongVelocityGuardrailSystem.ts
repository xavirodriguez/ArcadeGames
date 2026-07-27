import { World, System, VelocityComponent } from "@tiny-aster/core";
import { PongConfig } from "../types/PongConfigSchema";
import { type PongComponentRegistry } from "../types";

export class PongVelocityGuardrailSystem extends System<PongComponentRegistry> {
  public update(world: World<PongComponentRegistry>, deltaTime: number): void {
    const config = world.getResource<PongConfig>("GameConfig")!;
    const balls = world.query("Ball" as any);

    balls.forEach(entity => {
      world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
        // Guardrail: Ensure minimum horizontal ball speed to prevent vertical traps
        const minSpeedX = config.BALL_SPEED_START * 0.5;
        if (Math.abs(vel.vx) < minSpeedX) {
          vel.vx = vel.vx >= 0 ? minSpeedX : -minSpeedX;
        }

        // Clamp maximum velocities
        const maxSpeedX = config.BALL_SPEED_MAX;
        const maxSpeedY = config.BALL_SPEED_MAX;

        if (Math.abs(vel.vx) > maxSpeedX) {
          vel.vx = vel.vx >= 0 ? maxSpeedX : -maxSpeedX;
        }
        if (Math.abs(vel.vy) > maxSpeedY) {
          vel.vy = vel.vy >= 0 ? maxSpeedY : -maxSpeedY;
        }
      });
    });
  }
}
