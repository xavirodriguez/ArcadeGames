/**
 * Load theme fonts (D4 Option A).
 * Native: expo-font. Web: FontFace.
 * On failure → fall back to NEON_THEME_TYPOGRAPHY; never throw to the game loop.
 * Callers should await this before the first gameplay frame when using sumi-e.
 */

import {
  NEON_THEME_TYPOGRAPHY,
  SUMI_FONT_MANIFEST,
  SUMI_THEME_TYPOGRAPHY,
  setActiveThemeTypography,
  type ThemeTypography,
} from "./ThemeTypography";

export type ThemeFontLoadResult = {
  readonly ok: boolean;
  readonly typography: ThemeTypography;
  readonly loadedFamilies: readonly string[];
  readonly failedFamilies: readonly string[];
};

/**
 * Best-effort load of SUMI_FONT_MANIFEST.
 * Does not fetch remote files here — expects assets already bundled or
 * a host-provided loader. Wire expo-font / FontFace at the app shell.
 */
export async function loadSumiThemeFonts(
  loadFace?: (family: string, uri: string) => Promise<void>
): Promise<ThemeFontLoadResult> {
  const loaded: string[] = [];
  const failed: string[] = [];

  for (const entry of SUMI_FONT_MANIFEST) {
    const uri = entry.localPath ?? entry.source;
    try {
      if (loadFace) {
        await loadFace(entry.family, uri);
      }
      // Without a loader, treat as "declared only" — UI may still use CSS/Google Fonts.
      loaded.push(entry.family);
    } catch {
      failed.push(entry.family);
    }
  }

  if (failed.length === SUMI_FONT_MANIFEST.length) {
    setActiveThemeTypography(NEON_THEME_TYPOGRAPHY);
    return {
      ok: false,
      typography: NEON_THEME_TYPOGRAPHY,
      loadedFamilies: loaded,
      failedFamilies: failed,
    };
  }

  setActiveThemeTypography(SUMI_THEME_TYPOGRAPHY);
  return {
    ok: failed.length === 0,
    typography: SUMI_THEME_TYPOGRAPHY,
    loadedFamilies: loaded,
    failedFamilies: failed,
  };
}
