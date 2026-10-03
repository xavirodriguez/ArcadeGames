/**
 * Fantasy-flavored weapon definitions.
 * Same shape as HitRunWeaponCatalog so existing fire/weapon systems keep working.
 */

import type { HitRunWeaponDefinition } from "../weapons/HitRunWeaponTypes";
import { FANTASY_PALETTE } from "./FantasyPalette";

export const FANTASY_WEAPON_CATALOG: Record<string, HitRunWeaponDefinition> = {
  longbow: {
    id: "longbow",
    cooldownDuration: 0.28,
    projectileSpeed: 480,
    projectileTtl: 1.2,
    projectileSize: 3.5,
    projectileColor: FANTASY_PALETTE.arrow,
    projectileShape: "arrow",
    damage: 1,
    damageCategory: "bullet",
    consumption: "destroy-entity",
    pelletCount: 1,
    spreadRadians: 0,
    muzzleOffset: 16,
    sfxName: "shoot",
    explosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    recoilImpulse: 12
  },
  rune_scatter: {
    id: "rune_scatter",
    cooldownDuration: 0.6,
    projectileSpeed: 400,
    projectileTtl: 0.4,
    projectileSize: 4,
    projectileColor: FANTASY_PALETTE.arcane,
    projectileShape: "bolt",
    damage: 2,
    damageCategory: "shotgun",
    consumption: "destroy-entity",
    pelletCount: 5,
    spreadRadians: 0.42,
    muzzleOffset: 14,
    sfxName: "shoot",
    explosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    recoilImpulse: 36
  },
  fire_staff: {
    id: "fire_staff",
    cooldownDuration: 1.15,
    projectileSpeed: 200,
    projectileTtl: 2.2,
    projectileSize: 8,
    projectileColor: FANTASY_PALETTE.fireball,
    projectileShape: "fireball",
    damage: 3,
    damageCategory: "explosive",
    consumption: "remove-component",
    pelletCount: 1,
    spreadRadians: 0,
    muzzleOffset: 18,
    sfxName: "shoot",
    explosive: true,
    explosionRadius: 58,
    explosionDamage: 4,
    recoilImpulse: 28
  },
  crossbow: {
    id: "crossbow",
    cooldownDuration: 0.75,
    projectileSpeed: 520,
    projectileTtl: 1.4,
    projectileSize: 4.5,
    projectileColor: FANTASY_PALETTE.bolt,
    projectileShape: "bolt",
    damage: 3,
    damageCategory: "bullet",
    consumption: "destroy-entity",
    pelletCount: 1,
    spreadRadians: 0,
    muzzleOffset: 15,
    sfxName: "shoot",
    explosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    recoilImpulse: 22
  }
};

export const FANTASY_WEAPON_ALIASES: Record<string, string> = {
  hmg: "longbow",
  shotgun: "rune_scatter",
  rocket: "fire_staff"
};

export function resolveFantasyWeaponId(id: string): string {
  return FANTASY_WEAPON_ALIASES[id] ?? id;
}
