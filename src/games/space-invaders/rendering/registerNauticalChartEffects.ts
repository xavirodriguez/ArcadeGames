/**
 * Registers Aquí hay dragones background effects on a Renderer instance.
 * Call from SpaceInvadersGame.initializeRenderer for canvas and skia backends.
 *
 * Example (canvas):
 *   const { registerNauticalChartCanvasEffects } = require("./rendering/registerNauticalChartEffects");
 *   registerNauticalChartCanvasEffects(r);
 */
export function registerNauticalChartCanvasEffects(r: {
  registerBackgroundEffect: (name: string, drawer: unknown) => void;
}): void {
  const { drawNauticalChartBackgroundEffect } = require("./NauticalChartBackground");
  r.registerBackgroundEffect("parchment_chart", drawNauticalChartBackgroundEffect);
}

export function registerNauticalChartSkiaEffects(r: {
  registerBackgroundEffect: (name: string, drawer: unknown) => void;
}): void {
  const { createDrawSkiaNauticalChartBackgroundEffect } = require("./NauticalChartBackgroundSkia");
  r.registerBackgroundEffect("parchment_chart", createDrawSkiaNauticalChartBackgroundEffect());
}
