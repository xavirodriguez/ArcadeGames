import {
  World,
  ComponentType,
  System,
  TransformComponent,
  VelocityComponent,
  Juice,
  createEmitter,
  EventBus
} from "@tiny-aster/core";
import { PongConfig } from "../types/PongConfigSchema";
import { type BallComponent, type PongComponentRegistry } from "../types";

export class PongCollisionSystem extends System<PongComponentRegistry> {
  private config: PongConfig;

  constructor(config: PongConfig) {
    super();
    this.config = config;
  }

  public override update(world: World<PongComponentRegistry>, deltaTime: number): void {
    const entities = world.query("CollisionEvents");
    const processedPairs = new Set<string>();

    for (const entityA of entities) {
      const colComp = world.getComponent(entityA, "CollisionEvents");
      if (!colComp) continue;

      for (const col of colComp.collisions) {
        const entityB = col.otherEntity;
        const pairId = entityA < entityB ? `${entityA},${entityB}` : `${entityB},${entityA}`;
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);

        const isBallA = world.hasComponent(entityA, "Ball" as any);
        const isBallB = world.hasComponent(entityB, "Ball" as any);

        if (isBallA || isBallB) {
          const ballEntity = isBallA ? entityA : entityB;
          const otherEntity = isBallA ? entityB : entityA;

          const isPaddle = world.hasComponent(otherEntity, "Paddle" as any);

          if (isPaddle) {
            const paddleComp = world.getComponent(otherEntity, "Paddle" as any) as any;
            const ballVel = world.getComponent(ballEntity, "Velocity") as VelocityComponent;

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

              // Apply physical hit-stop (60ms) to make paddle hit feel heavy and punchy
              world.setResource("GameplayFreeze", { remaining: 0.06 });

              // Juice/ScreenShake effect
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

              // Particle feedback on hit location with side-specific neon colors and inward-directed angles
              const ballTransform = world.getComponent(ballEntity, "Transform") as TransformComponent;
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
                world.getCommandBuffer().addComponent(emitter, { type: "TTL", ttl: 500, timeLeft: 0.5, remaining: 0.5 } as any);
              }

              // Play hit audio
              const eventBus = world.getEventBus();
              eventBus.emit("PlaySFX", { name: "hit" });
            }
          }
        }
      }
    }
  }
}
