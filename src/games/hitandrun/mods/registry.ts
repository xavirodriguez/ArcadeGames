import type { HitAndRunThemeModule, HitAndRunThemeId } from "./types";
import { fantasyThemeModule } from "./fantasy/FantasyThemeModule";
import { sumiEThemeModule } from "./sumi-e/SumiEThemeModule";
import { ThemeRegistry, resolveThemeIdFromConfig } from "../rendering/theme/ThemeRegistry";

const THEMES: Record<HitAndRunThemeId, HitAndRunThemeModule> = {
  fantasy: fantasyThemeModule,
  "sumi-e": sumiEThemeModule
};

function asThemeId(raw: string | undefined | null): HitAndRunThemeId {
  if (raw === "sumi-e") return "sumi-e";
  return "fantasy";
}

/** Pure resolver: selecting metadata does not mutate the currently active theme. */
export function resolveHitAndRunTheme(themeOrId?: string | null): HitAndRunThemeModule {
  const raw = themeOrId ?? resolveThemeIdFromConfig(undefined);
  return THEMES[asThemeId(raw)];
}

/** The single production entry point for changing Hit & Run's active renderer theme. */
export function activateHitAndRunTheme(themeOrId?: string | null): HitAndRunThemeModule {
  const themeModule = resolveHitAndRunTheme(themeOrId);
  ThemeRegistry.setActiveTheme(themeModule.id);
  return themeModule;
}

export { fantasyThemeModule, sumiEThemeModule, THEMES };
