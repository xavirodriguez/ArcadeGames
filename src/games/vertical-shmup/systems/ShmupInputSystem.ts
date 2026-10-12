import { System, World, PhysicsUtils, Juice, TouchInputState } from "@tiny-aster/core";
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

      // Update invulnerability remaining duration
      if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
        health.invulnerableRemaining = Math.max(0, health.invulnerableRemaining - deltaTime);
      }

      let moveX = Math.max(-1, Math.min(1, inputState?.axes?.moveX ?? input.axes.moveX ?? 0));
      let moveY = Math.max(-1, Math.min(1, inputState?.axes?.moveY ?? input.axes.moveY ?? 0));
      if (touchState && (touchState.moveX !== 0 || touchState.moveY !== 0)) {
        moveX = touchState.moveX;
        moveY = touchState.moveY;
      }

      const hasAction = (actions: unknown): boolean => {
        if (actions instanceof Set) return actions.has("shoot");
        if (Array.isArray(actions)) return actions.includes("shoot");
        return false;
      };
      let shooting = inputState?.buttons?.shoot ?? hasAction(input.actions);
      if (touchState && (touchState.getButton("shoot") || touchState.getButton("fire"))) {
        shooting = true;
      }

      velocity.vx = moveX * config.PLAYER_SPEED;
      velocity.vy = moveY * config.PLAYER_SPEED;

      // Clamp player strictly inside world boundaries to prevent rubber-banding
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

      let cooldown = PhysicsUtils.tickTimer(input.shootCooldownRemaining, deltaTime);
      if (shooting && cooldown <= 0) {
        createPlayerBullet(world, transform.x, transform.y - config.PLAYER_SIZE, pool);
        cooldown = config.PLAYER_SHOOT_COOLDOWN / 1000;

        Juice.playShootJuice(world, entity, {
          muzzleFrames: config.MUZZLE_FLASH_FRAMES,
          recoilPx: config.RETROCOIL_PX,
          shakeIntensity: 1.2,
          shakeDuration: 45
        });
        world.getEventBus()?.emitDeferred("PlaySFX", { name: "shoot", cooldownMs: 70 });
      }

      world.mutateComponent(entity, "Input", i => {
        i.shootCooldownRemaining = cooldown;
        i.axes.moveX = moveX;
        i.axes.moveY = moveY;
      });
    }
  }
}
