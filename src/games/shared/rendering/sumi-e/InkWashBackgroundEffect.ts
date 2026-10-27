/**
 * InkWashBackgroundEffect.ts
 * Registrable background-effect adapters for Canvas and Skia that render
 * the shared InkWashParallaxBackdrop.
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
}

function resolveOptions(
  themeOrOpts?: AestheticThemeConfig | InkWashEffectOptions
): Required<Pick<InkWashEffectOptions, "layers" | "inkColor" | "paperColor" | "alphaScale">> &
  Pick<InkWashEffectOptions, "getCameraX" | "getViewport"> {
  if (!themeOrOpts) {
    return {
      layers: DEFAULT_INK_WASH_LAYERS,
      inkColor: SUMI_E_PALETTE.ink,
      paperColor: SUMI_E_PALETTE.paper,
      alphaScale: 1
    };
  }

  // AestheticThemeConfig shape
  if ("id" in themeOrOpts && "useInkWash" in themeOrOpts) {
    const t = themeOrOpts as AestheticThemeConfig;
    return {
      layers: t.inkWashLayers ?? DEFAULT_INK_WASH_LAYERS,
      inkColor: t.foregroundColor ?? SUMI_E_PALETTE.ink,
      paperColor: t.backgroundColor ?? SUMI_E_PALETTE.paper,
      alphaScale: 1
    };
  }

  const o = themeOrOpts as InkWashEffectOptions;
  return {
    layers: o.layers ?? DEFAULT_INK_WASH_LAYERS,
    inkColor: o.inkColor ?? SUMI_E_PALETTE.ink,
    paperColor: o.paperColor ?? SUMI_E_PALETTE.paper,
    alphaScale: o.alphaScale ?? 1,
    getCameraX: o.getCameraX,
    getViewport: o.getViewport
  };
}

/**
 * Creates a Canvas EffectDrawer that paints the ink-wash parallax backdrop.
 */
export function createInkWashCanvasEffect(
  themeOrOpts?: AestheticThemeConfig | InkWashEffectOptions
): EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> {
  const opts = resolveOptions(themeOrOpts);

  return {
    draw(ctx: CanvasRenderingContext2D, world: World<CoreComponentRegistry>): void {
      const cameraX = opts.getCameraX?.(world) ?? 0;
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const geometry = computeInkWashLayers(w, h, cameraX, opts.layers);
      const drawOpts: InkWashDrawOptions = {
        inkColor: opts.inkColor,
        paperColor: opts.paperColor,
        alphaScale: opts.alphaScale
      };
      drawInkWashLayersCanvas(ctx, geometry, drawOpts);
    }
  };
}

/**
 * Creates a Skia EffectDrawer that paints the ink-wash parallax backdrop.
 */
export function createInkWashSkiaEffect(
  themeOrOpts?: AestheticThemeConfig | InkWashEffectOptions
): EffectDrawer<SkCanvas, CoreComponentRegistry> {
  const opts = resolveOptions(themeOrOpts);

  return {
    draw(canvas: SkCanvas, world: World<CoreComponentRegistry>): void {
      const cameraX = opts.getCameraX?.(world) ?? 0;
      const vp = opts.getViewport?.(world) ?? { w: 800, h: 600 };
      const geometry = computeInkWashLayers(vp.w, vp.h, cameraX, opts.layers);
      const drawOpts: InkWashDrawOptions = {
        inkColor: opts.inkColor,
        paperColor: opts.paperColor,
        alphaScale: opts.alphaScale
      };
      drawInkWashLayersSkia(canvas, geometry, drawOpts, vp.w, vp.h);
    }
  };
}

/** Canonical effect name used across the suite. */
export const INK_WASH_EFFECT_NAME = "ink-wash-parallax" as const;
