import { colors, semanticColors } from "./colors";
import {
  SOLAR_GARDEN_PALETTE,
  VisualThemeContrastHierarchy,
  VisualThemeShapeTokens,
  VisualTheme,
} from "@tiny-aster/core";

export { SOLAR_GARDEN_PALETTE };
export type { VisualThemeContrastHierarchy, VisualThemeShapeTokens, VisualTheme };

/**
 * Creates a default `VisualTheme` from accent color keys and optional shape parameters.
 * @public
 */
export function createVisualTheme(
  primaryColor: string = colors.cyan,
  secondaryColor: string = colors.purple,
  accentColor: string = colors.pink,
  shapeTokens?: VisualThemeShapeTokens
): VisualTheme {
  return {
    palette: {
      background: semanticColors.background.default,
      surface: semanticColors.background.panel,
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      neutral: colors.neutral,
    },
    accentColors: {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
    },
    contrastHierarchy: {
      background: semanticColors.background.default,
      world: semanticColors.background.slate,
      player: primaryColor,
      enemies: accentColor,
      fx: secondaryColor,
      ui: semanticColors.system,
    },
    shapeTokens,
  };
}
