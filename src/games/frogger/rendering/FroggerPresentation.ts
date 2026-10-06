import { Renderer } from "@tiny-aster/core";
import {
  drawFroggerCanvas,
  drawCarCanvas,
  drawTruckCanvas,
  drawLogCanvas,
  drawTurtleCanvas,
  drawLilyPadCanvas,
  froggerBackgroundCanvasEffect,
} from "./FroggerCanvasVisuals";
import {
  drawFroggerSkia,
  drawCarSkia,
  drawTruckSkia,
  drawLogSkia,
  drawTurtleSkia,
  drawLilyPadSkia,
  froggerBackgroundSkiaEffect,
} from "./FroggerSkiaVisuals";

/**
 * Registers Frogger visual shape drawers and background effects on the provided renderer.
 * Keeps renderer backend imports separated from pure ECS simulation logic.
 */
export function initializeFroggerRenderer(renderer: Renderer<any, any>): void {
  if (renderer?.type === "canvas") {
    renderer.registerShape("frogger", drawFroggerCanvas);
    renderer.registerShape("car", drawCarCanvas);
    renderer.registerShape("truck", drawTruckCanvas);
    renderer.registerShape("log", drawLogCanvas);
    renderer.registerShape("turtle", drawTurtleCanvas);
    renderer.registerShape("lily_pad", drawLilyPadCanvas);
    renderer.registerBackgroundEffect("froggerBackground", froggerBackgroundCanvasEffect);
  } else if (renderer?.type === "skia") {
    renderer.registerShape("frogger", drawFroggerSkia);
    renderer.registerShape("car", drawCarSkia);
    renderer.registerShape("truck", drawTruckSkia);
    renderer.registerShape("log", drawLogSkia);
    renderer.registerShape("turtle", drawTurtleSkia);
    renderer.registerShape("lily_pad", drawLilyPadSkia);
    renderer.registerBackgroundEffect("froggerBackground", froggerBackgroundSkiaEffect);
  } else {
    console.warn("[Frogger] Unrecognized renderer type:", renderer?.type);
  }
}
