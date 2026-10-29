import type { Theme } from "@tiny-aster/core";
import type { FlappyThemeModule, FlappyThemeId } from "./types";
import { OFFICE_PAPER_THEME_ID } from "../theme/FlappyThemeShared";
import { neonThemeModule } from "./neon/NeonTheme";
import { officePaperThemeModule } from "./officePaper/OfficePaperTheme";

/** Single authoritative registry for Flappy presentation modules. */
const THEMES: Record<FlappyThemeId, FlappyThemeModule> = {
  neon: neonThemeModule,
  [OFFICE_PAPER_THEME_ID]: officePaperThemeModule
};

function resolveThemeId(themeOrId?: Theme | string | null): FlappyThemeId {
  if (typeof themeOrId === "string") {
    return themeOrId === OFFICE_PAPER_THEME_ID ? OFFICE_PAPER_THEME_ID : "neon";
  }
  const conceptId = themeOrId?.conceptPack?.id;
  return conceptId === OFFICE_PAPER_THEME_ID ? OFFICE_PAPER_THEME_ID : "neon";
}

/** Resolve the presentation module from concept-pack ID, Theme resource, or explicit id. */
export function resolveFlappyTheme(themeOrId?: Theme | string | null): FlappyThemeModule {
  return THEMES[resolveThemeId(themeOrId)];
}

/** @deprecated Prefer resolveFlappyTheme; kept for existing callers. */
export function resolveFlappyCanvasVisuals(packId?: string) {
  return resolveFlappyTheme(packId).canvas;
}

/** @deprecated Prefer resolveFlappyTheme; kept for existing callers. */
export function resolveFlappySkiaVisuals(packId?: string) {
  return resolveFlappyTheme(packId).skia;
}

export type { FlappyCanvasDrawers, FlappySkiaDrawers } from "./typesCompat";
export { neonThemeModule, officePaperThemeModule, THEMES };
