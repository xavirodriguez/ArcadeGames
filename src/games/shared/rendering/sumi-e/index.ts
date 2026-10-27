/**
 * Sumi-e / shan-shui aesthetic module.
 * Re-exports palette, theme, ink-wash background, juice and shape drawers.
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

export {
  SUMI_E_PRIMITIVE_DEFAULTS,
  SUMI_E_JUICE_CATALOG,
  SUMI_E_FALLBACK_SHAPE,
  getSumiEJuiceProfile,
  type SumiEVFXPrimitiveName,
  type ExtendedVFXPrimitiveName
} from "./SumiEJuice";

export { registerSumiEVFX } from "./SumiEShapeDrawers";
