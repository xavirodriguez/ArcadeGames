import { System, World, WorldUtils, EntityBuilder, ShapeType, BoxShape } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";

export class ArkanoidInputSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
    const paddleEntities = world.query("Paddle", "Transform", "Velocity");
    const ballEntities = world.query("Ball", "Transform", "Velocity");

    let leftInput = false;
    let rightInput = false;
    let launchInput = false;

    // Check InputSystem resource if available
    const inputSys = world.getResource<any>("InputSystem") || world.getResource<any>("UnifiedInput");
    if (inputSys) {
      if (typeof inputSys.getAction === "function") {
        leftInput = !!inputSys.getAction("p1Left");
        rightInput = !!inputSys.getAction("p1Right");
        launchInput = !!inputSys.getAction("p1Launch");
      } else if (typeof inputSys.isActionActive === "function") {
        leftInput = !!inputSys.isActionActive("p1Left");
        rightInput = !!inputSys.isActionActive("p1Right");
        launchInput = !!inputSys.isActionActive("p1Launch");
      }
    }

    const paddleEntity = paddleEntities[0];
    if (paddleEntity !== undefined && WorldUtils.isEntityActive(world, paddleEntity)) {
      const transform = world.getComponent(paddleEntity, "Transform")!;
      const velocity = world.getComponent(paddleEntity, "Velocity")!;
      const paddleComp = world.getComponent(paddleEntity, "Paddle")!;

      const directTouchX = world.getResource<number>("ArkanoidDirectTouchX");
      let directX: number | undefined = directTouchX;
      if (directX === undefined && inputSys) {
        if (typeof inputSys.targetX === "number") {
          directX = inputSys.targetX;
        } else if (typeof inputSys.directX === "number") {
          directX = inputSys.directX;
        }
      }

      const paddleW = paddleComp.isExpanded ? config.PADDLE_WIDTH * 1.5 : config.PADDLE_WIDTH;

      let currentVx = velocity.vx;
      if (directX !== undefined) {
        const minX = paddleW / 2;
        const maxX = config.SCREEN_WIDTH - paddleW / 2;
        const clampedX = Math.max(minX, Math.min(maxX, directX));

        if (deltaTime > 0) {
          currentVx = (clampedX - transform.x) / deltaTime;
        } else {
          currentVx = 0;
        }
      } else {
        let targetVx = 0;
        if (leftInput) targetVx -= config.PLAYER_SPEED;
        if (rightInput) targetVx += config.PLAYER_SPEED;

        if (targetVx !== 0) {
          const accel = config.PLAYER_ACCEL;
          if (targetVx > currentVx) {
            currentVx = Math.min(targetVx, currentVx + accel * deltaTime);
          } else {
            currentVx = Math.max(targetVx, currentVx - accel * deltaTime);
          }
        } else {
          const decel = config.PLAYER_DECEL;
          if (currentVx > 0) {
            currentVx = Math.max(0, currentVx - decel * deltaTime);
          } else if (currentVx < 0) {
            currentVx = Math.min(0, currentVx + decel * deltaTime);
          }
        }
      }

      const nextLaserCooldown = Math.max(0, (paddleComp.laserCooldown ?? 0) - deltaTime);

      world.mutateComponent(paddleEntity, "Velocity", (v) => {
        v.vx = currentVx;
      });

      world.mutateComponent(paddleEntity, "Paddle", (p) => {
        p.previousX = transform.x;
        p.lastVelocityX = currentVx;
        p.laserCooldown = nextLaserCooldown;
      });

      // Handle Laser Firing
      if (paddleComp.isLaserActive && launchInput && nextLaserCooldown <= 0) {
        world.mutateComponent(paddleEntity, "Paddle", (p) => {
          p.laserCooldown = 0.3;
        });

        const paddleW = paddleComp.isExpanded ? config.PADDLE_WIDTH * 1.5 : config.PADDLE_WIDTH;
        const leftTipX = transform.x - paddleW * 0.4;
        const rightTipX = transform.x + paddleW * 0.4;
        const laserY = transform.y - config.PADDLE_HEIGHT / 2 - 4;

        for (const laserX of [leftTipX, rightTipX]) {
          const laserEntity = EntityBuilder.createDeferred(world)
            .withTransform({ x: laserX, y: laserY, dirty: true })
            .withVelocity({ vx: 0, vy: -500 })
            .withRender({ shape: "box", size: 8, color: "#FF0055", order: 3 })
            .withCollider({
              shape: { type: ShapeType.Box, width: 4, height: 12 } as BoxShape,
              layer: 4,
              mask: 2
            })
            .withCollisionEvents()
            .build();

          world.getCommandBuffer().addComponent(laserEntity, {
            type: "LaserProjectile",
            speed: 500,
            damage: 1
          });
          world.getCommandBuffer().addComponent(laserEntity, {
            type: "Tag",
            tags: ["LaserProjectile"]
          });
          world.getCommandBuffer().addComponent(laserEntity, {
            type: "TTL",
            timeLeft: 2.0,
            remaining: 2.0
          });
        }

        const eventBus = world.getEventBus();
        if (eventBus && !world.isReSimulating) {
          eventBus.emitDeferred("PlaySFX", { name: "launch" });
        }
      }

      // Position attached ball above paddle
      for (const ballEntity of ballEntities) {
        const ball = world.getComponent(ballEntity, "Ball");
        if (ball && ball.isAttached) {
          const offsetX = ball.attachedOffsetX ?? 0;
          world.mutateComponent(ballEntity, "Transform", (t) => {
            t.x = transform.x + offsetX;
            t.y = transform.y - config.PADDLE_HEIGHT / 2 - config.BALL_SIZE;
            t.dirty = true;
          });
          world.mutateComponent(ballEntity, "Velocity", (v) => {
            v.vx = 0;
            v.vy = 0;
          });

          if (launchInput) {
            world.mutateComponent(ballEntity, "Ball", (b) => {
              b.isAttached = false;
            });
            const pHalfW = (paddleComp.isExpanded ? config.PADDLE_WIDTH * 1.5 : config.PADDLE_WIDTH) / 2;
            const normOffset = Math.max(-0.9, Math.min(0.9, offsetX / pHalfW));
            const angleOffset = normOffset * (Math.PI / 3) + currentVx * 0.001;
            const baseAngle = -Math.PI / 2 + angleOffset;
            const speed = ball.speed || config.BALL_SPEED_START;

            world.mutateComponent(ballEntity, "Velocity", (v) => {
              v.vx = Math.cos(baseAngle) * speed;
              v.vy = Math.sin(baseAngle) * speed;
            });
            const eventBus = world.getEventBus();
            if (eventBus && !world.isReSimulating) {
              eventBus.emitDeferred("PlaySFX", { name: "launch" });
            }
          }
        }
      }
    }
  }
}
