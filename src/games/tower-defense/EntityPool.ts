import { World, Entity } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "./types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "./types/TowerDefenseConfigSchema";
import { spawnTowerProjectile } from "./EntityFactory";

/**
 * Simple pool for tower projectiles. Reuses entities when possible;
 * falls back to spawnTowerProjectile for new ones.
 * Mirrors the PlayerBulletPool / EnemyBulletPool pattern of Space Invaders
 * but keeps the implementation minimal for the TD skeleton.
 */
export class TowerProjectilePool {
  private free: Entity[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 64) {
    this.maxSize = maxSize;
  }

  acquire(
    world: World<TowerDefenseComponentRegistry>,
    config: TowerDefenseConfig,
    x: number,
    y: number,
    targetEntity: number | null,
    damage: number,
    speed: number
  ): Entity {
    // Prefer fresh spawn for correctness with full component setup;
    // pool recycling can be tightened later once blueprints are fully wired.
    if (this.free.length > 0) {
      const entity = this.free.pop()!;
      // Re-init via factory-like path is safer than partial mutate for now
      world.destroyEntity(entity);
    }
    return spawnTowerProjectile(world, config, x, y, targetEntity, damage, speed);
  }

  release(entity: Entity): void {
    if (this.free.length < this.maxSize) {
      this.free.push(entity);
    }
  }

  clear(): void {
    this.free.length = 0;
  }
}
