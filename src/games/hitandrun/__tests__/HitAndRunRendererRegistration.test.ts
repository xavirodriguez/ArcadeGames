import { registerHitRunRenderers } from "../HitAndRunGame";
import {
  drawLanceroSpriteCanvas,
  drawSkiaLanceroSprite,
  LANCERO_SHAPE
} from "../../shared/sprites/LanceroSpriteVisuals";

function createRenderer(type: "canvas" | "skia") {
  return {
    type,
    registerBackgroundEffect: jest.fn(),
    registerShape: jest.fn()
  };
}

describe("Hit & Run Lancero renderer registration", () => {
  it("registers the Canvas drawer for the Canvas backend and the Skia drawer for Skia", () => {
    const canvasRenderer = createRenderer("canvas");
    registerHitRunRenderers(canvasRenderer as never);
    expect(canvasRenderer.registerShape).toHaveBeenCalledWith(
      LANCERO_SHAPE,
      drawLanceroSpriteCanvas
    );

    const skiaRenderer = createRenderer("skia");
    registerHitRunRenderers(skiaRenderer as never);
    expect(skiaRenderer.registerShape).toHaveBeenCalledWith(
      LANCERO_SHAPE,
      drawSkiaLanceroSprite
    );
  });
});
