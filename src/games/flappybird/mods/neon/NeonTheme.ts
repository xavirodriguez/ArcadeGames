import type { FlappyThemeModule } from "../types";
import {
  drawFlappyBird,
  drawFlappyPipe,
  drawFlappyGround,
  scrollingBackgroundEffect
} from "../../rendering/FlappyBirdCanvasVisuals";
import {
  drawSkiaFlappyBird,
  drawSkiaFlappyPipe,
  drawSkiaFlappyGround,
  scrollingSkiaBackgroundEffect
} from "../../rendering/FlappyBirdSkiaVisuals";

/**
 * Default neon / cosmic aesthetic for Flappy Bird. Presentation only.
 */
export const neonThemeModule: FlappyThemeModule = {
  id: "neon",
  displayName: "Neon",
  canvas: {
    drawBird: drawFlappyBird,
    drawPipe: drawFlappyPipe,
    drawGround: drawFlappyGround,
    scrollingBackground: scrollingBackgroundEffect
  },
  skia: {
    drawBird: drawSkiaFlappyBird,
    drawPipe: drawSkiaFlappyPipe,
    drawGround: drawSkiaFlappyGround,
    scrollingBackground: scrollingSkiaBackgroundEffect
  }
};
