import { World, Entity, EntityBuilder, ShapeType, CircleShape, BoundaryComponent } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { ShmupComponentRegistry } from "./types/ShmupTypes";
import { ShmupConfig } from "./types/ShmupConfigSchema";
import { PlayerBulletPool, EnemyBulletPool } from "./EntityPool";
import { getGameplayColor } from "../../theme/GameplayColorMap";

export function createPlayer(world: World<ShmupComponentRegistry>, x: number, y: number): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig")!;
  const e = world.createEntity();
  EntityBuilder.fromEntity(world, e)
    .withTransform({ x, y })
    .withVelocity()
    .withRender({ shape: "shmup_player", size: c.PLAYER_SIZE, color: getGameplayColor("Player", world), order: 5 })
    .withCollider({ shape: { type: ShapeType.Circle, radius: c.PLAYER_COLLIDER_RADIUS } as CircleShape, layer: CollisionLayers.PLAYER, mask: CollisionLayers.ENEMY })
    .withCollisionEvents();
  world.addComponent(e, { type: "ShmupPlayer" });
  world.addComponent(e, { type: "Input", axes: {}, actions: new Set<string>(), shootCooldownRemaining: 0 });
  world.addComponent(e, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 });
  world.addComponent(e, { type: "Faction", faction: "player", value: "player" });
  world.addComponent(e, { type: "Boundary", width: c.WORLD_WIDTH - c.PLAYER_SIZE, height: c.WORLD_HEIGHT - c.PLAYER_SIZE, mode: "bounce" } as BoundaryComponent);
  world.addComponent(e, { type: "LocalPlayer" });
  return e;
}

export function createEnemy(world: World<ShmupComponentRegistry>, x: number, y: number, kind: "straight"|"sine"|"arc" = "straight"): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig")!;
  const e = world.createEntity();
  EntityBuilder.fromEntity(world, e)
    .withTransform({ x, y })
    .withVelocity({ vy: c.ENEMY_SPEED })
    .withRender({ shape: "shmup_enemy", size: c.ENEMY_SIZE, color: getGameplayColor("Enemy", world), order: 4 })
    .withCollider({ shape: { type: ShapeType.Circle, radius: c.ENEMY_COLLIDER_RADIUS } as CircleShape, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE })
    .withCollisionEvents();
  world.addComponent(e, { type: "ShmupEnemy", score: c.ENEMY_SCORE });
  world.addComponent(e, { type: "Health", current: c.ENEMY_HP, max: c.ENEMY_HP });
  world.addComponent(e, { type: "Faction", faction: "enemy", value: "enemy" });
  world.addComponent(e, { type: "EnemyPath", kind, elapsed: 0, duration: 8, speed: c.ENEMY_SPEED, amplitude: 90, frequency: 1.8, originX: x, originY: y });
  return e;
}

export function createPlayerBullet(world: World<ShmupComponentRegistry>, x: number, y: number, pool: PlayerBulletPool): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig");
  return pool.acquireBullet(world, { x, y, dx: 0, dy: -(c?.PLAYER_BULLET_SPEED ?? 650), size: c?.PLAYER_BULLET_SIZE ?? 4, color: getGameplayColor("PlayerProjectile", world), ttl: c?.PLAYER_BULLET_TTL ?? 2 });
}
export function createEnemyBullet(world: World<ShmupComponentRegistry>, x: number, y: number, dx: number, dy: number, pool: EnemyBulletPool): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig");
  return pool.acquireBullet(world, { x, y, dx, dy, size: c?.ENEMY_BULLET_SIZE ?? 4, color: getGameplayColor("EnemyProjectile", world), ttl: c?.ENEMY_BULLET_TTL ?? 5 });
}
