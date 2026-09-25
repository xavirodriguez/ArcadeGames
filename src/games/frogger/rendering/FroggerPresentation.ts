import { Renderer } from "@tiny-aster/core";

/**
 * Registers Frogger visual shape drawers and background effects on the provided renderer.
 * Keeps renderer backend imports separated from pure ECS simulation logic.
 */
export function initializeFroggerRenderer(renderer: Renderer<any, any>): void {
  try {
    if (renderer.type === "canvas") {
      const {
        drawFroggerCanvas,
        drawCarCanvas,
        drawTruckCanvas,
        drawLogCanvas,
        drawTurtleCanvas,
        drawLilyPadCanvas,
        froggerBackgroundCanvasEffect,
      } = require("./FroggerCanvasVisuals");

      renderer.registerShape("frogger", drawFroggerCanvas);
      renderer.registerShape("car", drawCarCanvas);
      renderer.registerShape("truck", drawTruckCanvas);
      renderer.registerShape("log", drawLogCanvas);
      renderer.registerShape("turtle", drawTurtleCanvas);
      renderer.registerShape("lily_pad", drawLilyPadCanvas);
      renderer.registerBackgroundEffect("froggerBackground", froggerBackgroundCanvasEffect);
    } else if (renderer.type === "skia") {
      const {
        drawFroggerSkia,
        drawCarSkia,
        drawTruckSkia,
        drawLogSkia,
        drawTurtleSkia,
        drawLilyPadSkia,
        froggerBackgroundSkiaEffect,
      } = require("./FroggerSkiaVisuals");

      renderer.registerShape("frogger", drawFroggerSkia);
      renderer.registerShape("car", drawCarSkia);
      renderer.registerShape("truck", drawTruckSkia);
      renderer.registerShape("log", drawLogSkia);
      renderer.registerShape("turtle", drawTurtleSkia);
      renderer.registerShape("lily_pad", drawLilyPadSkia);
      renderer.registerBackgroundEffect("froggerBackground", froggerBackgroundSkiaEffect);
    }
  } catch (err) {
    console.error("[Frogger] Failed to register shapes:", err);
  }
}
