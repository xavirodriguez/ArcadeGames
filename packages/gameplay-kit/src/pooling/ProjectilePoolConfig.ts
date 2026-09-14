import {
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  ColliderComponent,
  CircleShape,
  ShapeType,
  CollisionEventsComponent,
  ReclaimableComponent,
  TTLComponent,
  ProjectileParams,
  World,
  Entity
} from "@tiny-aster/core";
import { DamageComponent, FactionComponent } from "../combat";

export interface ProjectilePoolConfigDefaults<TParams extends ProjectileParams = ProjectileParams> {
  shape: string;
  layer: number;
  mask: number;
  poolId: string;
  damageCategory: string;
  faction: "player" | "enemy";
  isTrigger?: boolean;
  order?: number;
  bulletType?: string;
  extraComponents?: (data: Record<string, unknown>, params: TParams, world: World, entity: Entity) => void;
}

/**
 * Creates a reusable ProjectilePool configuration object for initializing standard arcade projectiles.
 *
 * @param defaults - Projectile configuration options.
 * @returns Object with factory, reset, and initializer hooks for `ProjectilePool`.
 * @public
 */
export function createProjectilePoolConfig<TParams extends ProjectileParams = ProjectileParams>(
  defaults: ProjectilePoolConfigDefaults<TParams>
) {
  const isTrigger = defaults.isTrigger ?? false;
  const order = defaults.order ?? 2;

  return {
    factory: () => {
      const base: Record<string, unknown> = {
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
        velocity: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent,
        render: {
          type: "Render",
          shape: defaults.shape,
          size: 0,
          color: "",
          rotation: 0,
          visible: true,
          opacity: 1,
          order,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent,
        collider: {
          type: "Collider",
          shape: { type: ShapeType.Circle, radius: 0 } as CircleShape,
          layer: defaults.layer,
          mask: defaults.mask,
          offsetX: 0,
          offsetY: 0,
          isTrigger,
          enabled: true
        } as ColliderComponent,
        ttl: { type: "TTL", remaining: 0, timeLeft: 0 } as TTLComponent,
        reclaimable: {
          type: "Reclaimable",
          poolId: defaults.poolId,
          poolName: defaults.poolId
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
          category: defaults.damageCategory,
          friendlyFire: false,
          consumption: "destroy-entity"
        } as DamageComponent,
        faction: {
          type: "Faction",
          faction: defaults.faction,
          value: defaults.faction
        } as FactionComponent
      };

      if (defaults.bulletType) {
        base.bullet = { type: defaults.bulletType };
      }

      return base;
    },

    reset: (data: Record<string, any>) => {
      if (Object.isFrozen(data.position)) {
        data.position = { ...data.position };
      }
      data.position.x = 0;
      data.position.y = 0;
      data.position.rotation = 0;
      data.position.worldX = 0;
      data.position.worldY = 0;
      data.position.worldRotation = 0;
      data.position.dirty = true;

      if (Object.isFrozen(data.velocity)) {
        data.velocity = { ...data.velocity };
      }
      data.velocity.vx = 0;
      data.velocity.vy = 0;
      data.velocity.angularVelocity = 0;

      if (Object.isFrozen(data.render)) {
        data.render = { ...data.render };
      }
      data.render.shape = defaults.shape;
      data.render.size = 0;
      data.render.color = "";
      data.render.rotation = 0;
      data.render.visible = true;
      data.render.opacity = 1;

      if (Object.isFrozen(data.ttl)) {
        data.ttl = { ...data.ttl };
      }
      data.ttl.remaining = 0;
      data.ttl.timeLeft = 0;

      if (data.collisionEvents) {
        data.collisionEvents.collisions.length = 0;
        data.collisionEvents.activeTriggers.length = 0;
        data.collisionEvents.triggersEntered.length = 0;
        data.collisionEvents.triggersExited.length = 0;
      }
    },

    initializer: (data: Record<string, any>, p: TParams, world: World, entity: Entity) => {
      if (Object.isFrozen(data.position)) {
        data.position = { ...data.position };
      }
      if (Object.isFrozen(data.velocity)) {
        data.velocity = { ...data.velocity };
      }
      if (Object.isFrozen(data.render)) {
        data.render = { ...data.render };
      }
      if (Object.isFrozen(data.collider)) {
        data.collider = { ...data.collider };
      }
      if (Object.isFrozen(data.ttl)) {
        data.ttl = { ...data.ttl };
      }

      data.position.x = p.x;
      data.position.y = p.y;
      data.position.worldX = p.x;
      data.position.worldY = p.y;
      data.position.dirty = true;

      data.velocity.vx = p.dx;
      data.velocity.vy = p.dy;

      data.render.size = p.size;
      data.render.color = p.color;
      data.render.visible = true;
      data.render.opacity = 1;

      if (data.collider.shape.type === ShapeType.Circle) {
        (data.collider.shape as CircleShape).radius = p.size;
      }

      data.ttl.remaining = p.ttl;
      data.ttl.timeLeft = p.ttl;

      if (defaults.extraComponents) {
        defaults.extraComponents(data, p, world, entity);
      }
    }
  };
}
