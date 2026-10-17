import { semanticColors, colors } from "./colors";

/**
 * Unified semantic role categories across TinyAster games.
 * @public
 */
export type SystemSemanticRole = "system" | "warning" | "success" | "danger";
export type EntitySemanticRole = "player" | "enemy" | "boss" | "projectile" | "reward" | "obstacle";
export type EnvironmentSemanticRole = "road" | "sky_top" | "sky_bottom" | "terrain" | "horizon" | "grid";
export type PostFXSemanticRole = "vignette" | "scanline" | "glow" | "ambient";
export type LegacySemanticRole = "background" | "environment" | "station" | "matrix" | "shockwave" | "crt" | "ui" | "explosion" | "ally" | "buff";

export type SemanticRole =
  | SystemSemanticRole
  | EntitySemanticRole
  | EnvironmentSemanticRole
  | PostFXSemanticRole
  | LegacySemanticRole;

export type IntensityVariant = "dim" | "base" | "bright" | "highlight" | "glow";

/**
 * Mapping of semantic roles to default palette token combinations.
 */
export const DEFAULT_SEMANTIC_ROLE_MAP: Record<SemanticRole, { primary: string; secondary: string; accent: string }> = {
  // System & HUD
  system: { primary: semanticColors.system, secondary: colors.cyan, accent: colors.white },
  warning: { primary: semanticColors.warning, secondary: colors.amber, accent: colors.yellow },
  success: { primary: semanticColors.success, secondary: colors.green, accent: colors.white },
  danger: { primary: semanticColors.danger, secondary: colors.redHot, accent: colors.orange },

  // Entities
  player: { primary: semanticColors.system, secondary: colors.blueLight, accent: colors.white },
  enemy: { primary: semanticColors.enemy, secondary: colors.magenta, accent: colors.pink },
  boss: { primary: semanticColors.boss, secondary: colors.gold, accent: colors.amber },
  projectile: { primary: colors.cyan, secondary: colors.gold, accent: colors.white },
  reward: { primary: colors.gold, secondary: colors.green, accent: colors.white },
  obstacle: { primary: colors.slate, secondary: colors.borderLight, accent: colors.borderDark },

  // Environment
  road: { primary: colors.surface, secondary: colors.borderDark, accent: colors.borderLight },
  sky_top: { primary: semanticColors.background.dark, secondary: semanticColors.background.default, accent: semanticColors.background.slate },
  sky_bottom: { primary: semanticColors.background.default, secondary: semanticColors.background.slate, accent: colors.surface },
  terrain: { primary: semanticColors.background.slate, secondary: colors.surface, accent: colors.borderDark },
  horizon: { primary: colors.cyan, secondary: colors.magenta, accent: colors.gold },
  grid: { primary: colors.border, secondary: colors.borderDark, accent: colors.borderLight },

  // Post-FX
  vignette: { primary: semanticColors.background.overlay, secondary: semanticColors.background.panel, accent: semanticColors.background.default },
  scanline: { primary: colors.overlay, secondary: colors.border, accent: colors.white },
  glow: { primary: colors.cyan, secondary: colors.pink, accent: colors.gold },
  ambient: { primary: semanticColors.background.panel, secondary: semanticColors.background.dark, accent: semanticColors.background.slate },

  // Legacy
  background: { primary: semanticColors.background.default, secondary: semanticColors.background.dark, accent: semanticColors.background.slate },
  environment: { primary: colors.purple, secondary: colors.violet, accent: colors.slate },
  station: { primary: colors.surface, secondary: colors.slate, accent: colors.cyan },
  matrix: { primary: semanticColors.ally, secondary: colors.green, accent: colors.white },
  shockwave: { primary: colors.orange, secondary: colors.yellow, accent: colors.danger },
  crt: { primary: colors.overlay, secondary: colors.border, accent: colors.white },
  ui: { primary: colors.neutral, secondary: colors.cyan, accent: colors.white },
  explosion: { primary: colors.orange, secondary: colors.yellow, accent: colors.danger },
  ally: { primary: semanticColors.ally, secondary: colors.green, accent: colors.white },
  buff: { primary: semanticColors.buff, secondary: colors.cyan, accent: colors.white },
};
