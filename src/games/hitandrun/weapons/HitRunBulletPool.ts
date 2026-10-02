import {
  World,
  Entity,
  ProjectilePool,
  type ProjectileParams
} from "@tiny-aster/core";
import { createProjectilePoolConfig } from "@tiny-aster/gameplay-kit";
import type { HitRunBulletParams, ExplosivePayloadComponent } from "./HitRunWeaponTypes";

/** Layers de colisión sugeridos (ajustar a tu máscara de Hit&Run). */
export const HIT_RUN_BULLET_LAYER = 1 << 3;
export const HIT_RUN_ENEMY_LAYER = 1 << 4;

const poolHooks = createProjectilePoolConfig<HitRunBulletParams>({
  shape: "bullet_hmg",
  layer: HIT_RUN_BULLET_LAYER,
  mask: HIT_RUN_ENEMY_LAYER,
  poolId: "PlayerBulletPool",
  damageCategory: "bullet",
  faction: "player",
  isTrigger: true,
  order: 5,
  bulletType: "PlayerBullet",
  extraComponents: (data, params) => {
    // Damage data-driven por disparo
    if (data.damage) {
      data.damage.amount = params.damageAmount;
      data.damage.category = params.damageCategory;
      data.damage.consumption = params.consumption;
      data.damage.friendlyFire = false;
      if (params.sourceEntity !== undefined) {
        data.damage.sourceEntity = params.sourceEntity;
      }
    }

    // Render shape override
    if (params.shape && data.render) {
      data.render.shape = params.shape;
    }
    if (params.rotation !== undefined && data.position) {
      data.position.rotation = params.rotation;
      data.position.worldRotation = params.rotation;
    }

    // Carga explosiva (cohete)
    if (params.explosive) {
      const payload: ExplosivePayloadComponent = {
        type: "ExplosivePayload",
        radius: params.explosive.radius,
        damage: params.explosive.damage,
        detonated: false
      };
      (data as Record<string, unknown>).explosivePayload = payload;
    } else {
      delete (data as Record<string, unknown>).explosivePayload;
    }
  }
});

/**
 * Pool de balas del jugador para Hit&Run.
 * Resource key recomendado: "PlayerBulletPool".
 */
export class HitRunBulletPool extends ProjectilePool {
  constructor(initialSize = 64) {
    super({
      initialSize,
      maxSize: 128,
      factory: poolHooks.factory as any,
      reset: poolHooks.reset as any,
      initializer: poolHooks.initializer as any
    });
  }

  /**
   * Adquiere un proyectil con parámetros de arma completos.
   */
  public acquireBullet(world: World, params: HitRunBulletParams): Entity {
    return this.acquire(world, params as unknown as ProjectileParams);
  }
}

/**
 * Crea el pool y lo registra como resource del world.
 */
export function registerPlayerBulletPool(
  world: World,
  initialSize = 64
): HitRunBulletPool {
  const existing = world.getResource<HitRunBulletPool>("PlayerBulletPool");
  if (existing) return existing;

  const pool = new HitRunBulletPool(initialSize);
  world.setResource("PlayerBulletPool", pool);
  return pool;
}
