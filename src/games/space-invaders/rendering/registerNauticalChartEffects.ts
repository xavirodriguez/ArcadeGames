/**
 * Registers Aquí hay dragones background + HUD effects on a Renderer instance.
 * Call from SpaceInvadersGame.initializeRenderer for canvas (and optionally skia).
 *
 * Example (canvas):
 *   const { registerNauticalChartCanvasEffects } = require("./rendering/registerNauticalChartEffects");
 *   registerNauticalChartCanvasEffects(r);
 */
export function registerNauticalChartCanvasEffects(r: {
  registerBackgroundEffect: (name: string, drawer: unknown) => void;
}): void {
  const { drawNauticalChartBackgroundEffect } = require("./NauticalChartBackground");
  const { drawNauticalHudEffect } = require("./NauticalHudOverlay");
  r.registerBackgroundEffect("parchment_chart", drawNauticalChartBackgroundEffect);
  r.registerBackgroundEffect("nautical_hud", drawNauticalHudEffect);
}

export function registerNauticalChartSkiaEffects(r: {
  registerBackgroundEffect: (name: string, drawer: unknown) => void;
}): void {
  const { createDrawSkiaNauticalChartBackgroundEffect } = require("./NauticalChartBackgroundSkia");
  r.registerBackgroundEffect("parchment_chart", createDrawSkiaNauticalChartBackgroundEffect());
  // HUD is Canvas-first in Phase 4; Skia HUD can mirror later
}
