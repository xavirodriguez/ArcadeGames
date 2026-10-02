import type { Entity } from "@tiny-aster/core";
import type { DamageConsumptionPolicy } from "@tiny-aster/gameplay-kit";

/** Identificadores de arma de Hit&Run. */
export type HitRunWeaponId = "hmg" | "shotgun" | "rocket";

/**
 * Definición data-driven de un arma.
 * El CombatSystem no se toca: solo se rellenan componentes al spawnear proyectiles.
 */
export interface HitRunWeaponDefinition {
  id: HitRunWeaponId;
  /** Segundos entre disparos (cooldown base). */
  cooldownDuration: number;
  /** Velocidad del proyectil (px/s). */
  projectileSpeed: number;
  /** TTL del proyectil (s). */
  projectileTtl: number;
  /** Radio visual / collider del proyectil. */
  projectileSize: number;
  /** Color de render. */
  projectileColor: string;
  /** Shape de render (drawer key). */
  projectileShape: string;
  /** Daño por proyectil (DamageComponent.amount). */
  damage: number;
  /**
   * Category → HitRunFeedbackSystem profiles
   * ("bullet" | "shotgun" | "explosive" | …).
   */
  damageCategory: string;
  /** Política de consumo post-hit (DamageComponent.consumption). */
  consumption: DamageConsumptionPolicy;
  /** Nº de proyectiles por disparo (escopeta = cono). */
  pelletCount: number;
  /** Apertura total del cono en radianes (0 = disparo único). */
  spreadRadians: number;
  /** Offset de spawn desde el jugador (evita overlap inmediato). */
  muzzleOffset: number;
  /** SFX name (PlaySFX). */
  sfxName: string;
  /**
   * Si true, el proyectil lleva ExplosivePayload y al impactar
   * dispara la cadena combat:explosion.
   */
  explosive: boolean;
  /** Radio de la explosión (solo si explosive). */
  explosionRadius: number;
  /** Daño de la explosión por entidad en radio (solo si explosive). */
  explosionDamage: number;
  /** Inercia / knockback horizontal aplicado al jugador al disparar (HMG recoil). */
  recoilImpulse: number;
}

/** Parámetros de acquire del PlayerBulletPool. */
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
  /** Override de daño para este proyectil. */
  damageAmount: number;
  damageCategory: string;
  consumption: DamageConsumptionPolicy;
  /** Carga explosiva opcional (cohete). */
  explosive?: {
    radius: number;
    damage: number;
  };
  /** Rotación visual (radianes). */
  rotation?: number;
  /** Dueño / source para faction y event payloads. */
  sourceEntity?: Entity;
}

/**
 * Componente de carga explosiva en el proyectil.
 * No forma parte del core: se registra solo en Hit&Run.
 */
export interface ExplosivePayloadComponent {
  type: "ExplosivePayload";
  radius: number;
  damage: number;
  /** Evita doble detonación en el mismo tick. */
  detonated: boolean;
}

/** Payload de combat:explosion (cadena radial). */
export interface CombatExplosionPayload {
  x: number;
  y: number;
  radius: number;
  damage: number;
  sourceEntity?: Entity;
  /** Entidad del proyectil que detonó (puede ya no tener Damage). */
  projectileEntity?: Entity;
  category: string;
}

/** Estado de arma equipada en el jugador. */
export interface HitRunWeaponState {
  type: "HitRunWeapon";
  weaponId: HitRunWeaponId;
  cooldownRemaining: number;
}
