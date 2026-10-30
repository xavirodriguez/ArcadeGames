/**
 * Theme typography contract (roadmap + presentation).
 * D4 CLOSED — Option A:
 *   display / kanji → Yuji Boku
 *   body (es/gl)    → Noto Serif JP (system-ui fallback)
 *   mono            → current neon stack (monospace)
 */

/** Roadmap-aligned shape. */
export interface ThemeTypography {
  readonly display: string;
  readonly body: string;
  readonly mono: string;
}

/** Font manifest entry for loading (native expo-font / web FontFace). */
export interface ThemeFontManifestEntry {
  readonly family: string;
  readonly /** Logical role(s). */ roles: readonly ("display" | "body" | "mono" | "kanji")[];
  readonly /** Google Fonts family name or local file stem. */ source: string;
  readonly license: "OFL-1.1";
  /**
   * Path relative to repo root / public URL path for web.
   * Files live under `public/assets/fonts/` and are served at `/assets/fonts/...` on web.
   */
  readonly localPath?: string;
}

/**
 * Neon / default typography — visual stack unchanged:
 * `bold {size}px monospace`.
 */
export const NEON_THEME_TYPOGRAPHY: ThemeTypography = Object.freeze({
  display: "monospace",
  body: "monospace",
  mono: "monospace",
});

/**
 * Sumi-e typography — D4 Option A (confirmed).
 * display/kanji: Yuji Boku; body: Noto Serif JP with system-ui fallback.
 */
export const SUMI_THEME_TYPOGRAPHY: ThemeTypography = Object.freeze({
  display: "'Yuji Boku', 'Noto Serif JP', serif",
  body: "'Noto Serif JP', system-ui, 'Segoe UI', serif",
  mono: "'Share Tech Mono', monospace",
});

/** @deprecated Use SUMI_THEME_TYPOGRAPHY (D4 closed). */
export const SUMI_THEME_TYPOGRAPHY_PROVISIONAL = SUMI_THEME_TYPOGRAPHY;

/**
 * Fonts to load for sumi-e. Do not block the first game frame forever:
 * on failure, fall back to NEON_THEME_TYPOGRAPHY stacks (no throw).
 *
 * Bundled files: `public/assets/fonts/YujiBoku-Regular.ttf`,
 * `public/assets/fonts/NotoSerifJP-Regular.ttf`.
 */
export const SUMI_FONT_MANIFEST: readonly ThemeFontManifestEntry[] = Object.freeze([
  {
    family: "Yuji Boku",
    roles: ["display", "kanji"],
    source: "Yuji+Boku",
    license: "OFL-1.1",
    localPath: "public/assets/fonts/YujiBoku-Regular.ttf",
  },
  {
    family: "Noto Serif JP",
    roles: ["body"],
    source: "Noto+Serif+JP",
    license: "OFL-1.1",
    localPath: "public/assets/fonts/NotoSerifJP-Regular.ttf",
  },
]);

/** Five-step text scale mapped onto existing typography.sizes. */
export const THEME_TEXT_SCALE = Object.freeze({
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
} as const);

export type ThemeTextStep = keyof typeof THEME_TEXT_SCALE;

export function mapSizeToStep(px: number): ThemeTextStep {
  if (px <= 12) return "xs";
  if (px <= 14) return "sm";
  if (px <= 16) return "md";
  if (px <= 20) return "lg";
  return "xl";
}

/** Canvas font string for the active theme. */
export function canvasFontString(
  typography: ThemeTypography,
  sizePx: number,
  role: keyof ThemeTypography = "mono",
  weight: "normal" | "bold" = "bold"
): string {
  const family = typography[role] || typography.mono;
  return `${weight} ${Math.max(1, Math.round(sizePx))}px ${family}`;
}

/**
 * Active theme typography accessor for legacy DrawAdapter callers.
 * Until a session theme is injected, defaults to neon (no visual change).
 * Callers that know they are in sumi-e should pass SUMI_THEME_TYPOGRAPHY explicitly.
 */
let activeTypography: ThemeTypography = NEON_THEME_TYPOGRAPHY;

export function setActiveThemeTypography(t: ThemeTypography): void {
  activeTypography = t;
}

export function getActiveThemeTypography(): ThemeTypography {
  return activeTypography;
}
