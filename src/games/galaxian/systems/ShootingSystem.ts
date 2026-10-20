import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianInputComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { BulletPool } from "../EntityPool";

export class ShootingSystem extends System<GalaxianComponentRegistry> {
  private bulletPool: BulletPool;

  constructor(bulletPool: BulletPool) {
    super();
    this.bulletPool = bulletPool;
  }

  public update(world: World<GalaxianComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<GalaxianConfig>("GameConfig");
    const singleBullet = config?.SINGLE_BULLET_MODE ?? true;
    const cooldown = (config?.SHOOT_COOLDOWN_MS ?? 200) / 1000;

    const activePlayerBullets = world.query("PlayerBullet");
    if (singleBullet && activePlayerBullets.length > 0) return;

    const playerEntities = world.query("Player", "Transform", "Input");
    for (const entity of playerEntities) {
      const transform = world.getComponent(entity, "Transform");
      const input = world.getMutableComponent(entity, "Input") as GalaxianInputComponent | undefined;
      if (!transform || !input) continue;

      if (input.shoot && input.shootCooldownRemaining <= 0) {
        this.bulletPool.acquirePlayerBullet(world, transform.x, transform.y - 12);
        input.shootCooldownRemaining = cooldown;
      }
    }
  }
}
