/**
 * Load theme fonts (D4 Option A).
 * Native: expo-font. Web: FontFace (files under public/assets/fonts).
 * On failure → fall back to NEON_THEME_TYPOGRAPHY; never throw to the game loop.
 * Callers should await this before the first gameplay frame when using sumi-e.
 */

import { Platform } from "react-native";
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

/** Metro-static requires so native bundles the TTF files. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YUJI_BOKU_MODULE = require("../../../../public/assets/fonts/YujiBoku-Regular.ttf");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NOTO_SERIF_JP_MODULE = require("../../../../public/assets/fonts/NotoSerifJP-Regular.ttf");

const SUMI_FONT_MODULES: Record<string, number | string> = {
  "Yuji Boku": YUJI_BOKU_MODULE,
  "Noto Serif JP": NOTO_SERIF_JP_MODULE,
};

/**
 * Public URL path for web (Expo serves `public/` at site root).
 * `public/assets/fonts/Foo.ttf` → `/assets/fonts/Foo.ttf`
 */
function toWebFontUrl(localPath: string): string {
  const normalized = localPath.replace(/\\/g, "/");
  if (normalized.startsWith("public/")) {
    return `/${normalized.slice("public/".length)}`;
  }
  if (normalized.startsWith("/")) return normalized;
  return `/${normalized}`;
}

/**
 * Default loader: web FontFace + native expo-font with bundled modules.
 */
export async function defaultSumiFontLoader(
  family: string,
  localPath: string
): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof document === "undefined" || typeof FontFace === "undefined") {
      throw new Error("FontFace unavailable");
    }
    const url = toWebFontUrl(localPath);
    const face = new FontFace(family, `url(${url})`);
    const loaded = await face.load();
    (document.fonts as never as { add(f: FontFace): void }).add(loaded);
    return;
  }

  const mod = SUMI_FONT_MODULES[family];
  if (mod == null) {
    throw new Error(`No bundled module for font family: ${family}`);
  }
  const Font = await import("expo-font");
  await Font.loadAsync({ [family]: mod });
}

/**
 * Best-effort load of SUMI_FONT_MANIFEST.
 * When `loadFace` is omitted, uses {@link defaultSumiFontLoader}.
 */
export async function loadSumiThemeFonts(
  loadFace?: (family: string, uri: string) => Promise<void>
): Promise<ThemeFontLoadResult> {
  const loader = loadFace ?? defaultSumiFontLoader;
  const loaded: string[] = [];
  const failed: string[] = [];

  for (const entry of SUMI_FONT_MANIFEST) {
    const uri = entry.localPath ?? entry.source;
    try {
      await loader(entry.family, uri);
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
