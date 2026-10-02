import { Renderer } from "@tiny-aster/core";

/**
 * Registers Frogger visual shape drawers and background effects on the provided renderer.
 * Keeps renderer backend imports separated from pure ECS simulation logic.
 */
export function initializeFroggerRenderer(renderer: Renderer<any, any>): void {
  console.group("🎨 [DEBUG-1] initializeFroggerRenderer");
  console.log("🎨 [DEBUG-1] Tipo de renderer recibido:", renderer?.type);
  try {
    if (renderer.type === "canvas") {
      const visuals = require("./FroggerCanvasVisuals");
      const shapeMap: Record<string, any> = {
        frogger: visuals.drawFroggerCanvas,
        car: visuals.drawCarCanvas,
        truck: visuals.drawTruckCanvas,
        log: visuals.drawLogCanvas,
        turtle: visuals.drawTurtleCanvas,
        lily_pad: visuals.drawLilyPadCanvas,
      };
      Object.entries(shapeMap).forEach(([name, fn]) => renderer.registerShape(name, fn));
      renderer.registerBackgroundEffect("froggerBackground", visuals.froggerBackgroundCanvasEffect);
      console.log("🎨 Shapes registradas exitosamente para tipo:", renderer.type);
    } else if (renderer.type === "skia") {
      const visuals = require("./FroggerSkiaVisuals");
      const shapeMap: Record<string, any> = {
        frogger: visuals.drawFroggerSkia,
        car: visuals.drawCarSkia,
        truck: visuals.drawTruckSkia,
        log: visuals.drawLogSkia,
        turtle: visuals.drawTurtleSkia,
        lily_pad: visuals.drawLilyPadSkia,
      };
      Object.entries(shapeMap).forEach(([name, fn]) => renderer.registerShape(name, fn));
      renderer.registerBackgroundEffect("froggerBackground", visuals.froggerBackgroundSkiaEffect);
      console.log("🎨 Shapes registradas exitosamente para tipo:", renderer.type);
    } else {
      console.warn("⚠️ [DEBUG-1] Tipo de renderer NO RECONOCIDO:", renderer?.type);
    }
  } catch (err) {
    console.error("[Frogger] Failed to register shapes:", err);
  } finally {
    console.groupEnd();
  }
}
