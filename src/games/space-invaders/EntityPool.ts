import { World } from "@tiny-aster/core";
import { CollisionLayers, createProjectilePoolConfig, SharedParticlePool } from "@tiny-aster/gameplay-kit";
import { Entity, BoundaryComponent } from "@tiny-aster/core";
import { GAME_CONFIG } from "./types/SpaceInvadersTypes";
import { ProjectilePool, ProjectileParams } from "@tiny-aster/core";

export type BulletPoolConfig = {
  shape: string;
  layer: number;
  mask: number;
  poolId: string;
  bulletType: "PlayerBullet" | "EnemyBullet";
  damageCategory: string;
  faction: "player" | "enemy";
};

function createBulletPoolConfig(config: BulletPoolConfig) {
  const baseConfig = createProjectilePoolConfig({
    shape: config.shape,
    layer: config.layer,
    mask: config.mask,
    poolId: config.poolId,
    damageCategory: config.damageCategory,
    faction: config.faction,
    bulletType: config.bulletType,
    order: 10,
    extraComponents: (data: any) => {
      data.boundary = {
        type: "Boundary",
        width: GAME_CONFIG.worldWidth,
        height: GAME_CONFIG.worldHeight,
        mode: "destroy"
      } as BoundaryComponent;
    }
  });

  const baseFactory = baseConfig.factory;
  return {
    ...baseConfig,
    factory: () => {
      const obj = baseFactory() as any;
      obj.boundary = {
        type: "Boundary",
        width: GAME_CONFIG.worldWidth,
        height: GAME_CONFIG.worldHeight,
        mode: "destroy"
      } as BoundaryComponent;
      return obj;
    }
  };
}

/**
 * Abstract base bullet pool for Space Invaders projectiles.
 */
export abstract class SpaceInvadersBulletPool extends ProjectilePool<any, ProjectileParams> {
  public acquireInvaderBullet(
    world: World,
    x: number,
    y: number,
    dx: number,
    dy: number,
    size: number,
    color: string,
    ttl: number
  ): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}

/**
 * Standardized Player Bullet Pool for Space Invaders.
 */
export class PlayerBulletPool extends SpaceInvadersBulletPool {
  constructor() {
    super(createBulletPoolConfig({
      shape: "player_bullet",
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
      poolId: "PlayerBulletPool",
      bulletType: "PlayerBullet",
      damageCategory: "player_bullet",
      faction: "player"
    }));
  }
}

/**
 * Standardized Enemy Bullet Pool for Space Invaders.
 */
export class EnemyBulletPool extends SpaceInvadersBulletPool {
  constructor() {
    super(createBulletPoolConfig({
      shape: "enemy_bullet",
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER | CollisionLayers.DEBRIS,
      poolId: "EnemyBulletPool",
      bulletType: "EnemyBullet",
      damageCategory: "enemy_bullet",
      faction: "enemy"
    }));
  }
}

/**
 * Standardized Particle Pool for Space Invaders.
 */
export class ParticlePool extends SharedParticlePool {
  constructor() {
    super({
      poolId: "ParticlePool",
      shape: "particle",
      order: 15,
      isTrigger: true
    });
  }
}
