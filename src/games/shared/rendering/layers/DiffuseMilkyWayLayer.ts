import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import { COSMIC_ARCADE_PALETTE, hexToRgba, getSkiaColor } from "../CosmicPalette";
import {
  createParallaxLayer,
  MilkyWayBandState,
  initializeMilkyWay,
  getOrCreateCached,
  getActiveVisualContext
} from "../SharedVFXInternal";

const diffuseMilkyWayLayer = createParallaxLayer<MilkyWayBandState | undefined>({
  layerName: "layer1_nebula",
  isInitialized: (state) => state.milkyWayInitialized,
  initialize: initializeMilkyWay,
  getState: (state) => state.milkyWay
});

export const DiffuseMilkyWayBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const theme = getActiveVisualContext(world);
    if (theme.backgroundLayers && !theme.backgroundLayers.includes("diffuse_milky_way")) return;

    const layerCtx = diffuseMilkyWayLayer(world);
    if (!layerCtx) return;
    const { width, height, state, layerState: milkyWay, offsetX, wrapCoordinate } = layerCtx;
    if (!milkyWay) return;

    ctx.save();

    const centerX = wrapCoordinate(width / 2 - offsetX * 0.1, width);
    const centerY = height / 2;
    const bandHeight = 220;

    ctx.translate(centerX, centerY);
    ctx.rotate(milkyWay.angle);

    const gradient = getOrCreateCached(state, "cachedMilkyWayGradient", width, height, () => {
      const grad = ctx.createLinearGradient(0, -bandHeight / 2, 0, bandHeight / 2);
      grad.addColorStop(0, hexToRgba(COSMIC_ARCADE_PALETTE.nebulaPurple, 0));
      grad.addColorStop(0.2, hexToRgba(COSMIC_ARCADE_PALETTE.electricIndigo, 0.08));
      grad.addColorStop(0.5, hexToRgba(COSMIC_ARCADE_PALETTE.mutedPurple, 0.18));
      grad.addColorStop(0.8, hexToRgba(COSMIC_ARCADE_PALETTE.electricIndigo, 0.08));
      grad.addColorStop(1, hexToRgba(COSMIC_ARCADE_PALETTE.nebulaPurple, 0));
      return grad;
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(-width, -bandHeight / 2, width * 2, bandHeight);

    ctx.fillStyle = hexToRgba(COSMIC_ARCADE_PALETTE.iceBlue, 0.05);
    ctx.fillRect(-width, -bandHeight * 0.15, width * 2, bandHeight * 0.3);

    for (let i = 0; i < milkyWay.particles.length; i++) {
      const p = milkyWay.particles[i];
      p.twinklePhase += p.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * twinkle;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.restore();
  }
};

export const SkiaDiffuseMilkyWayBackgroundEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const theme = getActiveVisualContext(world);
    if (theme.backgroundLayers && !theme.backgroundLayers.includes("diffuse_milky_way")) return;

    const layerCtx = diffuseMilkyWayLayer(world);
    if (!layerCtx) return;
    const { width, height, state, layerState: milkyWay, offsetX, wrapCoordinate } = layerCtx;
    if (!milkyWay) return;

    canvas.save();

    const centerX = wrapCoordinate(width / 2 - offsetX * 0.1, width);
    const centerY = height / 2;
    const bandHeight = 220;

    canvas.translate(centerX, centerY);
    canvas.rotate((milkyWay.angle * 180) / Math.PI, 0, 0);

    const shader = getOrCreateCached(state, "cachedMilkyWaySkiaShader", width, height, () => {
      return Skia.Shader.MakeLinearGradient(
        Skia.Point(0, -bandHeight / 2),
        Skia.Point(0, bandHeight / 2),
        [
          getSkiaColor(COSMIC_ARCADE_PALETTE.nebulaPurple, 0),
          getSkiaColor(COSMIC_ARCADE_PALETTE.electricIndigo, 0.08),
          getSkiaColor(COSMIC_ARCADE_PALETTE.mutedPurple, 0.18),
          getSkiaColor(COSMIC_ARCADE_PALETTE.electricIndigo, 0.08),
          getSkiaColor(COSMIC_ARCADE_PALETTE.nebulaPurple, 0)
        ],
        [0.0, 0.2, 0.5, 0.8, 1.0],
        Skia.TileMode.Clamp
      );
    });

    const bandPaint = Skia.Paint();
    bandPaint.setShader(shader);
    canvas.drawRect(Skia.XYWHRect(-width, -bandHeight / 2, width * 2, bandHeight), bandPaint);

    const corePaint = Skia.Paint();
    corePaint.setColor(getSkiaColor(COSMIC_ARCADE_PALETTE.iceBlue, 0.05));
    canvas.drawRect(Skia.XYWHRect(-width, -bandHeight * 0.15, width * 2, bandHeight * 0.3), corePaint);

    const particlePaint = Skia.Paint();
    for (let i = 0; i < milkyWay.particles.length; i++) {
      const p = milkyWay.particles[i];
      p.twinklePhase += p.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);

      particlePaint.setColor(p.skColor || Skia.Color(COSMIC_ARCADE_PALETTE.white));
      particlePaint.setAlphaf(p.alpha * twinkle);
      canvas.drawRect(
        Skia.XYWHRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size),
        particlePaint
      );
    }

    canvas.restore();
  }
};
