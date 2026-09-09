import { System, World, WorldUtils } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";

export class BrickRulesSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const bricks = world.query("Brick", "Transform");
    const balls = world.query("Ball", "Transform", "Velocity");

    for (let i = 0; i < bricks.length; i++) {
      const brickEntity = bricks[i];
      if (!WorldUtils.isEntityActive(world, brickEntity)) continue;

      const brick = world.getComponent(brickEntity, "Brick");
      const brickPos = world.getComponent(brickEntity, "Transform");
      if (!brick || !brickPos) continue;

      if (brick.kind === "regenerable" && brick.hp < brick.maxHp) {
        let newTimer = brick.regenTimer + deltaTime;
        if (newTimer >= brick.regenDuration) {
          world.mutateComponent(brickEntity, "Brick", (b) => {
            b.hp = b.maxHp;
            b.regenTimer = 0;
          });
          world.mutateComponent(brickEntity, "Health", (h) => {
            h.current = h.max;
          });
        } else {
          world.mutateComponent(brickEntity, "Brick", (b) => {
            b.regenTimer = newTimer;
          });
        }
      }

      if (brick.kind === "gravitational") {
        for (let j = 0; j < balls.length; j++) {
          const ballEntity = balls[j];
          if (!WorldUtils.isEntityActive(world, ballEntity)) continue;

          const ball = world.getComponent(ballEntity, "Ball");
          const ballPos = world.getComponent(ballEntity, "Transform");
          const ballVel = world.getComponent(ballEntity, "Velocity");
          if (!ball || ball.isAttached || !ballPos || !ballVel) continue;

          const dx = brickPos.x - ballPos.x;
          const dy = brickPos.y - ballPos.y;
          const distSq = dx * dx + dy * dy;
          const pullRadius = 160;

          if (distSq > 0 && distSq < pullRadius * pullRadius) {
            const dist = Math.sqrt(distSq);
            const pullForce = (1.0 - dist / pullRadius) * 120.0 * deltaTime;
            const pullVx = (dx / dist) * pullForce;
            const pullVy = (dy / dist) * pullForce;

            world.mutateComponent(ballEntity, "Velocity", (v) => {
              v.vx += pullVx;
              v.vy += pullVy;
            });
          }
        }
      }
    }
  }
}
