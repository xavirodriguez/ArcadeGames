/**
 * Solar Garden Art Direction Color Tokens and Derived Semantic Variants.
 */

export const SOLAR_GARDEN_THEME = {
  SOLAR_WHITE: "#F0F4F8",
  SOLAR_GOLD: "#E6B800",
  SOLAR_CYAN: "#00E5FF",

  GARDEN_GREEN: "#2D4534",

  BIO_BLACK: "#14181D",
  BIO_MAGENTA: "#FF007F",
  BIO_ACID: "#39FF14",

  THREAT_ORANGE: "#FF3B00",
} as const;

export type SolarGardenColorKey = keyof typeof SOLAR_GARDEN_THEME;

export const SOLAR_GARDEN_VARIANTS = {
  SOLAR_WHITE_DIM: "rgba(240, 244, 248, 0.65)",
  SOLAR_GOLD_GLOW: "rgba(230, 184, 0, 0.45)",
  SOLAR_CYAN_CORE: "#80F2FF",
  BIO_MAGENTA_GLOW: "rgba(255, 0, 127, 0.45)",
  BIO_ACID_GLOW: "rgba(57, 255, 20, 0.45)",
  THREAT_ORANGE_CORE: "#FF7A50",
  THREAT_ORANGE_SHELL: "#14181D",
} as const;

export type SolarGardenVariantKey = keyof typeof SOLAR_GARDEN_VARIANTS;
