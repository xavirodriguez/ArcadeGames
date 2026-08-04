import { World } from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { Entity, Component, BoundaryComponent, TransformComponent, VelocityComponent, RenderComponent, ColliderComponent, CircleShape, ShapeType, CollisionEventsComponent, ReclaimableComponent } from "@tiny-aster/core";
import { SpaceInvadersConfig } from "./types/SpaceInvadersConfigSchema";
import { GAME_CONFIG } from "./types/SpaceInvadersTypes";
import { ProjectilePool, ProjectileComponents, ProjectileParams } from "@tiny-aster/core";

interface InvaderBulletComponents extends Omit<ProjectileComponents, "collider"> {
  boundary: BoundaryComponent;
  bullet: Component;
  collider: ColliderComponent;
  collisionEvents: CollisionEventsComponent;
}

interface CustomParticleComponents extends Omit<ProjectileComponents, "collider"> {
  collider: ColliderComponent;
}

/**
 * Standardized Player Bullet Pool for Space Invaders.
 */
export class PlayerBulletPool extends ProjectilePool<any, ProjectileParams> {
  constructor() {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent,
        velocity: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent,
        render: { type: "Render", shape: "player_bullet", size: 0, color: "", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent,
        collider: {
          type: "Collider",
          shape: { type: ShapeType.Circle, radius: 0 } as CircleShape,
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
          offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
        } as ColliderComponent,
        boundary: {
          type: "Boundary",
          width: GAME_CONFIG.SCREEN_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
          mode: "destroy"
        } as BoundaryComponent,
        ttl: { type: "TTL", remaining: 0, timeLeft: 0 },
        reclaimable: { type: "Reclaimable", poolId: "PlayerBulletPool", poolName: "PlayerBulletPool" } as ReclaimableComponent,
        bullet: { type: "PlayerBullet" },
        collisionEvents: {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as CollisionEventsComponent
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initializer: (data, p, world) => {
        data.position.x = p.x;
        data.position.y = p.y;
        data.position.worldX = p.x;
        data.position.worldY = p.y;
        data.position.dirty = true;
        data.velocity.vx = p.dx;
        data.velocity.vy = p.dy;
        data.render.size = p.size;
        data.render.color = p.color;
        if (data.collider.shape.type === ShapeType.Circle) {
            (data.collider.shape as CircleShape).radius = p.size;
        }
        data.boundary.width = GAME_CONFIG.SCREEN_WIDTH;
        data.boundary.height = GAME_CONFIG.SCREEN_HEIGHT;
        data.ttl.remaining = p.ttl;
        data.ttl.timeLeft = p.ttl;
      }
    });
  }

  public acquireInvaderBullet(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}

/**
 * Standardized Enemy Bullet Pool for Space Invaders.
 */
export class EnemyBulletPool extends ProjectilePool<any, ProjectileParams> {
  constructor() {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent,
        velocity: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent,
        render: { type: "Render", shape: "enemy_bullet", size: 0, color: "", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent,
        collider: {
          type: "Collider",
          shape: { type: ShapeType.Circle, radius: 0 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.DEBRIS,
          offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
        } as ColliderComponent,
        boundary: {
          type: "Boundary",
          width: GAME_CONFIG.SCREEN_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
          mode: "destroy"
        } as BoundaryComponent,
        ttl: { type: "TTL", remaining: 0, timeLeft: 0 },
        reclaimable: { type: "Reclaimable", poolId: "EnemyBulletPool", poolName: "EnemyBulletPool" } as ReclaimableComponent,
        bullet: { type: "EnemyBullet" },
        collisionEvents: {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as CollisionEventsComponent
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initializer: (data, p, world) => {
        data.position.x = p.x;
        data.position.y = p.y;
        data.position.worldX = p.x;
        data.position.worldY = p.y;
        data.position.dirty = true;
        data.velocity.vx = p.dx;
        data.velocity.vy = p.dy;
        data.render.size = p.size;
        data.render.color = p.color;
        if (data.collider.shape.type === ShapeType.Circle) {
            (data.collider.shape as CircleShape).radius = p.size;
        }
        data.boundary.width = GAME_CONFIG.SCREEN_WIDTH;
        data.boundary.height = GAME_CONFIG.SCREEN_HEIGHT;
        data.ttl.remaining = p.ttl;
        data.ttl.timeLeft = p.ttl;
      }
    });
  }

  public acquireInvaderBullet(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}

/**
 * Standardized Particle Pool for Space Invaders.
 */
export class ParticlePool extends ProjectilePool<any, ProjectileParams> {
  constructor() {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent,
        velocity: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent,
        render: { type: "Render", shape: "particle", size: 0, color: "", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent,
        collider: {
            type: "Collider",
            shape: { type: ShapeType.Circle, radius: 0 } as CircleShape,
            layer: 0, mask: 0, offsetX: 0, offsetY: 0, isTrigger: true, enabled: false
        } as ColliderComponent,
        ttl: { type: "TTL", remaining: 0, timeLeft: 0 },
        reclaimable: { type: "Reclaimable", poolId: "ParticlePool", poolName: "ParticlePool" } as ReclaimableComponent
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initializer: (data, p) => {
        data.position.x = p.x;
        data.position.y = p.y;
        data.position.worldX = p.x;
        data.position.worldY = p.y;
        data.position.dirty = true;
        data.velocity.vx = p.dx;
        data.velocity.vy = p.dy;
        data.render.size = p.size;
        data.render.color = p.color;
        data.ttl.remaining = p.ttl;
        data.ttl.timeLeft = p.ttl;
      }
    });
  }
}
