import { World, Entity } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "./types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "./types/TowerDefenseConfigSchema";
import { spawnTowerProjectile } from "./EntityFactory";

/**
 * Simple pool for tower projectiles. Reuses entities when possible;
 * falls back to spawnTowerProjectile for new ones.
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
    speed: number,
    slow?: { factor: number; durationMs: number }
  ): Entity {
    if (this.free.length > 0) {
      const entity = this.free.pop()!;
      world.commands.removeEntity(entity);
    }
    return spawnTowerProjectile(world, config, x, y, targetEntity, damage, speed, slow);
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
