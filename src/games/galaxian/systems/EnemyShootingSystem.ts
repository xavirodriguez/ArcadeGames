import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEnemyComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { BulletPool } from "../EntityPool";

export class EnemyShootingSystem extends System<GalaxianComponentRegistry> {
  private bulletPool: BulletPool;

  constructor(bulletPool: BulletPool) {
    super();
    this.bulletPool = bulletPool;
  }

  public update(world: World<GalaxianComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<GalaxianConfig>("GameConfig");
    if (!config) return;

    const shootChance = config.dive.enemyShootChance ?? 0.6;
    const maxShots = config.dive.enemyShootMaxPerDive ?? 2;
    const bulletSpeed = config.ENEMY_BULLET_SPEED ?? 240;

    const playerEntities = world.query("Player", "Transform");
    if (playerEntities.length === 0) return;
    const playerTrans = world.getComponent(playerEntities[0], "Transform");
    if (!playerTrans) return;

    const divingEnemies = world.query("GalaxianEnemy", "Transform");
    for (const entity of divingEnemies) {
      const enemy = world.getMutableComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
      const transform = world.getComponent(entity, "Transform");
      if (!enemy || !transform) continue;

      if (enemy.state === "diving" && enemy.shotsFiredInDive < maxShots) {
        if (transform.y > 120 && transform.y < 450) {
          if (world.gameplayRandom.next() < shootChance * 0.05) {
            enemy.shotsFiredInDive++;

            const dx = playerTrans.x - transform.x;
            const dy = playerTrans.y - transform.y;
            const dist = Math.hypot(dx, dy) || 1;
            const vx = (dx / dist) * bulletSpeed;
            const vy = (dy / dist) * bulletSpeed;

            this.bulletPool.acquireEnemyBullet(world, transform.x, transform.y + 10, vx, vy);
          }
        }
      }
    }
  }
}
