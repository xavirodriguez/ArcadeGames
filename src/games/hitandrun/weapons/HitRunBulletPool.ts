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
    const damageComp = data.damage as { amount: number; category?: string; consumption?: any; friendlyFire?: boolean; sourceEntity?: number } | undefined;
    if (damageComp) {
      damageComp.amount = params.damageAmount;
      damageComp.category = params.damageCategory;
      damageComp.consumption = params.consumption;
      damageComp.friendlyFire = false;
      if (params.sourceEntity !== undefined) {
        damageComp.sourceEntity = params.sourceEntity;
      }
    }

    // Render shape override
    const renderComp = data.render as { shape?: string } | undefined;
    if (params.shape && renderComp) {
      renderComp.shape = params.shape;
    }

    const posComp = data.position as { rotation?: number; worldRotation?: number } | undefined;
    if (params.rotation !== undefined && posComp) {
      posComp.rotation = params.rotation;
      posComp.worldRotation = params.rotation;
    }

    // Carga explosiva (cohete)
    if (params.explosive) {
      const payload: ExplosivePayloadComponent = {
        type: "ExplosivePayload",
        radius: params.explosive.radius,
        damage: params.explosive.damage,
        detonated: false
      };
      data.explosivePayload = payload;
    } else {
      delete data.explosivePayload;
    }
  }
});

/**
 * Pool de balas del jugador para Hit&Run.
 * Resource key recomendado: "PlayerBulletPool".
 */
export class HitRunBulletPool extends ProjectilePool<any, HitRunBulletParams> {
  constructor(initialSize = 64) {
    super(poolHooks);
  }

  /**
   * Adquiere un proyectil con parámetros de arma completos.
   */
  public acquireBullet(world: World, params: HitRunBulletParams): Entity {
    return this.acquire(world, params);
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
