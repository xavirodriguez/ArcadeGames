import type { HitRunWeaponDefinition, HitRunWeaponId } from "./HitRunWeaponTypes";

/**
 * Catálogo data-driven de armas Hit&Run.
 * Cambiar feel = editar números aquí; cero sistemas nuevos por arma.
 */
export const HIT_RUN_WEAPON_CATALOG: Record<HitRunWeaponId, HitRunWeaponDefinition> = {
  /**
   * Heavy Machine Gun
   * Alta cadencia, hitbox pequeña, inercia (recoil) al disparar.
   */
  hmg: {
    id: "hmg",
    cooldownDuration: 0.08,
    projectileSpeed: 520,
    projectileTtl: 0.9,
    projectileSize: 3.5,
    projectileColor: "#fbbf24",
    projectileShape: "bullet_hmg",
    damage: 1,
    damageCategory: "bullet",
    consumption: "destroy-entity",
    pelletCount: 1,
    spreadRadians: 0,
    muzzleOffset: 14,
    sfxName: "shoot",
    explosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    recoilImpulse: 18
  },

  /**
   * Escopeta
   * Cono de pellets, consumption destroy-entity, alto daño + shake (category shotgun).
   */
  shotgun: {
    id: "shotgun",
    cooldownDuration: 0.55,
    projectileSpeed: 420,
    projectileTtl: 0.45,
    projectileSize: 4,
    projectileColor: "#fb923c",
    projectileShape: "bullet_shotgun",
    damage: 2,
    damageCategory: "shotgun",
    consumption: "destroy-entity",
    pelletCount: 5,
    spreadRadians: 0.45, // ~26° total
    muzzleOffset: 12,
    sfxName: "shoot",
    explosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    recoilImpulse: 40
  },

  /**
   * Lanzacohetes
   * Proyectil lento, consumption remove-component al impactar,
   * genera combat:explosion radial en cadena.
   */
  rocket: {
    id: "rocket",
    cooldownDuration: 1.1,
    projectileSpeed: 220,
    projectileTtl: 2.5,
    projectileSize: 7,
    projectileColor: "#ef4444",
    projectileShape: "bullet_rocket",
    damage: 3,
    damageCategory: "explosive",
    consumption: "remove-component",
    pelletCount: 1,
    spreadRadians: 0,
    muzzleOffset: 16,
    sfxName: "shoot",
    explosive: true,
    explosionRadius: 56,
    explosionDamage: 4,
    recoilImpulse: 28
  }
};

export function getWeaponDefinition(id: HitRunWeaponId): HitRunWeaponDefinition {
  return HIT_RUN_WEAPON_CATALOG[id];
}
