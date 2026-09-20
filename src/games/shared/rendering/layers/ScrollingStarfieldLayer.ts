import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import { COSMIC_ARCADE_PALETTE } from "../CosmicPalette";
import {
  createParallaxLayer,
  Star,
  STAR_COUNT,
  initializeStars,
  getActiveLevelTheme
} from "../SharedVFXInternal";

const starfieldLayer = createParallaxLayer<Star[]>({
  layerName: "layer2_distant_stars",
  isInitialized: (state) => state.starsInitialized,
  initialize: initializeStars,
  getState: (state) => state.stars
});

export const ScrollingStarfieldEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const layerCtx = starfieldLayer(world);
    if (!layerCtx) return;
    const { layerState: stars, offsetX, wrapCoordinate } = layerCtx;

    const theme = getActiveLevelTheme(world);
    const starSpeedMult = theme.starSpeed || 1.0;

    ctx.save();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = stars[i];
      const posX = wrapCoordinate(star.x - star.speed * starSpeedMult - offsetX * 0.1);

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const currentSize = star.size * twinkle;

      ctx.fillStyle = star.color;
      ctx.fillRect(posX - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize);
    }

    ctx.restore();
  }
};

export const SkiaScrollingStarfieldEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const layerCtx = starfieldLayer(world);
    if (!layerCtx) return;
    const { layerState: stars, offsetX, wrapCoordinate } = layerCtx;

    const theme = getActiveLevelTheme(world);
    const starSpeedMult = theme.starSpeed || 1.0;

    canvas.save();
    const paint = Skia.Paint();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = stars[i];
      const posX = wrapCoordinate(star.x - star.speed * starSpeedMult - offsetX * 0.1);

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const currentSize = star.size * twinkle;

      paint.setColor(star.skColor || Skia.Color(COSMIC_ARCADE_PALETTE.white));
      canvas.drawRect(
        Skia.XYWHRect(posX - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize),
        paint
      );
    }

    canvas.restore();
  }
};
