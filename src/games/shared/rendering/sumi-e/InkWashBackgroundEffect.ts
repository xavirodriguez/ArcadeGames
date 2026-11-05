/**
 * InkWashBackgroundEffect.ts
 * Registrable background-effect adapters for Canvas and Skia that render
 * the shared InkWashParallaxBackdrop + optional mist bands / debug overlay.
 *
 * Usage (inside a game's registerVisuals):
 *
 *   import { createInkWashCanvasEffect, createInkWashSkiaEffect, INK_WASH_EFFECT_NAME } from ".../sumi-e";
 *   renderer.registerBackgroundEffect(INK_WASH_EFFECT_NAME, createInkWashCanvasEffect(theme));
 */

import type { World, CoreComponentRegistry, EffectDrawer } from "@tiny-aster/core";
import {
  computeInkWashLayers,
  drawInkWashLayersCanvas,
  drawInkWashLayersSkia,
  DEFAULT_INK_WASH_LAYERS,
  type InkWashLayerSpec,
  type InkWashDrawOptions
} from "../InkWashParallaxBackdrop";
import type { SkCanvas } from "../SkiaContext";
import type { AestheticThemeConfig } from "./AestheticTheme";
import { SUMI_E_PALETTE } from "./SumiEPalette";
import {
  computeMistBands,
  drawMistBandsCanvas,
  drawMistBandsSkia,
  DEFAULT_MIST_BANDS,
  type MistBandSpec,
  type SumiERegionId
} from "./SumiEAtmosphere";
import {
  resolveSumiERenderSettings,
  selectLayers,
  contrastColors,
  type SumiEQualityPreset,
  type SumiERenderSettings,
  type AccessibilityOverrides
} from "./SumiEPerformance";
import {
  drawSumiEDebugOverlayCanvas,
  SUMI_E_DEBUG_RESOURCE,
  type SumiEDebugSnapshot
} from "./SumiEDebugOverlay";

export interface InkWashEffectOptions {
  layers?: readonly InkWashLayerSpec[];
  inkColor?: string;
  paperColor?: string;
  alphaScale?: number;
  /**
   * How to obtain camera X each frame.
   * Default: 0 (static). Games with scrolling cameras should pass a resolver.
   */
  getCameraX?: (world: World<CoreComponentRegistry>) => number;
  /** Viewport size resolver (needed for Skia when canvas size is not implicit). */
  getViewport?: (world: World<CoreComponentRegistry>) => { w: number; h: number };
  /** Mist band specs (Phase 3). When omitted and settings.mist is true, DEFAULT_MIST_BANDS is used. */
  mistBands?: readonly MistBandSpec[];
  /** Quality + accessibility settings (Phase 4). Defaults to high. */
  settings?: SumiERenderSettings;
  quality?: SumiEQualityPreset;
  accessibility?: AccessibilityOverrides;
  /** Region id for debug overlay labeling. */
  region?: SumiERegionId | string;
}

interface ResolvedInkWashOptions {
  layers: readonly InkWashLayerSpec[];
  inkColor: string;
  paperColor: string;
  alphaScale: number;
  getCameraX?: (world: World<CoreComponentRegistry>) => number;
  getViewport?: (world: World<CoreComponentRegistry>) => { w: number; h: number };
  mistBands: readonly MistBandSpec[];
  settings: SumiERenderSettings;
  region?: string;
}

