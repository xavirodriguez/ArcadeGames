import {
  World,
  Entity,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  ColliderComponent,
  CollisionEventsComponent,
  ReclaimableComponent,
  ShapeType,
  CircleShape,
  ProjectilePool,
  ProjectileParams
} from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { DamageComponent, FactionComponent } from "../shared/combat/components/CombatComponents";

/**
 * Standardized GWBulletPool for Geometry Wars.
 * Extends the engine's ProjectilePool to leverage high-performance entity reuse.
 * @public
 */
export class GWBulletPool extends ProjectilePool<any, ProjectileParams> {
  constructor() {
    super({
      factory: () => ({
        position: {
          type: "Transform",
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: 0,
          worldY: 0,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        } as TransformComponent,
        velocity: {
          type: "Velocity",
          vx: 0,
          vy: 0,
          angularVelocity: 0
        } as VelocityComponent,
        render: {
          type: "Render",
          shape: "gw_bullet",
          size: 4,
          color: "#ffff00",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 2,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent,
        collider: {
          type: "Collider",
          shape: { type: ShapeType.Circle, radius: 2 } as CircleShape,
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.ENEMY,
          offsetX: 0,
          offsetY: 0,
          isTrigger: true,
          enabled: true
        } as ColliderComponent,
        ttl: {
          type: "TTL",
          remaining: 0,
          timeLeft: 0
        },
        reclaimable: {
          type: "Reclaimable",
          poolId: "GWBulletPool",
          poolName: "GWBulletPool"
        } as ReclaimableComponent,
        collisionEvents: {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as CollisionEventsComponent,
        damage: {
          type: "Damage",
          amount: 1,
          category: "player_bullet",
          friendlyFire: false,
          consumption: "destroy-entity"
        } as DamageComponent,
        faction: {
          type: "Faction",
          faction: "player",
          value: "player"
        } as FactionComponent
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
        data.position.worldX = 0;
        data.position.worldY = 0;
        data.position.dirty = true;
      },
      initializer: (data, p) => {
        data.position.x = p.x;
        data.position.y = p.y;
        data.position.rotation = p.shape ? parseFloat(p.shape) : 0; // Use shape or params to pass rotation
        data.position.worldX = p.x;
        data.position.worldY = p.y;
        data.position.worldRotation = data.position.rotation;
        data.position.dirty = true;

        data.velocity.vx = p.dx;
        data.velocity.vy = p.dy;

        data.render.size = p.size;
        data.render.color = p.color;
        data.render.rotation = data.position.rotation;

        if (data.collider.shape.type === ShapeType.Circle) {
          (data.collider.shape as CircleShape).radius = p.size / 2;
        }

        data.ttl.remaining = p.ttl;
        data.ttl.timeLeft = p.ttl;
      }
    });
  }

  public acquireBullet(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number, rotation: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl, shape: rotation.toString() });
  }
}
