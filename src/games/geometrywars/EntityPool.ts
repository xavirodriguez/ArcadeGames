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
import { CollisionLayers, createProjectilePoolConfig, SharedParticlePool } from "@tiny-aster/gameplay-kit";
import { colors } from "../../theme/colors";

/**
 * Standardized GWBulletPool for Geometry Wars.
 * Extends the engine's ProjectilePool to leverage high-performance entity reuse.
 * @public
 */
export class GWBulletPool extends ProjectilePool<any, ProjectileParams> {
  constructor() {
    super(
      createProjectilePoolConfig({
        shape: "gw_bullet",
        layer: CollisionLayers.PROJECTILE,
        mask: CollisionLayers.ENEMY,
        poolId: "GWBulletPool",
        damageCategory: "player_bullet",
        faction: "player",
        isTrigger: true,
        order: 2,
        extraComponents: (data: any, p: ProjectileParams) => {
          data.position.rotation = p.shape ? parseFloat(p.shape) : 0;
          data.position.worldRotation = data.position.rotation;
          data.render.color = p.color || colors.gold;
          data.render.rotation = data.position.rotation;
          if (data.collider.shape.type === ShapeType.Circle) {
            (data.collider.shape as CircleShape).radius = p.size / 2;
          }
        }
      })
    );
  }

  public acquireBullet(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number, rotation: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl, shape: rotation.toString() });
  }
}

/**
 * Standardized GWParticlePool for Geometry Wars.
 * Extends SharedParticlePool for cross-game consistency.
 * @public
 */
export class GWParticlePool extends SharedParticlePool {
  constructor() {
    super({
      poolId: "GWParticlePool",
      shape: "gw_particle",
      order: 3,
      isTrigger: true
    });
  }
}
