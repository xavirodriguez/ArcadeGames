import type { Theme } from "@tiny-aster/core";
import type { SpaceInvadersMod, SpaceInvadersModId, SpaceInvadersThemeModule, SpaceInvadersGameplayMod } from "./types";
import { createSpaceInvadersModFacade } from "./createVisualModFacade";
import { classicTheme } from "./classic/ClassicTheme";
import { classicGameplayMod } from "./classic/ClassicGameplayMod";
import { nauticalTheme } from "./nautical/NauticalTheme";
import { nauticalGameplayMod } from "./nautical/NauticalGameplayMod";
import { classicMod } from "./classic/ClassicMod";
import { nauticalMod } from "./nautical/NauticalMod";

const NAUTICAL_THEME_IDS = new Set(["aqui_hay_dragones", "nautical-chart"]);

const THEME_MODULES: Record<SpaceInvadersModId, SpaceInvadersThemeModule> = {
  classic: classicTheme,
  nautical: nauticalTheme
};
const GAMEPLAY_MODULES: Record<SpaceInvadersModId, SpaceInvadersGameplayMod> = {
  classic: classicGameplayMod,
  nautical: nauticalGameplayMod
};
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

/** Resolve just the presentation module, preserving legacy concept-pack aliases. */
export function resolveSpaceInvadersTheme(themeOrId?: Theme | string | null): SpaceInvadersThemeModule {
  return THEME_MODULES[resolveId(themeOrId)];
}

/** Resolve simulation systems independently from the renderer. */
export function resolveSpaceInvadersGameplayMod(themeOrId?: Theme | string | null): SpaceInvadersGameplayMod {
  return GAMEPLAY_MODULES[resolveId(themeOrId)];
}

/** Backwards-compatible resolver for callers that consume the historical combined contract. */
export function resolveSpaceInvadersMod(themeOrId?: Theme | string | null): SpaceInvadersMod {
  return MODS[resolveId(themeOrId)];
}

export function registerSpaceInvadersMod(mod: SpaceInvadersMod): void {
  const theme = mod.theme ?? mod;
  const gameplay = mod.gameplay ?? mod;
  THEME_MODULES[mod.id] = theme;
  GAMEPLAY_MODULES[mod.id] = gameplay;
  MODS[mod.id] = mod.theme && mod.gameplay ? mod : createSpaceInvadersModFacade(theme, gameplay);
}

export { MODS, classicMod, nauticalMod, classicTheme, nauticalTheme, classicGameplayMod, nauticalGameplayMod };
