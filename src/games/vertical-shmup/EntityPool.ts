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
  extraComponents: (data: Record<string, unknown>, _params: unknown, world?: World) => {
    const gameConfig = world?.getResource<{ WORLD_WIDTH?: number; WORLD_HEIGHT?: number; OFFSCREEN_MARGIN?: number }>("GameConfig");
    const width = gameConfig?.WORLD_WIDTH ?? 480;
    const height = gameConfig?.WORLD_HEIGHT ?? 854;
    const margin = gameConfig?.OFFSCREEN_MARGIN ?? 60;
    data.boundary = {
      type: "Boundary",
      minX: -margin,
      maxX: width + margin,
      minY: -margin,
      maxY: height + margin,
      width: width + margin,
      height: height + margin,
      mode: "destroy"
    } as BoundaryComponent;
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
