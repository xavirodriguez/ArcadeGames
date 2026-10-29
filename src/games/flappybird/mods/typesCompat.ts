import type { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

export interface FlappyCanvasDrawers {
  drawBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
  drawPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
  drawGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
  scrollingBackground: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
}

export interface FlappySkiaDrawers {
  drawBird: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
  drawPipe: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
  drawGround: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
  scrollingBackground: EffectDrawer<RenderContext, FlappyBirdComponentRegistry>;
}
