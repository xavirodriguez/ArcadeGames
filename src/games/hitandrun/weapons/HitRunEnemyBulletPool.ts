import {
  World,
  Entity,
  ProjectilePool
} from "@tiny-aster/core";
import { createProjectilePoolConfig } from "@tiny-aster/gameplay-kit";
import type { HitRunBulletParams } from "./HitRunWeaponTypes";

export const HIT_RUN_ENEMY_BULLET_LAYER = 1 << 5;
export const HIT_RUN_PLAYER_LAYER = 1;

const enemyPoolHooks = createProjectilePoolConfig<HitRunBulletParams>({
  shape: "enemy_bullet",
  layer: HIT_RUN_ENEMY_BULLET_LAYER,
  mask: HIT_RUN_PLAYER_LAYER,
  poolId: "EnemyBulletPool",
  damageCategory: "enemy_bullet",
  faction: "enemy",
  isTrigger: true,
  order: 4,
  bulletType: "EnemyBullet",
  extraComponents: (data, params) => {
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

    const renderComp = data.render as { shape?: string; color?: string } | undefined;
    if (renderComp) {
      if (params.shape) renderComp.shape = params.shape;
      if (params.color) renderComp.color = params.color;
    }

    const posComp = data.position as { rotation?: number; worldRotation?: number } | undefined;
    if (params.rotation !== undefined && posComp) {
      posComp.rotation = params.rotation;
      posComp.worldRotation = params.rotation;
    }
  }
});

export class HitRunEnemyBulletPool extends ProjectilePool<any, HitRunBulletParams> {
  constructor(initialSize = 128) {
    super(enemyPoolHooks);
  }

  public acquireBullet(world: World, params: HitRunBulletParams): Entity {
    const entity = this.acquire(world, params);
    const z = params.z ?? 16;
    const elev = {
      type: "BeltElevation",
      z,
      vz: 0,
      grounded: true
    };

    if (world.isUpdating) {
      world.commands.addComponent(entity, elev);
    } else {
      world.addComponent(entity, elev);
    }

    return entity;
  }
}

export function registerEnemyBulletPool(
  world: World,
  initialSize = 128
): HitRunEnemyBulletPool {
  const existing = world.getResource<HitRunEnemyBulletPool>("EnemyBulletPool");
  if (existing) return existing;

  const pool = new HitRunEnemyBulletPool(initialSize);
  world.setResource("EnemyBulletPool", pool);
  return pool;
}
