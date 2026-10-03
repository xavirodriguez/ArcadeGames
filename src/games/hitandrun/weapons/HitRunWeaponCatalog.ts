import type { HitRunWeaponDefinition, HitRunWeaponId } from "./HitRunWeaponTypes";

/**
 * Catálogo data-driven de armas Hit&Run.
 * Cambiar feel = editar números aquí; cero sistemas nuevos por arma.
 */
export const HIT_RUN_WEAPON_CATALOG: Record<HitRunWeaponId, HitRunWeaponDefinition> = {
  /**
   * Heavy Machine Gun — alta cadencia, micro-spread, recoil continuo.
   */
  hmg: {
    id: "hmg",
    cooldownDuration: 0.07,
    projectileSpeed: 560,
    projectileTtl: 0.85,
    projectileSize: 3.2,
    projectileColor: "#fbbf24",
    projectileShape: "bullet_hmg",
    damage: 1,
    damageCategory: "bullet",
    consumption: "destroy-entity",
    pelletCount: 1,
    spreadRadians: 0.055,
    muzzleOffset: 16,
    sfxName: "shoot",
    explosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    recoilImpulse: 14
  },

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
    spreadRadians: 0.45,
    muzzleOffset: 12,
    sfxName: "shoot",
    explosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    recoilImpulse: 40
  },

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
