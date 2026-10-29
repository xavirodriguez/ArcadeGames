import type { PresentationThemeTokens } from "../PresentationContracts";
import type { AestheticThemeConfig } from "../../rendering/sumi-e/AestheticTheme";
import { fonts, typography } from "../../../../theme/typography";
import { SUMI_THEME_TYPOGRAPHY, NEON_THEME_TYPOGRAPHY } from "../ThemeTypography";
import { spacing } from "../../../../theme/spacing";
import { radius } from "../../../../theme/radius";

/** Normalized theme tokens used by the renderer session and React UI together. */
export type AestheticPresentationTokens = PresentationThemeTokens<AestheticThemeConfig>;

/**
 * Adapts the existing aesthetic config into shared semantic roles.
 * Legacy cosmic/neon themes keep their existing colors; Sumi-e uses its canonical
 * semantic palette. The original config remains available in custom for migration.
 */
export function createAestheticPresentationTokens(
  aesthetic: AestheticThemeConfig
): AestheticPresentationTokens {
  const semantic = aesthetic.semanticTokens;

  return {
    colors: {
      background: semantic?.surface.paper ?? aesthetic.backgroundColor,
      surface: semantic?.ui.panel ?? semantic?.surface.paperLight ?? aesthetic.backgroundColor,
      textPrimary: semantic?.text.primary ?? aesthetic.foregroundColor,
      textSecondary: semantic?.text.secondary ?? aesthetic.foregroundColor,
      accent: semantic?.ui.seal ?? aesthetic.accentColor,
      player: semantic?.player.silhouette ?? aesthetic.foregroundColor,
      threat: semantic?.threat.body ?? aesthetic.accentColor,
      reward: semantic?.reward.primary ?? aesthetic.accentColor,
      danger: semantic?.threat.glow ?? aesthetic.accentColor,
      success: semantic?.landscape.safeGround ?? aesthetic.foregroundColor,
      warning: semantic?.reward.primary ?? aesthetic.accentColor,
      outline: semantic?.landscape.ink ?? aesthetic.foregroundColor
    },
    typography: aesthetic.semanticTokens
      ? {
          display: SUMI_THEME_TYPOGRAPHY.display,
          body: SUMI_THEME_TYPOGRAPHY.body,
          monospace: SUMI_THEME_TYPOGRAPHY.mono,
        }
      : {
          display: fonts.display ?? NEON_THEME_TYPOGRAPHY.display,
          body: fonts.ui ?? NEON_THEME_TYPOGRAPHY.body,
          monospace: fonts.data ?? typography.game ?? NEON_THEME_TYPOGRAPHY.mono,
        },
    layout: {
      spacing: {
        xs: spacing.xs,
        sm: spacing.sm,
        md: spacing.md,
        lg: spacing.lg,
        xl: spacing.xl
      },
      radius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        pill: radius.round
      }
    },
    custom: aesthetic
  };
}
