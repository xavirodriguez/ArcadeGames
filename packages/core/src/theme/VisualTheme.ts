/**
 * Contrast hierarchy tokens defining background, gameplay world, entities, and visual effects depth.
 * @public
 */
export interface VisualThemeContrastHierarchy {
  /** Canvas or screen root background fill. */
  background: string;
  /** Primary playable corridor, tilemap, or field surface fill/border. */
  world: string;
  /** Player entity primary visual color. */
  player: string;
  /** Enemy or hazard entity primary visual color. */
  enemies: string;
  /** High-contrast particle, glow, beam, or explosion effect accent. */
  fx: string;
  /** Primary HUD or overlay UI accent. */
  ui: string;
}

/**
 * Basic shape tokens specifying entity geometry variants across rendering engines.
 * @public
 */
export interface VisualThemeShapeTokens {
  /** Player ship or avatar shape drawer key. */
  playerShape?: string;
  /** Enemy shape drawer key. */
  enemyShape?: string;
  /** Projectile shape drawer key. */
  projectileShape?: string;
  /** Particle geometry variant for procedural VFX. */
  particleShape?: "circle" | "polygon" | "shard";
}

/**
 * Formalized visual theme contract unifying design system color tokens, contrast hierarchy, and shape tokens.
 * @public
 */
export interface VisualTheme {
  /** Base palette color mappings. */
  palette: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  /** Core accent colors. */
  accentColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  /** Explicit contrast hierarchy for visual clarity. */
  contrastHierarchy: VisualThemeContrastHierarchy;
  /** Basic shape tokens for entity factory defaults. */
  shapeTokens?: VisualThemeShapeTokens;
}

/**
 * Core Solar Garden / Neon Deep Space base color palette tokens.
 * @public
 */
export const SOLAR_GARDEN_PALETTE = {
  background: "#050611",
  surface: "#14183A",
  primary: "#00E5FF",
  secondary: "#9D00FF",
  accent: "#FF2A6D",
  neutral: "#778DA9",
  ui: "#42F5FF",
} as const;

/**
 * Creates a default `VisualTheme` from accent color keys and optional shape parameters.
 * @public
 */
export function createVisualTheme(
  primaryColor: string = SOLAR_GARDEN_PALETTE.primary,
  secondaryColor: string = SOLAR_GARDEN_PALETTE.secondary,
  accentColor: string = SOLAR_GARDEN_PALETTE.accent,
  shapeTokens?: VisualThemeShapeTokens
): VisualTheme {
  return {
    palette: {
      background: SOLAR_GARDEN_PALETTE.background,
      surface: SOLAR_GARDEN_PALETTE.surface,
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      neutral: SOLAR_GARDEN_PALETTE.neutral,
    },
    accentColors: {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
    },
    contrastHierarchy: {
      background: SOLAR_GARDEN_PALETTE.background,
      world: SOLAR_GARDEN_PALETTE.surface,
      player: primaryColor,
      enemies: accentColor,
      fx: secondaryColor,
      ui: SOLAR_GARDEN_PALETTE.ui,
    },
    shapeTokens,
  };
}
