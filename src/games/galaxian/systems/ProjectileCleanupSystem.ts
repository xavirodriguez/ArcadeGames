import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { BulletPool } from "../EntityPool";

/**
 * Reclaims projectiles as soon as they leave the playfield or the game ends.
 * Pool availability lives on ECS entities so snapshots can restore the pool.
 */
export class ProjectileCleanupSystem extends System<GalaxianComponentRegistry> {
  private readonly bulletPool: BulletPool;

  constructor(bulletPool: BulletPool) {
    super();
    this.bulletPool = bulletPool;
  }

  public update(world: World<GalaxianComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<GalaxianConfig>("GameConfig");
    if (!config) return;

    const stateEntity = world.query("GameState")[0];
    const gameOver = stateEntity !== undefined
      && world.getComponent(stateEntity, "GameState")?.isGameOver === true;
    const margin = Math.max(config.PLAYER_BULLET_SIZE, config.ENEMY_BULLET_SIZE) * 2;
    const maxX = config.worldWidth + margin;
    const maxY = config.worldHeight + margin;

    const projectiles = [
      ...world.query("PlayerBullet", "Transform"),
      ...world.query("EnemyBullet", "Transform"),
    ];

    for (const entity of projectiles) {
      const transform = world.getComponent(entity, "Transform");
      if (!transform) continue;

      const outsidePlayfield =
        transform.x < -margin
        || transform.x > maxX
        || transform.y < -margin
        || transform.y > maxY;

      if (gameOver || outsidePlayfield) {
        this.bulletPool.release(world, entity);
      }
    }
  }
}
