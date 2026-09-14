import {
  World,
  Entity,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  ColliderComponent,
  CircleShape,
  ShapeType,
  CollisionEventsComponent,
  ReclaimableComponent,
  BoundaryComponent,
  TTLComponent,
  resolveThemeColor,
  ProjectilePool,
  ProjectileParams
} from "@tiny-aster/core";
import { CollisionLayers, createProjectilePoolConfig, SharedParticlePool } from "@tiny-aster/gameplay-kit";

/**
 * Parameters for acquiring an Asteroids bullet from the pool.
 * Extends ProjectileParams to remain fully compatible with ProjectilePool.
 * @public
 */
export interface AsteroidsBulletParams extends ProjectileParams {
  vx: number;
  vy: number;
  rotation?: number;
  ownerId?: string;
}

function createAsteroidsBulletPoolConfig() {
  const base = createProjectilePoolConfig<AsteroidsBulletParams>({
    shape: "bullet",
    layer: CollisionLayers.PROJECTILE,
    mask: CollisionLayers.ENEMY,
    poolId: "BulletPool",
    damageCategory: "player_bullet",
    faction: "player",
    order: 2,
    extraComponents: (data: any, p: AsteroidsBulletParams, world: World, entity: Entity) => {
      const tint = resolveThemeColor(world, "bullet", "player-bullet");
      const gameConfig = world.getResource<any>("GameConfig");

      data.position.rotation = p.rotation ?? 0;
      data.render.color = p.color || tint;
      data.render.rotation = p.rotation ?? 0;
      data.bullet.ownerId = p.ownerId;

      const ttlVal = p.ttl ?? gameConfig?.BULLET_TTL ?? 2.0;
      data.ttl.remaining = ttlVal;
      data.ttl.timeLeft = ttlVal;

      if (gameConfig?.BULLET_BOUNDARY_BEHAVIOR === "bounce") {
        const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
        world.addComponent(entity, {
          type: "Boundary",
          width: screen.width,
          height: screen.height,
          mode: "bounce"
        } as BoundaryComponent);
      }
    }
  });

  const baseFactory = base.factory;
  const baseReset = base.reset;

  return {
    ...base,
    factory: () => {
      const obj = baseFactory() as any;
      obj.bullet = { type: "Bullet", ownerId: undefined };
      (obj.collider.shape as CircleShape).radius = 2;
      obj.render.size = 2;
      return obj;
    },
    reset: (data: any) => {
      baseReset(data);
      if (data.bullet) {
        data.bullet.ownerId = undefined;
      }
    }
  };
}

/**
 * Standardized Bullet Pool for Asteroids.
 * Extends ProjectilePool from @tiny-aster/core.
 * @public
 */
export class BulletPool extends ProjectilePool<any, AsteroidsBulletParams> {
  constructor() {
    super(createAsteroidsBulletPoolConfig());
  }

  public acquireBullet(world: World, params: AsteroidsBulletParams): Entity {
    return this.acquire(world, params);
  }
}

/**
 * Standardized, zero-allocation Particle Pool for Asteroids.
 * Extends SharedParticlePool for cross-game consistency.
 * @public
 */
export class ParticlePool extends SharedParticlePool {
  constructor() {
    super({
      poolId: "ParticlePool",
      shape: "particle",
      order: 10,
      isTrigger: true
    });
  }
}
