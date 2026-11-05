import {
  World,
  System,
  VelocityComponent,
  Juice,
  createEmitter,
  TTLComponent
} from "@tiny-aster/core";
import { PongConfig } from "../types/PongConfigSchema";
import { type BallComponent, type PongComponentRegistry } from "../types";
import { JuiceOrchestrator } from "../../shared/rendering/JuiceOrchestrator";

export class PongCollisionSystem extends System<PongComponentRegistry> {
  private config: PongConfig;
  // Safe for determinism/rollback. Reusable Set avoids per-tick heap allocations during collision checks.
  private processedPairs = new Set<string>();
  private juice?: JuiceOrchestrator<PongComponentRegistry>;

  constructor(config: PongConfig) {
    super();
    this.config = config;
  }

  public override update(world: World<PongComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const entities = world.query("CollisionEvents");
    this.processedPairs.clear();

    for (const entityA of entities) {
      const colComp = world.getComponent(entityA, "CollisionEvents");
      if (!colComp) continue;

      for (const col of colComp.collisions) {
        const entityB = col.otherEntity;
        const pairId = entityA < entityB ? `${entityA},${entityB}` : `${entityB},${entityA}`;
        if (this.processedPairs.has(pairId)) continue;
        this.processedPairs.add(pairId);

        const isBallA = world.hasComponent(entityA, "Ball");
        const isBallB = world.hasComponent(entityB, "Ball");

        if (isBallA || isBallB) {
          const ballEntity = isBallA ? entityA : entityB;
          const otherEntity = isBallA ? entityB : entityA;

          const isPaddle = world.hasComponent(otherEntity, "Paddle");

          if (isPaddle) {
            const paddleComp = world.getComponent(otherEntity, "Paddle");
            const ballVel = world.getComponent(ballEntity, "Velocity");

            if (ballVel && paddleComp) {
              // Revert X velocity and scale up speed slightly
              const nextVx = -ballVel.vx * this.config.BALL_ACCELERATION;

              // Simple spin factor based on relative paddle motion
              const relativeVelocityY = ballVel.vy - paddleComp.lastVelocityY;
              const spin = relativeVelocityY * 0.05;

              world.mutateComponent(ballEntity, "Ball", (ballComp: BallComponent) => {
                ballComp.spinFactor = Math.max(-2, Math.min(2, ballComp.spinFactor + spin));
              });

              // Apply spin to Y velocity
              const nextVy = ballVel.vy + (spin * 100);

              world.mutateComponent(ballEntity, "Velocity", (vel: VelocityComponent) => {
                vel.vx = nextVx;
                vel.vy = nextVy;
              });

              // Increment Combo component on paddle hit
              const comboEntities = world.query("Combo");
              if (comboEntities.length > 0) {
                world.mutateComponent(comboEntities[0], "Combo", (c) => {
                  c.combo = (c.combo || 0) + 1;
                  c.multiplier = 1 + Math.floor(c.combo / 5);
                  c.timerRemaining = c.timerDuration || 2.0;
                });
              }

              // The catalog event owns the canonical GameplayFreeze request.
              // It is intentionally emitted during resimulation; JuiceOrchestrator
              // replays hit-stop and suppresses its own presentation output.
              const ballTransform = world.getComponent(ballEntity, "Transform");
              if (ballTransform) {
                this.juice ??= new JuiceOrchestrator<PongComponentRegistry>(world);
                this.juice.triggerEvent("pong", "paddle:hit", {
                  x: ballTransform.x,
                  y: ballTransform.y,
                  rotation: Math.atan2(nextVy, nextVx)
                });
              }

              // Inline feedback is presentation-only and must not be replayed.
              if (!world.isReSimulating) {
                Juice.shake(world, 4, 150);
                Juice.squash(world, ballEntity, 1.4, 0.7, 100);

                // Apply paddle visual recoil and elastic squash & stretch
                const recoilDir = paddleComp.side === "left" ? -12 : 12;
                Juice.add(world, otherEntity, {
                  property: "x",
                  target: recoilDir,
                  duration: 60,
                  easing: "easeOut"
                });
                Juice.add(world, otherEntity, {
                  property: "x",
                  target: 0,
                  duration: 180,
                  delay: 60,
                  easing: "elasticOut"
                });
                Juice.squash(world, otherEntity, 0.7, 1.3, 200);

                // Preserve the side-specific particle burst.
                if (ballTransform) {
                  const hitColor = paddleComp.side === "left" ? "#FF00FF" : "#00FFFF";
                  const hitAngle: [number, number] = paddleComp.side === "left" ? [-45, 45] : [135, 225];

                  const emitter = createEmitter(world, {
                    type: "hit",
                    x: ballTransform.x,
                    y: ballTransform.y,
                    rate: 0,
                    burst: true,
                    count: 16,
                    lifetime: [0.3, 0.5],
                    speed: [100, 220],
                    color: hitColor,
                    size: [2, 5],
                    angle: hitAngle
                  });
                  const ttlComp: TTLComponent = { type: "TTL", timeLeft: 0.5, remaining: 0.5 };
                  world.getCommandBuffer().addComponent(emitter, ttlComp);
                }

                // Play hit audio once, never during corrected/replayed frames.
                world.getEventBus().emitDeferred("PlaySFX", { name: "hit" });
              }
            }
          }
        }
      }
    }
  }
}
