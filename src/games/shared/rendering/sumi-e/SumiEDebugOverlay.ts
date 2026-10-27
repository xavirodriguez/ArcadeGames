/**
 * SumiEDebugOverlay.ts
 * Phase 4: lightweight Canvas debug HUD for ink-wash layers and settings.
 * Enable via world resource `SumiEDebug = true` or pass enabled flag.
 */

import type { InkWashLayerSpec } from "../InkWashParallaxBackdrop";
import type { SumiERenderSettings } from "./SumiEPerformance";

export interface SumiEDebugSnapshot {
  cameraX: number;
  layerCount: number;
  layers: readonly InkWashLayerSpec[];
  settings?: SumiERenderSettings;
  fps?: number;
  region?: string;
}

/**
 * Draws a semi-transparent panel with layer depths, alphas and quality preset.
 * Call after the main ink-wash pass when debug is enabled.
 */
export function drawSumiEDebugOverlayCanvas(
  ctx: CanvasRenderingContext2D,
  snapshot: SumiEDebugSnapshot
): void {
  const pad = 8;
  const lineH = 14;
  const rows = 4 + snapshot.layers.length + (snapshot.settings ? 3 : 0);
  const panelW = 220;
  const panelH = pad * 2 + rows * lineH;

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(pad, pad, panelW, panelH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#e8e3d4";
  ctx.font = "11px monospace";
  ctx.textBaseline = "top";

  let y = pad + 4;
  const line = (text: string) => {
    ctx.fillText(text, pad + 6, y);
    y += lineH;
  };

  line(`Sumi-e debug`);
  line(`camX: ${snapshot.cameraX.toFixed(1)}`);
  if (snapshot.region) line(`region: ${snapshot.region}`);
  if (snapshot.fps != null) line(`fps: ${snapshot.fps.toFixed(0)}`);
  if (snapshot.settings) {
    line(`quality: ${snapshot.settings.quality} step=${snapshot.settings.step}`);
    line(`parallax=${snapshot.settings.parallax} mist=${snapshot.settings.mist}`);
    line(`a11y: motion↓=${snapshot.settings.reduceMotion} contrast↑=${snapshot.settings.highContrast}`);
  }
  line(`layers (${snapshot.layerCount}):`);
  for (let i = 0; i < snapshot.layers.length; i++) {
    const L = snapshot.layers[i];
    line(`  [${i}] d=${L.depth.toFixed(2)} a=${L.alpha.toFixed(2)} y=${L.yRatio.toFixed(2)}`);
  }

  ctx.restore();
}

/** World resource key to toggle the overlay from game code / console. */
export const SUMI_E_DEBUG_RESOURCE = "SumiEDebug" as const;
