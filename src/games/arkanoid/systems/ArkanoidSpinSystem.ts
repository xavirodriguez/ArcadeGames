import { System, World, WorldUtils } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";

export class ArkanoidSpinSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
    const ballEntities = world.query("Ball", "Velocity");

    for (let i = 0; i < ballEntities.length; i++) {
      const entity = ballEntities[i];
      if (!WorldUtils.isEntityActive(world, entity)) continue;

      const ball = world.getComponent(entity, "Ball");
      const velocity = world.getComponent(entity, "Velocity");
      if (!ball || !velocity || ball.isAttached) continue;

      if (ball.spinFactor !== 0) {
        const newSpin = ball.spinFactor > 0
          ? Math.max(0, ball.spinFactor - 2.0 * deltaTime)
          : Math.min(0, ball.spinFactor + 2.0 * deltaTime);

        world.mutateComponent(entity, "Ball", (b) => {
          b.spinFactor = newSpin;
        });
      }

      let vx = velocity.vx;
      let vy = velocity.vy;

      const currentSpeed = Math.sqrt(vx * vx + vy * vy);
      if (currentSpeed > 0) {
        const clampedSpeed = Math.min(Math.max(currentSpeed, config.BALL_SPEED_START), config.BALL_SPEED_MAX);

        const minVy = clampedSpeed * 0.25;
        if (Math.abs(vy) < minVy) {
          vy = vy < 0 ? -minVy : minVy;
          vx = (vx < 0 ? -1 : 1) * Math.sqrt(Math.max(0, clampedSpeed * clampedSpeed - vy * vy));
        }

        const normFactor = clampedSpeed / Math.sqrt(vx * vx + vy * vy);
        world.mutateComponent(entity, "Velocity", (v) => {
          v.vx = vx * normFactor;
          v.vy = vy * normFactor;
        });
      }
    }
  }
}
