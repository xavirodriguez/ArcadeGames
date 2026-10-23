import { World, ProjectilePool, ProjectileParams, ProjectileComponents, Entity, BoundaryComponent, PrefabConfig } from "@tiny-aster/core";
import { CollisionLayers, createProjectilePoolConfig } from "@tiny-aster/gameplay-kit";

const config = (player: boolean): PrefabConfig<ProjectileComponents, ProjectileParams> => createProjectilePoolConfig({
  shape: player ? "shmup_player_bullet" : "shmup_enemy_bullet",
  layer: player ? CollisionLayers.PROJECTILE : CollisionLayers.ENEMY,
  mask: player ? CollisionLayers.ENEMY : CollisionLayers.PLAYER,
  poolId: player ? "ShmupPlayerBulletPool" : "ShmupEnemyBulletPool",
  bulletType: player ? "PlayerBullet" : "EnemyBullet",
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
  extraComponents: (data: Record<string, unknown>, _params: unknown, world: World) => {
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
