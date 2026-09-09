import { System, World, WorldUtils } from "@tiny-aster/core";
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

      let targetVx = 0;
      if (leftInput) targetVx -= config.PLAYER_SPEED;
      if (rightInput) targetVx += config.PLAYER_SPEED;

      let currentVx = velocity.vx;
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

      world.mutateComponent(paddleEntity, "Velocity", (v) => {
        v.vx = currentVx;
      });

      world.mutateComponent(paddleEntity, "Paddle", (p) => {
        p.previousX = transform.x;
        p.lastVelocityX = currentVx;
      });

      // Position attached ball above paddle
      for (const ballEntity of ballEntities) {
        const ball = world.getComponent(ballEntity, "Ball");
        if (ball && ball.isAttached) {
          world.mutateComponent(ballEntity, "Transform", (t) => {
            t.x = transform.x;
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
            const angleOffset = currentVx * 0.001;
            const baseAngle = -Math.PI / 2 + angleOffset;
            const speed = config.BALL_SPEED_START;

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
