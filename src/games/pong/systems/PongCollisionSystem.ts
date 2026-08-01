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

              // Juice/ScreenShake effect
              Juice.shake(world, 4, 150);
              Juice.squash(world, ballEntity, 1.4, 0.7, 100);

              // Particle feedback on hit location
              const ballTransform = world.getComponent(ballEntity, "Transform") as TransformComponent;
              if (ballTransform) {
                const emitter = createEmitter(world, {
                  type: "hit",
                  x: ballTransform.x,
                  y: ballTransform.y,
                  rate: 0,
                  burst: true,
                  count: 10,
                  lifetime: [0.3, 0.3],
                  speed: [150, 150],
                  color: "white",
                  size: [3, 3]
                });
                world.getCommandBuffer().addComponent(emitter, { type: "TTL", remaining: 0.35 } as any);
              }

              // Play hit audio
              const eventBus = world.getEventBus();
              eventBus.emit("PlaySFX" as any, { name: "hit" });
            }
          }
        }
      }
    }
  }
}
