import { World, PhysicsUtils, Juice, CoreComponentRegistry } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { PlayerBulletPool } from "../EntityPool";
import { createPlayerBullet } from "../EntityFactory";

export class ShmupInputSystem {
  constructor(private readonly pool: PlayerBulletPool) {}
  update(world: World<ShmupComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const config = world.getResource<ShmupConfig>("GameConfig")!;
    const inputState = world.getSingleton("InputState") as { axes?: Record<string, number>; buttons?: Record<string, boolean> } | undefined;
    for (const entity of world.query("ShmupPlayer", "Input", "Transform", "Velocity")) {
      const input = world.getComponent(entity, "Input");
      const transform = world.getComponent(entity, "Transform");
      if (!input || !transform) continue;
      const moveX = inputState?.axes?.moveX ?? input.axes.moveX ?? 0;
      const moveY = inputState?.axes?.moveY ?? input.axes.moveY ?? 0;
      const shooting = inputState?.buttons?.shoot ?? input.actions.has("shoot");
      const velocity = world.getMutableComponent(entity, "Velocity");
      if (velocity) {
        velocity.vx = moveX * config.PLAYER_SPEED;
        velocity.vy = moveY * config.PLAYER_SPEED;
      }
      let cooldown = PhysicsUtils.tickTimer(input.shootCooldownRemaining, deltaTime);
      if (shooting && cooldown <= 0) {
        createPlayerBullet(world, transform.x, transform.y - config.PLAYER_SIZE, this.pool);
        cooldown = config.PLAYER_SHOOT_COOLDOWN / 1000;
        world.mutateComponent(entity, "Render", r => { r.muzzleFlashFrames = config.MUZZLE_FLASH_FRAMES; });
        Juice.add(world, entity, { property: "y", target: config.RETROCOIL_PX, duration: 60, easing: "easeOut" });
        Juice.add(world, entity, { property: "y", target: 0, duration: 160, delay: 60, easing: "elasticOut" });
        Juice.squash(world, entity, 0.9, 1.15, 90);
        Juice.shake(world as World<CoreComponentRegistry>, 1.2, 45);
        world.getEventBus()?.emitDeferred("PlaySFX", { name: "shoot", cooldownMs: 70 });
      }
      world.mutateComponent(entity, "Input", i => { i.shootCooldownRemaining = cooldown; i.axes.moveX = moveX; i.axes.moveY = moveY; });
    }
  }
}
