import {
  World,
  Entity,
  Component,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  Collider2DComponent,
  ReclaimableComponent,
  ProjectilePool,
  ProjectileComponents,
  ProjectileParams
} from "@tiny-aster/core";

/**
 * Empty/Dummy pool for bullets if not actively pooled.
 * @public
 */
export class BulletPool {
  public clear(): void {}
}

/**
 * Standardized, zero-allocation Particle Pool for Asteroids.
 * Extends the engine's ProjectilePool to leverage high-performance entity reuse.
 * @public
 */
export class ParticlePool extends ProjectilePool<ProjectileComponents, ProjectileParams> {
  public clear(): void {}

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
          shape: "particle",
          size: 0,
          color: "",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 10,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent,
        collider: {
          type: "Collider2D",
          shape: { type: "circle", radius: 0 },
          layer: 0,
          mask: 0,
          offsetX: 0,
          offsetY: 0,
          isTrigger: true,
          enabled: false
        } as Collider2DComponent,
        ttl: {
          type: "TTL",
          remaining: 0,
          timeLeft: 0
        },
        reclaimable: {
          type: "Reclaimable",
          poolId: "ParticlePool",
          poolName: "ParticlePool"
        } as ReclaimableComponent
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initializer: (data, p) => {
        data.position.x = p.x;
        data.position.y = p.y;
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
