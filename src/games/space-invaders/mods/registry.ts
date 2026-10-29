import type { Theme } from "@tiny-aster/core";
import type { SpaceInvadersMod, SpaceInvadersModId, SpaceInvadersThemeModule, SpaceInvadersGameplayMod } from "./types";
import { createSpaceInvadersModFacade } from "./createVisualModFacade";
import { classicMod } from "./classic/ClassicMod";
import { nauticalMod } from "./nautical/NauticalMod";

const NAUTICAL_THEME_IDS = new Set(["aqui_hay_dragones", "nautical-chart"]);

/** Single canonical registry: each ID owns one bundle with independent theme/gameplay modules. */
const MODS: Record<SpaceInvadersModId, SpaceInvadersMod> = {
  classic: classicMod,
  nautical: nauticalMod
};

function resolveId(themeOrId?: Theme | string | null): SpaceInvadersModId {
  if (typeof themeOrId === "string") {
    return themeOrId === "nautical" || NAUTICAL_THEME_IDS.has(themeOrId) ? "nautical" : "classic";
  }
  const conceptId = themeOrId?.conceptPack?.id;
  return typeof conceptId === "string" && NAUTICAL_THEME_IDS.has(conceptId) ? "nautical" : "classic";
}

/** Resolve presentation from the one bundle registry, preserving legacy concept-pack aliases. */
export function resolveSpaceInvadersTheme(themeOrId?: Theme | string | null): SpaceInvadersThemeModule {
  const bundle = MODS[resolveId(themeOrId)];
  return bundle.theme ?? bundle;
}

/** Resolve gameplay systems from the same bundle registry. */
export function resolveSpaceInvadersGameplayMod(themeOrId?: Theme | string | null): SpaceInvadersGameplayMod {
  const bundle = MODS[resolveId(themeOrId)];
  return bundle.gameplay ?? bundle;
}

/** Backwards-compatible resolver for callers that consume the historical combined contract. */
export function resolveSpaceInvadersMod(themeOrId?: Theme | string | null): SpaceInvadersMod {
  return MODS[resolveId(themeOrId)];
}

/** Register a paired bundle or normalize a legacy flat mod in the same registry. */
export function registerSpaceInvadersMod(mod: SpaceInvadersMod): void {
  const theme = mod.theme ?? mod;
  const gameplay = mod.gameplay ?? mod;
  MODS[mod.id] = mod.theme && mod.gameplay ? mod : createSpaceInvadersModFacade(theme, gameplay);
}

export { MODS, classicMod, nauticalMod };
