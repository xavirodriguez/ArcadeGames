import { System, World, Juice, TouchInputState } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { createPlayerBullet } from "../EntityFactory";
import { PlayerBulletPool } from "../EntityPool";

export class ShmupInputSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const config = world.getResource<ShmupConfig>("GameConfig");
    const pool = world.getResource<PlayerBulletPool>("PlayerBulletPool");
    if (!config || !pool) return;

    const inputState = world.getSingleton("InputState") as { axes?: Record<string, number>; buttons?: Record<string, boolean> } | undefined;
    const touchState = world.getResource<TouchInputState>("TouchInputState");

    for (const entity of world.query("ShmupPlayer", "Input", "Transform", "Velocity")) {
      const input = world.getComponent(entity, "Input");
      const transform = world.getMutableComponent(entity, "Transform");
      const velocity = world.getMutableComponent(entity, "Velocity");
      const health = world.getMutableComponent(entity, "Health");

      if (!input || !transform || !velocity) continue;

      if (world.getSingleton("ShmupGameState")?.isGameOver === true) {
        velocity.vx = 0;
        velocity.vy = 0;
        continue;
      }

      if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
        health.invulnerableRemaining = Math.max(0, health.invulnerableRemaining - deltaTime);
      }

      let moveX = Math.max(-1, Math.min(1, inputState?.axes?.moveX ?? input.axes.moveX ?? 0));
      let moveY = Math.max(-1, Math.min(1, inputState?.axes?.moveY ?? input.axes.moveY ?? 0));
      if (touchState && (touchState.moveX !== 0 || touchState.moveY !== 0)) {
        moveX = touchState.moveX;
        moveY = touchState.moveY;
      }

      const inputMagnitude = Math.hypot(moveX, moveY);
      if (inputMagnitude > 1) {
        moveX /= inputMagnitude;
        moveY /= inputMagnitude;
      }

      let shooting = Boolean(inputState?.buttons?.shoot) || input.actions.includes("shoot");
      if (touchState && (touchState.getButton("shoot") || touchState.getButton("fire"))) {
        shooting = true;
      }

      velocity.vx = moveX * config.PLAYER_SPEED;
      velocity.vy = moveY * config.PLAYER_SPEED;

      const minX = config.PLAYER_SIZE;
      const maxX = config.WORLD_WIDTH - config.PLAYER_SIZE;
      const minY = config.PLAYER_SIZE;
      const maxY = config.WORLD_HEIGHT - config.PLAYER_SIZE;

      if (transform.x < minX) {
        transform.x = minX;
        if (velocity.vx < 0) velocity.vx = 0;
      } else if (transform.x > maxX) {
        transform.x = maxX;
        if (velocity.vx > 0) velocity.vx = 0;
      }

      if (transform.y < minY) {
        transform.y = minY;
        if (velocity.vy < 0) velocity.vy = 0;
      } else if (transform.y > maxY) {
        transform.y = maxY;
        if (velocity.vy > 0) velocity.vy = 0;
      }

      const fire = (): void => {
        createPlayerBullet(world, transform.x, transform.y - config.PLAYER_SIZE, pool);
        Juice.playShootJuice(world, entity, {
          muzzleFrames: config.MUZZLE_FLASH_FRAMES,
          recoilPx: config.RETROCOIL_PX,
          shakeIntensity: 1.2,
          shakeDuration: 45
        });
        world.getEventBus()?.emitDeferred("PlaySFX", { name: "shoot", cooldownMs: 70 });
      };

      const interval = config.PLAYER_SHOOT_COOLDOWN / 1000;
      let cooldown = input.shootCooldownRemaining;
      if (shooting) {
        if (cooldown <= 0) {
          fire();
          cooldown = interval;
        }

        // Preserve overshoot so cadence does not drift when deltaTime does not divide the interval.
        cooldown -= deltaTime;
        if (interval > 0) {
          while (cooldown <= 0) {
            fire();
            cooldown += interval;
          }
        } else {
          // A zero interval means at most one shot per simulation update.
          cooldown = 0;
        }
      } else {
        cooldown = Math.max(0, cooldown - deltaTime);
      }

      world.mutateComponent(entity, "Input", i => {
        i.shootCooldownRemaining = cooldown;
        i.axes.moveX = moveX;
        i.axes.moveY = moveY;
      });
    }
  }
}
