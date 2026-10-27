/**
 * Sumi-e / shan-shui aesthetic module.
 * Re-exports palette, theme and ink-wash background effect helpers.
 */

export {
  SUMI_E_PALETTE,
  SUMI_E_WINTER_PALETTE,
  SUMI_E_FOREST_PALETTE,
  getSumiEPalette,
  type SumiEPaletteTokens,
  type SumiEPaletteVariant
} from "./SumiEPalette";

export {
  getAestheticTheme,
  isSumiE,
  shouldUseInkWash,
  type AestheticId,
  type AestheticThemeConfig,
  type SumiELandscapeVariant
} from "./AestheticTheme";

export {
  createInkWashCanvasEffect,
  createInkWashSkiaEffect,
  INK_WASH_EFFECT_NAME,
  type InkWashEffectOptions
} from "./InkWashBackgroundEffect";

export {
  registerSumiEBackground,
  type RegisterSumiEBackgroundOptions
} from "./registerSumiEBackground";
