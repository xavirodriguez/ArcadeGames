import { World, Entity, ShapeType, createDeferredEntity } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { GalaxianComponentRegistry } from "./types/GalaxianTypes";
import { GalaxianConfig } from "./types/GalaxianConfigSchema";

export class BulletPool {
  public acquirePlayerBullet(world: World<GalaxianComponentRegistry>, x: number, y: number): Entity {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const speed = config?.PLAYER_BULLET_SPEED ?? 520;
    const size = config?.PLAYER_BULLET_SIZE ?? 4;
    const color = config?.visual.palette.playerAccent ?? "#5CF2C0";

    const pooledPlayer = world.query("GalaxianBulletPoolEntry").find((candidate) => {
      const entry = world.getComponent(candidate, "GalaxianBulletPoolEntry");
      return entry?.owner === "player" && entry.available;
    });
    if (pooledPlayer !== undefined) {
      world.mutateComponent(pooledPlayer, "GalaxianBulletPoolEntry", (entry) => {
        entry.available = false;
      });
      world.mutateComponent(pooledPlayer, "Transform", (t) => {
        t.x = x;
        t.y = y;
        t.rotation = 0;
        t.dirty = true;
      });
      world.mutateComponent(pooledPlayer, "Velocity", (v) => {
        v.vx = 0;
        v.vy = -speed;
      });
      world.commands.addComponent(pooledPlayer, { type: "PlayerBullet" });
      return pooledPlayer;
    }

    const { entity, add } = createDeferredEntity(world, world.isUpdating);
    add({
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    add({
      type: "Velocity",
      vx: 0,
      vy: -speed,
      angularVelocity: 0,
    });
    add({
      type: "Render",
      shape: "player_bullet",
      size,
      color,
      visible: true,
      opacity: 1,
      order: 15,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });
    add({
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: size },
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.ENEMY,
      enabled: true,
      isTrigger: false,
    });
    add({
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    });
    add({ type: "PlayerBullet" });
    add({ type: "GalaxianBulletPoolEntry", owner: "player", available: false });

    return entity;
  }

  public acquireEnemyBullet(world: World<GalaxianComponentRegistry>, x: number, y: number, vx: number = 0, vy?: number): Entity {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const speed = config?.ENEMY_BULLET_SPEED ?? 240;
    const finalVy = vy ?? speed;
    const size = config?.ENEMY_BULLET_SIZE ?? 6;
    const color = config?.visual.palette.enemyFire ?? "#FF7A45";
    const rotation = Math.atan2(finalVy, vx) - Math.PI / 2;

    const pooledEnemy = world.query("GalaxianBulletPoolEntry").find((candidate) => {
      const entry = world.getComponent(candidate, "GalaxianBulletPoolEntry");
      return entry?.owner === "enemy" && entry.available;
    });
    if (pooledEnemy !== undefined) {
      world.mutateComponent(pooledEnemy, "GalaxianBulletPoolEntry", (entry) => {
        entry.available = false;
      });
      world.mutateComponent(pooledEnemy, "Transform", (t) => {
        t.x = x;
        t.y = y;
        t.rotation = rotation;
        t.dirty = true;
      });
      world.mutateComponent(pooledEnemy, "Velocity", (v) => {
        v.vx = vx;
        v.vy = finalVy;
      });
      world.commands.addComponent(pooledEnemy, { type: "EnemyBullet" });
      return pooledEnemy;
    }

    const { entity, add } = createDeferredEntity(world, world.isUpdating);
    add({
      type: "Transform",
      x,
      y,
      rotation,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: rotation,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    add({
      type: "Velocity",
      vx,
      vy: finalVy,
      angularVelocity: 0,
    });
    add({
      type: "Render",
      shape: "enemy_bullet",
      size,
      color,
      visible: true,
      opacity: 1,
      order: 15,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });
    add({
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: size },
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER,
      enabled: true,
      isTrigger: false,
    });
    add({
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    });
    add({ type: "EnemyBullet" });
    add({ type: "GalaxianBulletPoolEntry", owner: "enemy", available: false });

    return entity;
  }

  public release(world: World<GalaxianComponentRegistry>, entity: Entity): void {
    const owner = world.hasComponent(entity, "PlayerBullet")
      ? "player"
      : world.hasComponent(entity, "EnemyBullet")
        ? "enemy"
        : undefined;
    if (!owner) return;

    const poolEntry = world.getMutableComponent(entity, "GalaxianBulletPoolEntry");
    if (!poolEntry || poolEntry.available) return;

    poolEntry.available = true;
    world.commands.removeComponent(entity, owner === "player" ? "PlayerBullet" : "EnemyBullet");
    world.mutateComponent(entity, "Transform", (t) => {
      t.x = -9999;
      t.y = -9999;
      t.dirty = true;
    });
    world.mutateComponent(entity, "Velocity", (v) => {
      v.vx = 0;
      v.vy = 0;
    });
  }
}
