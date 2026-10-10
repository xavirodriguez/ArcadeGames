import { World, CoreComponentRegistry } from "@tiny-aster/core";
import type { HitRunWeaponDefinition, HitRunBulletParams } from "./HitRunWeaponTypes";
import type { HitRunBulletPool } from "./HitRunBulletPool";

export interface FireWeaponArgs {
  world: World<CoreComponentRegistry>;
  shooterEntity: number;
  /** Origen del cañón en world space. */
  originX: number;
  originY: number;
  /** Dirección normalizada de apuntado. */
  dirX: number;
  dirY: number;
  weapon: HitRunWeaponDefinition;
  /** Si se omite, se lee world.getResource("PlayerBulletPool"). */
  pool?: HitRunBulletPool;
}

/**
 * Dispara un arma data-driven.
 * - HMG: 1 bala, recoil opcional en el caller.
 * - Shotgun: N pellets en cono (spreadRadians).
 * - Rocket: 1 proyectil lento + ExplosivePayload.
 *
 * Determinismo: el spread usa índices fijos (sin random).
 * Para spread "orgánico" determinista, pasar un seed y usar gameplayRandom en el caller.
 *
 * @returns número de proyectiles spawneados
 */
export function fireWeapon(args: FireWeaponArgs): number {
  const { world, shooterEntity, originX, originY, weapon } = args;
  let { dirX, dirY } = args;

  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len < 1e-6) {
    dirX = 1;
    dirY = 0;
  } else {
    dirX /= len;
    dirY /= len;
  }

  const pool =
    args.pool ?? world.getResource<HitRunBulletPool>("PlayerBulletPool");
  if (!pool) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[fireWeapon] PlayerBulletPool resource missing");
    }
    return 0;
  }

  const count = Math.max(1, weapon.pelletCount);
  const spread = weapon.spreadRadians;
  const baseAngle = Math.atan2(dirY, dirX);

  const shooterElevation = world.getComponent(shooterEntity, "BeltElevation") as
    | { z?: number }
    | undefined;
  const shooterZ = shooterElevation?.z ?? 0;

  let spawned = 0;

  for (let i = 0; i < count; i++) {
    // Distribución simétrica centrada en el aim (determinista, sin random)
    let angle = baseAngle;
    if (count > 1 && spread > 0) {
      const t = count === 1 ? 0.5 : i / (count - 1); // 0..1
      angle = baseAngle - spread * 0.5 + spread * t;
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const mx = originX + cos * weapon.muzzleOffset;
    const my = originY + sin * weapon.muzzleOffset;
    const vx = cos * weapon.projectileSpeed;
    const vy = sin * weapon.projectileSpeed;

    const params: HitRunBulletParams = {
      x: mx,
      y: my,
      dx: vx,
      dy: vy,
      z: shooterZ + 16,
      size: weapon.projectileSize,
      color: weapon.projectileColor,
      ttl: weapon.projectileTtl,
      shape: weapon.projectileShape,
      damageAmount: weapon.damage,
      damageCategory: weapon.damageCategory,
      consumption: weapon.consumption,
      rotation: angle,
      sourceEntity: shooterEntity
    };

    if (weapon.explosive) {
      params.explosive = {
        radius: weapon.explosionRadius,
        damage: weapon.explosionDamage
      };
    }

    pool.acquireBullet(world, params);
    spawned++;
  }

  // SFX solo fuera de re-sim
  if (!world.isReSimulating && weapon.sfxName) {
    const bus = world.getEventBus();
    if (bus) {
      bus.emit("PlaySFX", { name: weapon.sfxName });
    }
  }

  return spawned;
}

/**
 * Aplica recoil horizontal opuesto a la dirección de disparo (inercia HMG/escopeta).
 * Mutación diferida-safe vía getMutableComponent en Velocity del shooter.
 */
export function applyRecoil(
  world: World<CoreComponentRegistry>,
  shooterEntity: number,
  dirX: number,
  dirY: number,
  impulse: number
): void {
  if (impulse <= 0) return;
  if (!world.hasComponent(shooterEntity, "Velocity")) return;

  const vel = world.getMutableComponent(shooterEntity, "Velocity");
  if (!vel) return;

  const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
  vel.vx -= (dirX / len) * impulse;
  vel.vy -= (dirY / len) * impulse;
}
