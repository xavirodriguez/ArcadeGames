/**
 * Sumi-e / shan-shui aesthetic module.
 * Re-exports palette, theme, ink-wash, juice, atmosphere, performance and debug.
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
  type AestheticThemeOptions,
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

// Phase 3 — atmosphere
export {
  ATMOSPHERE_INK_WASH_LAYERS,
  DEFAULT_MIST_BANDS,
  REGIONAL_ATMOSPHERES,
  getAtmosphereLayers,
  getRegionalAtmosphere,
  computeMistBands,
  drawMistBandsCanvas,
  spawnAmbientParticle,
  spawnAmbientBand,
  cameraXForInkLayer,
  inkDepthToParallaxLayer,
  type AtmospherePreset,
  type MistBandSpec,
  type MistBandGeometry,
  type AmbientParticleKind,
  type SumiERegionId,
  type RegionalAtmosphere
} from "./SumiEAtmosphere";

// Phase 4 — performance, a11y, debug
export {
  resolveSumiERenderSettings,
  selectLayers,
  getLayerStack,
  contrastColors,
  type SumiEQualityPreset,
  type SumiERenderSettings,
  type AccessibilityOverrides,
  type LayerStackId
} from "./SumiEPerformance";

export {
  drawSumiEDebugOverlayCanvas,
  SUMI_E_DEBUG_RESOURCE,
  type SumiEDebugSnapshot
} from "./SumiEDebugOverlay";