function resolveOptions(
  themeOrOpts?: AestheticThemeConfig | InkWashEffectOptions
): ResolvedInkWashOptions {
  if (!themeOrOpts) {
    const settings = resolveSumiERenderSettings("high");
    return {
      layers: selectLayers(DEFAULT_INK_WASH_LAYERS, settings.maxLayers),
      inkColor: SUMI_E_PALETTE.ink,
      paperColor: SUMI_E_PALETTE.paper,
      alphaScale: settings.alphaScale,
      mistBands: DEFAULT_MIST_BANDS,
      settings
    };
  }

  // AestheticThemeConfig shape
  if ("id" in themeOrOpts && "useInkWash" in themeOrOpts) {
    const t = themeOrOpts as AestheticThemeConfig;
    const settings = resolveSumiERenderSettings("high");
    const colors = contrastColors(settings.highContrast);
    return {
      layers: selectLayers(t.inkWashLayers ?? DEFAULT_INK_WASH_LAYERS, settings.maxLayers),
      inkColor: t.foregroundColor ?? colors.ink,
      paperColor: t.backgroundColor ?? colors.paper,
      alphaScale: settings.alphaScale,
      mistBands: DEFAULT_MIST_BANDS,
      settings
    };
  }

  const o = themeOrOpts as InkWashEffectOptions;
  const settings =
    o.settings ??
    resolveSumiERenderSettings(o.quality ?? "high", o.accessibility ?? {});
  const colors = contrastColors(settings.highContrast);
  const baseLayers = o.layers ?? DEFAULT_INK_WASH_LAYERS;

  return {
    layers: selectLayers(baseLayers, settings.maxLayers),
    inkColor: o.inkColor ?? colors.ink,
    paperColor: o.paperColor ?? colors.paper,
    alphaScale: (o.alphaScale ?? 1) * settings.alphaScale,
    getCameraX: o.getCameraX,
    getViewport: o.getViewport,
    mistBands: o.mistBands ?? DEFAULT_MIST_BANDS,
    settings,
    region: o.region
  };
}

/** Cosmetic clock for mist phase — not gameplay-affecting. */
function mistTimeSec(): number {
  return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
}

/**
 * Creates a Canvas EffectDrawer that paints the ink-wash parallax backdrop
 * plus optional mist bands and debug overlay.
 */
export function createInkWashCanvasEffect(
  themeOrOpts?: AestheticThemeConfig | InkWashEffectOptions
): EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> {
  const opts = resolveOptions(themeOrOpts);

  return {
    draw(ctx: CanvasRenderingContext2D, world: World<CoreComponentRegistry>): void {
      const cameraX = opts.settings.parallax ? (opts.getCameraX?.(world) ?? 0) : 0;
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const geometry = computeInkWashLayers(w, h, cameraX, opts.layers, opts.settings.step);
      const drawOpts: InkWashDrawOptions = {
        inkColor: opts.inkColor,
        paperColor: opts.settings.paperFill ? opts.paperColor : undefined,
        alphaScale: opts.alphaScale
      };
      drawInkWashLayersCanvas(ctx, geometry, drawOpts);

      if (opts.settings.mist && opts.mistBands.length > 0) {
        const mist = computeMistBands(h, mistTimeSec(), cameraX, opts.mistBands);
        drawMistBandsCanvas(ctx, w, mist, opts.paperColor);
      }

      if (world.getResource<boolean>(SUMI_E_DEBUG_RESOURCE) === true) {
        const snapshot: SumiEDebugSnapshot = {
          cameraX,
          layerCount: opts.layers.length,
          layers: opts.layers,
          settings: opts.settings,
          region: opts.region
        };
        drawSumiEDebugOverlayCanvas(ctx, snapshot);
      }
    }
  };
}

/**
 * Creates a Skia EffectDrawer that paints the ink-wash parallax backdrop
 * plus optional mist bands.
 */
export function createInkWashSkiaEffect(
  themeOrOpts?: AestheticThemeConfig | InkWashEffectOptions
): EffectDrawer<SkCanvas, CoreComponentRegistry> {
  const opts = resolveOptions(themeOrOpts);

  return {
    draw(canvas: SkCanvas, world: World<CoreComponentRegistry>): void {
      const cameraX = opts.settings.parallax ? (opts.getCameraX?.(world) ?? 0) : 0;
      const vp = opts.getViewport?.(world) ?? { w: 800, h: 600 };
      const geometry = computeInkWashLayers(vp.w, vp.h, cameraX, opts.layers, opts.settings.step);
      const drawOpts: InkWashDrawOptions = {
        inkColor: opts.inkColor,
        paperColor: opts.settings.paperFill ? opts.paperColor : undefined,
        alphaScale: opts.alphaScale
      };
      drawInkWashLayersSkia(canvas, geometry, drawOpts, vp.w, vp.h);

      if (opts.settings.mist && opts.mistBands.length > 0) {
        const mist = computeMistBands(vp.h, mistTimeSec(), cameraX, opts.mistBands);
        drawMistBandsSkia(canvas, vp.w, mist, opts.paperColor);
      }
    }
  };
}

/** Canonical effect name used across the suite. */
export const INK_WASH_EFFECT_NAME = "ink-wash-parallax" as const;
