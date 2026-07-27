import { System, World, VelocityComponent } from "@tiny-aster/core";
import { BallComponent, PaddleComponent, PongComponentRegistry } from "../types";

export class PongSpinSystem extends System<PongComponentRegistry> {
  public update(world: World<PongComponentRegistry>, deltaTime: number): void {
    const balls = world.query("Ball" as any);

    balls.forEach(entity => {
      world.mutateComponent(entity, "Ball", (b: BallComponent) => {
        // Decay spin factor over time
        b.spinFactor *= (1 - b.spinDecay);

        // Apply visual rotation from spin
        world.mutateComponent(entity, "Velocity", (v: VelocityComponent) => {
          v.angularVelocity = b.spinFactor * 5;
        });
      });
    });

    // Track last velocities of paddles to calculate spin force on hit
    const paddles = world.query("Paddle" as any);
    paddles.forEach(entity => {
      world.mutateComponent(entity, "Paddle", (p: PaddleComponent) => {
        const vel = world.getComponent(entity, "Velocity") as VelocityComponent;
        if (vel) {
          p.lastVelocityY = vel.vy;
        }
      });
    });
  }
}
