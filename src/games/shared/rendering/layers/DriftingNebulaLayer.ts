import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import {
  createParallaxLayer,
  NebulaCloud,
  NEBULA_CLOUD_COUNT,
  initializeNebulae,
  getActiveLevelTheme
} from "../SharedVFXInternal";

export function advanceNebulaCloud(
  neb: NebulaCloud,
  timePhase: number,
  index: number,
  offsetX: number
): { posX: number; offsetAngle: number } {
  neb.x += neb.vx;
  neb.y += neb.vy;
  const posX = neb.x - offsetX * 0.1;
  const offsetAngle = timePhase * 0.05 + index;
  return { posX, offsetAngle };
}

const driftingNebulaLayer = createParallaxLayer<NebulaCloud[]>({
  layerName: "layer1_nebula",
  isInitialized: (state) => state.nebulaeInitialized,
  initialize: initializeNebulae,
  getState: (state) => state.nebulae
});

export const DriftingNebulaBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const layerCtx = driftingNebulaLayer(world);
    if (!layerCtx) return;
    const { layerState: nebulae, state, offsetX } = layerCtx;

    const theme = getActiveLevelTheme(world);

    ctx.save();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = nebulae[i];
      const { posX, offsetAngle } = advanceNebulaCloud(neb, state.timePhase, i, offsetX);
      const nebColorHex = theme.nebulaPalette[i % theme.nebulaPalette.length] || neb.color;

      ctx.fillStyle = nebColorHex;
      ctx.globalAlpha = 0.012 * theme.ambientGlow;

      for (let r = neb.radius; r > 10; r -= 20) {
        ctx.beginPath();
        ctx.arc(posX, neb.y, r, 0, Math.PI * 2);
        ctx.fill();

        const lobeX = posX + Math.cos(offsetAngle) * (r * 0.25);
        const lobeY = neb.y + Math.sin(offsetAngle) * (r * 0.25);
        ctx.beginPath();
        ctx.arc(lobeX, lobeY, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
};

export const SkiaDriftingNebulaBackgroundEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const layerCtx = driftingNebulaLayer(world);
    if (!layerCtx) return;
    const { layerState: nebulae, state, offsetX } = layerCtx;

    const theme = getActiveLevelTheme(world);

    canvas.save();
    const paint = Skia.Paint();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = nebulae[i];
      const { posX, offsetAngle } = advanceNebulaCloud(neb, state.timePhase, i, offsetX);
      const nebColorHex = theme.nebulaPalette[i % theme.nebulaPalette.length] || neb.color;

      paint.setColor(Skia.Color(nebColorHex));
      paint.setAlphaf(0.012 * theme.ambientGlow);

      for (let r = neb.radius; r > 10; r -= 20) {
        canvas.drawCircle(posX, neb.y, r, paint);

        const lobeX = posX + Math.cos(offsetAngle) * (r * 0.25);
        const lobeY = neb.y + Math.sin(offsetAngle) * (r * 0.25);
        canvas.drawCircle(lobeX, lobeY, r * 0.7, paint);
      }
    }

    canvas.restore();
  }
};
