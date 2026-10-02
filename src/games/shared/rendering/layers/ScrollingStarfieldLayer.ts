import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import { COSMIC_ARCADE_PALETTE } from "../CosmicPalette";
import {
  createParallaxLayer,
  Star,
  STAR_COUNT,
  initializeStars,
  getActiveVisualContext,
  resolveLayerFrame
} from "../SharedVFXInternal";

export function advanceStarPosition(
  star: Star,
  starSpeedMult: number,
  offsetX: number,
  wrapCoordinate: (val: number) => number
): { posX: number; currentSize: number } {
  const posX = wrapCoordinate(star.x - star.speed * starSpeedMult - offsetX * 0.1);
  star.twinklePhase += star.twinkleSpeed;
  const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
  const currentSize = star.size * twinkle;
  return { posX, currentSize };
}

export function resolveActiveStarCount(starDensity?: number): number {
  return Math.min(STAR_COUNT, Math.max(1, Math.floor(STAR_COUNT * (starDensity ?? 1.0))));
}

const starfieldLayer = createParallaxLayer<Star[]>({
  layerName: "layer2_distant_stars",
  isInitialized: (state) => state.starsInitialized,
  initialize: initializeStars,
  getState: (state) => state.stars
});

export const ScrollingStarfieldEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const theme = getActiveVisualContext(world);
    const layerCtx = resolveLayerFrame(world, "starfield", starfieldLayer);
    if (!layerCtx) return;
    const { layerState: stars, offsetX, wrapCoordinate } = layerCtx;

    const starSpeedMult = theme.starSpeed || 1.0;
    const activeStarCount = resolveActiveStarCount(theme.starDensity);

    ctx.save();

    for (let i = 0; i < activeStarCount; i++) {
      const star = stars[i];
      const { posX, currentSize } = advanceStarPosition(star, starSpeedMult, offsetX, wrapCoordinate);

      ctx.fillStyle = star.color;
      ctx.fillRect(posX - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize);
    }

    ctx.restore();
  }
};

export const SkiaScrollingStarfieldEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const theme = getActiveVisualContext(world);
    const layerCtx = resolveLayerFrame(world, "starfield", starfieldLayer);
    if (!layerCtx) return;
    const { layerState: stars, offsetX, wrapCoordinate } = layerCtx;

    const starSpeedMult = theme.starSpeed || 1.0;
    const activeStarCount = resolveActiveStarCount(theme.starDensity);

    canvas.save();
    const paint = Skia.Paint();

    for (let i = 0; i < activeStarCount; i++) {
      const star = stars[i];
      const { posX, currentSize } = advanceStarPosition(star, starSpeedMult, offsetX, wrapCoordinate);

      paint.setColor(star.skColor || Skia.Color(COSMIC_ARCADE_PALETTE.white));
      canvas.drawRect(
        Skia.XYWHRect(posX - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize),
        paint
      );
    }

    canvas.restore();
  }
};
