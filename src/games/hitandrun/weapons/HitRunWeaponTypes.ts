import type { Entity } from "@tiny-aster/core";
import type { DamageConsumptionPolicy } from "@tiny-aster/gameplay-kit";

/** Identificadores de arma de Hit&Run. */
export type HitRunWeaponId = "hmg" | "shotgun" | "rocket" | "longbow" | "rune_scatter" | "fire_staff" | "crossbow" | string;

export interface HitRunWeaponDefinition {
  id: HitRunWeaponId;
  cooldownDuration: number;
  projectileSpeed: number;
  projectileTtl: number;
  projectileSize: number;
  projectileColor: string;
  projectileShape: string;
  damage: number;
  damageCategory: string;
  consumption: DamageConsumptionPolicy;
  pelletCount: number;
  spreadRadians: number;
  muzzleOffset: number;
  sfxName: string;
  explosive: boolean;
  explosionRadius: number;
  explosionDamage: number;
  recoilImpulse: number;
}

export interface HitRunBulletParams {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  ttl: number;
  shape?: string;
  layer?: number;
  mask?: number;
  damageAmount: number;
  damageCategory: string;
  consumption: DamageConsumptionPolicy;
  explosive?: {
    radius: number;
    damage: number;
  };
  rotation?: number;
  sourceEntity?: Entity;
}

export interface ExplosivePayloadComponent {
  type: "ExplosivePayload";
  radius: number;
  damage: number;
  detonated: boolean;
}

export interface CombatExplosionPayload {
  x: number;
  y: number;
  radius: number;
  damage: number;
  sourceEntity?: Entity;
  projectileEntity?: Entity;
  category: string;
}

export interface HitRunWeaponState {
  type: "HitRunWeapon";
  weaponId: HitRunWeaponId;
  cooldownRemaining: number;
  /** Presentación: frames restantes de muzzle flash (no afecta sim neta). */
  muzzleFlashRemaining?: number;
}
