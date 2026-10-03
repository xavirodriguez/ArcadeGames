import type { Entity } from "@tiny-aster/core";
import type { DamageConsumptionPolicy } from "@tiny-aster/gameplay-kit";

/** Identificadores de arma de Hit&Run (+ fantasy). */
export type HitRunWeaponId =
  | "hmg"
  | "shotgun"
  | "rocket"
  | "longbow"
  | "rune_scatter"
  | "fire_staff"
  | "crossbow"
  | string;

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
  speed: number;
  ttl: number;
  size: number;
  color: string;
  shape: string;
  damage: number;
  damageCategory: string;
  consumption: DamageConsumptionPolicy;
  ownerEntity: Entity;
  explosive?: boolean;
  explosionRadius?: number;
  explosionDamage?: number;
}

export interface HitRunWeaponState {
  type: "HitRunWeapon";
  weaponId: HitRunWeaponId;
  cooldownRemaining: number;
}

export interface ExplosivePayloadComponent {
  type: "ExplosivePayload";
  radius: number;
  damage: number;
  ownerEntity: Entity;
}
