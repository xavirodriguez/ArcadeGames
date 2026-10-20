import { World, Entity, ShapeType, createDeferredEntity } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { GalaxianComponentRegistry } from "./types/GalaxianTypes";
import { GalaxianConfig } from "./types/GalaxianConfigSchema";

export class BulletPool {
  private playerPool: Entity[] = [];
  private enemyPool: Entity[] = [];

  public acquirePlayerBullet(world: World<GalaxianComponentRegistry>, x: number, y: number): Entity {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const speed = config?.PLAYER_BULLET_SPEED ?? 520;
    const size = config?.PLAYER_BULLET_SIZE ?? 4;
    const color = config?.visual.palette.playerAccent ?? "#5CF2C0";

    if (this.playerPool.length > 0) {
      const entity = this.playerPool.pop()!;
      world.mutateComponent(entity, "Transform", (t) => {
        t.x = x;
        t.y = y;
        t.rotation = 0;
        t.dirty = true;
      });
      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = 0;
        v.vy = -speed;
      });
      if (!world.hasComponent(entity, "PlayerBullet")) {
        world.commands.addComponent(entity, { type: "PlayerBullet" });
      }
      return entity;
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

    return entity;
  }

  public acquireEnemyBullet(world: World<GalaxianComponentRegistry>, x: number, y: number, vx: number = 0, vy?: number): Entity {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const speed = config?.ENEMY_BULLET_SPEED ?? 240;
    const finalVy = vy ?? speed;
    const size = config?.ENEMY_BULLET_SIZE ?? 6;
    const color = config?.visual.palette.enemyFire ?? "#FF7A45";
    const rotation = Math.atan2(finalVy, vx) - Math.PI / 2;

    if (this.enemyPool.length > 0) {
      const entity = this.enemyPool.pop()!;
      world.mutateComponent(entity, "Transform", (t) => {
        t.x = x;
        t.y = y;
        t.rotation = rotation;
        t.dirty = true;
      });
      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = vx;
        v.vy = finalVy;
      });
      if (!world.hasComponent(entity, "EnemyBullet")) {
        world.commands.addComponent(entity, { type: "EnemyBullet" });
      }
      return entity;
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

    return entity;
  }

  public release(world: World<GalaxianComponentRegistry>, entity: Entity): void {
    if (world.hasComponent(entity, "PlayerBullet")) {
      world.commands.removeComponent(entity, "PlayerBullet");
      this.playerPool.push(entity);
    } else if (world.hasComponent(entity, "EnemyBullet")) {
      world.commands.removeComponent(entity, "EnemyBullet");
      this.enemyPool.push(entity);
    }
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
