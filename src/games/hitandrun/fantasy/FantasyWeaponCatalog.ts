/**
 * Fantasy-flavored weapon definitions.
 * Delegates base weapon attributes to HitRunWeaponCatalog and overrides theme colors.
 */

import type { HitRunWeaponDefinition } from "../weapons/HitRunWeaponTypes";
import { HIT_RUN_WEAPON_CATALOG } from "../weapons/HitRunWeaponCatalog";
import { FANTASY_PALETTE } from "./FantasyPalette";

export const FANTASY_WEAPON_CATALOG: Record<string, HitRunWeaponDefinition> = {
  longbow: {
    ...HIT_RUN_WEAPON_CATALOG.longbow,
    projectileColor: FANTASY_PALETTE.arrow
  },
  rune_scatter: {
    ...HIT_RUN_WEAPON_CATALOG.rune_scatter,
    projectileColor: FANTASY_PALETTE.arcane
  },
  fire_staff: {
    ...HIT_RUN_WEAPON_CATALOG.fire_staff,
    projectileColor: FANTASY_PALETTE.fireball
  },
  crossbow: {
    ...HIT_RUN_WEAPON_CATALOG.crossbow,
    projectileColor: FANTASY_PALETTE.bolt
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
