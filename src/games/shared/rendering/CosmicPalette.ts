import { Skia } from "./SkiaContext";

/**
 * Global Cosmic Arcade Palette for TinyAster games.
 * Establishes the "Neon Deep Space Arcade" visual direction.
 * @public
 */
export const COSMIC_ARCADE_PALETTE = {
  voidBlack: "#050611",
  deepSpace: "#0B1026",
  cosmicNavy: "#14183A",
  nebulaPurple: "#32205F",
  electricIndigo: "#5546D9",

  neonCyan: "#42F5FF",
  iceBlue: "#B8FAFF",
  neonMagenta: "#FF3DBB",
  solarOrange: "#FF9B3D",
  plasmaYellow: "#FFE66D",
  alienGreen: "#7CFF8A",
  dangerRed: "#FF4567",

  white: "#F4FCFF",
  mutedBlue: "#6474A8",
  mutedPurple: "#7568A8",

  // Specific environment accents
  stationSteel: "#778DA9",
  stationPanels: "#1B263B",
  matrixGreen: "#00FF41",
  crtScanline: "rgba(0, 0, 0, 0.15)",
  goldenRing: "#D4AF37",
  goldenRingHighlight: "#F3E5AB"
} as const;

export type CosmicPaletteColorKey = keyof typeof COSMIC_ARCADE_PALETTE;

export type SemanticRole =
  | "background"
  | "environment"
  | "player"
  | "enemy"
  | "projectile"
  | "explosion"
  | "reward"
  | "warning"
  | "boss"
  | "ui"
  | "station"
  | "matrix"
  | "shockwave"
  | "crt";

export type IntensityVariant = "dim" | "base" | "bright" | "highlight" | "glow";

/**
 * Mapping of semantic roles to primary palette colors.
 */
export const SEMANTIC_ROLE_MAP: Record<SemanticRole, { primary: string; secondary: string; accent: string }> = {
  background: {
    primary: COSMIC_ARCADE_PALETTE.voidBlack,
    secondary: COSMIC_ARCADE_PALETTE.deepSpace,
    accent: COSMIC_ARCADE_PALETTE.cosmicNavy
  },
  environment: {
    primary: COSMIC_ARCADE_PALETTE.nebulaPurple,
    secondary: COSMIC_ARCADE_PALETTE.electricIndigo,
    accent: COSMIC_ARCADE_PALETTE.mutedBlue
  },
  player: {
    primary: COSMIC_ARCADE_PALETTE.neonCyan,
    secondary: COSMIC_ARCADE_PALETTE.iceBlue,
    accent: COSMIC_ARCADE_PALETTE.white
  },
  enemy: {
    primary: COSMIC_ARCADE_PALETTE.neonMagenta,
    secondary: COSMIC_ARCADE_PALETTE.electricIndigo,
    accent: COSMIC_ARCADE_PALETTE.solarOrange
  },
  projectile: {
    primary: COSMIC_ARCADE_PALETTE.neonCyan,
    secondary: COSMIC_ARCADE_PALETTE.solarOrange,
    accent: COSMIC_ARCADE_PALETTE.iceBlue
  },
  explosion: {
    primary: COSMIC_ARCADE_PALETTE.solarOrange,
    secondary: COSMIC_ARCADE_PALETTE.plasmaYellow,
    accent: COSMIC_ARCADE_PALETTE.dangerRed
  },
  reward: {
    primary: COSMIC_ARCADE_PALETTE.plasmaYellow,
    secondary: COSMIC_ARCADE_PALETTE.alienGreen,
    accent: COSMIC_ARCADE_PALETTE.white
  },
  warning: {
    primary: COSMIC_ARCADE_PALETTE.solarOrange,
    secondary: COSMIC_ARCADE_PALETTE.dangerRed,
    accent: COSMIC_ARCADE_PALETTE.plasmaYellow
  },
  boss: {
    primary: COSMIC_ARCADE_PALETTE.dangerRed,
    secondary: COSMIC_ARCADE_PALETTE.neonMagenta,
    accent: COSMIC_ARCADE_PALETTE.plasmaYellow
  },
  ui: {
    primary: COSMIC_ARCADE_PALETTE.iceBlue,
    secondary: COSMIC_ARCADE_PALETTE.neonCyan,
    accent: COSMIC_ARCADE_PALETTE.white
  },
  station: {
    primary: COSMIC_ARCADE_PALETTE.stationPanels,
    secondary: COSMIC_ARCADE_PALETTE.stationSteel,
    accent: COSMIC_ARCADE_PALETTE.neonCyan
  },
  matrix: {
    primary: COSMIC_ARCADE_PALETTE.matrixGreen,
    secondary: COSMIC_ARCADE_PALETTE.alienGreen,
    accent: COSMIC_ARCADE_PALETTE.white
  },
  shockwave: {
    primary: COSMIC_ARCADE_PALETTE.solarOrange,
    secondary: COSMIC_ARCADE_PALETTE.plasmaYellow,
    accent: COSMIC_ARCADE_PALETTE.dangerRed
  },
  crt: {
    primary: COSMIC_ARCADE_PALETTE.crtScanline,
    secondary: "rgba(66, 245, 255, 0.05)",
    accent: "rgba(255, 255, 255, 0.1)"
  }
};

/**
 * Converts a hex color string to RGBA format with custom alpha for Canvas2D.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

/**
 * Converts a hex color string to #RRGGBBAA hex format for Skia.
 */
export function hexToHexAlpha(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${cleanHex.substring(0, 6)}${alphaHex}`;
}

/**
 * Resolves a semantic role and intensity variant into a canvas-ready color string.
 */
export function getSemanticColor(
  role: SemanticRole,
  variant: IntensityVariant = "base",
  customAlpha?: number
): string {
  const roleColors = SEMANTIC_ROLE_MAP[role];
  let baseColor: string = roleColors.primary;

  switch (variant) {
    case "dim":
      return hexToRgba(baseColor, customAlpha ?? 0.4);
    case "glow":
      return hexToRgba(baseColor, customAlpha ?? 0.25);
    case "bright":
      baseColor = roleColors.secondary;
      return customAlpha !== undefined ? hexToRgba(baseColor, customAlpha) : baseColor;
    case "highlight":
      baseColor = roleColors.accent;
      return customAlpha !== undefined ? hexToRgba(baseColor, customAlpha) : baseColor;
    case "base":
    default:
      return customAlpha !== undefined ? hexToRgba(baseColor, customAlpha) : baseColor;
  }
}

/**
 * Resolves a Skia color object for a given hex or semantic color.
 */
export function getSkiaColor(hexOrSemantic: string, alpha?: number): unknown {
  if (!Skia) return null;
  const colorStr = hexOrSemantic.startsWith("#")
    ? (alpha !== undefined ? hexToHexAlpha(hexOrSemantic, alpha) : hexOrSemantic)
    : hexOrSemantic;
  return Skia.Color(colorStr);
}
