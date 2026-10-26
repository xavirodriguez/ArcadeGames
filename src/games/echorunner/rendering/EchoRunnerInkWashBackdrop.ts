/**
 * Ink-wash parallax backdrop for Echo Runner featuring procedural Japanese mountains, vegetation, and environment.
 */
import { EffectDrawer, CoreComponentRegistry, resolveThemeColorWithFallback } from "@tiny-aster/core";
import {
  computeInkWashLayers,
  drawInkWashLayersCanvas
} from "../../shared/rendering/InkWashParallaxBackdrop";
import { resolveEchoBackgroundContext } from "./EchoRunnerVisualUtils";
import { INK_WORLD_PALETTE } from "../../../theme/inkWorldPalette";
import { generateProceduralScene } from "../../shared/procedural/scene/ProceduralSceneGenerator";
import { drawProceduralSceneCanvas } from "../../shared/procedural/rendering/drawProceduralSceneCanvas";

/** Forward scroll speed for the virtual cameraX derived from elapsed time, px/s. */
const VIRTUAL_SCROLL_SPEED = 60;

export const drawEchoInkWashBackdrop: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, elapsed } = resolveEchoBackgroundContext(world);
    const cameraX = elapsed * VIRTUAL_SCROLL_SPEED;

    const inkColor = resolveThemeColorWithFallback(world, INK_WORLD_PALETTE.ink, "ink", "inkOrOutline", "primary");

    ctx.save();
    // 1. Layered Ink Wash
    const geometry = computeInkWashLayers(width, height, cameraX);
    drawInkWashLayersCanvas(ctx, geometry, inkColor);

    // 2. Japanese Procedural Vector Backdrops (Mountains, Trees, Clouds, Birds)
    const procScene = generateProceduralScene({
      seed: 41873,
      width,
      height,
      theme: "japanese",
      density: 0.8
    });
    drawProceduralSceneCanvas(ctx, procScene);

    ctx.restore();
  }
};
