import { World, ProjectilePool, ProjectileParams, ProjectileComponents, Entity, BoundaryComponent, PrefabConfig } from "@tiny-aster/core";
import { CollisionLayers, createProjectilePoolConfig, SharedParticlePool } from "@tiny-aster/gameplay-kit";
import type { ShmupComponentRegistry } from "./types/ShmupTypes";

const config = (player: boolean): PrefabConfig<ProjectileComponents, ProjectileParams> => createProjectilePoolConfig({
  shape: player ? "shmup_player_bullet" : "shmup_enemy_bullet",
  layer: player ? CollisionLayers.PROJECTILE : CollisionLayers.ENEMY,
  mask: player ? CollisionLayers.ENEMY : CollisionLayers.PLAYER,
  poolId: player ? "ShmupPlayerBulletPool" : "ShmupEnemyBulletPool",
  // Must match the component names declared in ShmupComponentRegistry.
  // Graze and bomb systems query these exact tags; the generic arcade names
  // silently made both systems no-ops on real pooled projectiles.
  bulletType: player ? "ShmupPlayerBullet" : "ShmupEnemyBullet",
  damageCategory: player ? "shmup_player_bullet" : "shmup_enemy_bullet",
  faction: player ? "player" : "enemy",
  order: 10,
  boundary: {
    type: "Boundary",
    minX: -60,
    maxX: 540,
    minY: -60,
    maxY: 914,
    width: 600,
    height: 974,
    mode: "destroy"
  },
  extraComponents: (data: Record<string, unknown>, _params: unknown, world: World, entity: Entity) => {
    const gameConfig = world.getResource<{ WORLD_WIDTH?: number; WORLD_HEIGHT?: number; OFFSCREEN_MARGIN?: number }>("GameConfig");
    const width = gameConfig?.WORLD_WIDTH ?? 480;
    const height = gameConfig?.WORLD_HEIGHT ?? 854;
    const margin = gameConfig?.OFFSCREEN_MARGIN ?? 60;
    const boundary = data.boundary as BoundaryComponent;
    boundary.minX = -margin;
    boundary.maxX = width + margin;
    boundary.minY = -margin;
    boundary.maxY = height + margin;
    boundary.width = width + margin * 2;
    boundary.height = height + margin * 2;
    boundary.mode = "destroy";
    // Graze credit lives on the projectile component (snapshot state), not in
    // the graze system. Reset it whenever a pooled bullet is acquired.
    if (!player) {
      (world as World<ShmupComponentRegistry>).mutateComponent(entity, "ShmupEnemyBullet", (tag) => {
        tag.grazed = false;
      });
    }
  }
}) as never;

export class PlayerBulletPool extends ProjectilePool<ProjectileComponents, ProjectileParams> {
  constructor() { super(config(true)); }
  acquireBullet(world: World, params: ProjectileParams): Entity { return this.acquire(world, params); }
}
export class EnemyBulletPool extends ProjectilePool<ProjectileComponents, ProjectileParams> {
  constructor() { super(config(false)); }
  acquireBullet(world: World, params: ProjectileParams): Entity { return this.acquire(world, params); }
}

/**
 * ECS particle pool for layered explosions (`spawnLayeredExplosion` reads `ParticlePool`).
 * Matches Asteroids / Space Invaders: SharedParticlePool with poolId "ParticlePool".
 */
export class ParticlePool extends SharedParticlePool {
  constructor() {
    super({
      poolId: "ParticlePool",
      shape: "particle",
      order: 12,
      isTrigger: true
    });
  }
}
