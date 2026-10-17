import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import {
  createParallaxLayer,
  NebulaCloud,
  NEBULA_CLOUD_COUNT,
  initializeNebulae,
  getActiveVisualContext,
  resolveLayerFrame
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

export function resolveNebulaCloudColor(
  theme: { nebulaPalette: readonly string[] },
  index: number,
  defaultColor: string
): string {
  return theme.nebulaPalette[index % theme.nebulaPalette.length] || defaultColor;
}

export function computeNebulaLobePosition(
  posX: number,
  posY: number,
  offsetAngle: number,
  radius: number
): { lobeX: number; lobeY: number } {
  return {
    lobeX: posX + Math.cos(offsetAngle) * (radius * 0.25),
    lobeY: posY + Math.sin(offsetAngle) * (radius * 0.25),
  };
}

const driftingNebulaLayer = createParallaxLayer<NebulaCloud[]>({
  layerName: "layer1_nebula",
  isInitialized: (state) => state.nebulaeInitialized,
  initialize: initializeNebulae,
  getState: (state) => state.nebulae
});

export interface DriftingNebulaSetup {
  theme: ReturnType<typeof getActiveVisualContext>;
  layerCtx: NonNullable<ReturnType<typeof resolveLayerFrame<NebulaCloud[]>>>;
}

export function resolveDriftingNebulaSetup(world: any): DriftingNebulaSetup | null {
  const theme = getActiveVisualContext(world);
  const layerCtx = resolveLayerFrame(world, "drifting_nebula", driftingNebulaLayer);
  if (!layerCtx) return null;
  return { theme, layerCtx };
}

export const DriftingNebulaBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const setup = resolveDriftingNebulaSetup(world);
    if (!setup) return;
    const { theme, layerCtx } = setup;
    const { layerState: nebulae, state, offsetX } = layerCtx;

    ctx.save();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = nebulae[i];
      const { posX, offsetAngle } = advanceNebulaCloud(neb, state.timePhase, i, offsetX);
      const nebColorHex = resolveNebulaCloudColor(theme, i, neb.color);

      ctx.fillStyle = nebColorHex;
      ctx.globalAlpha = 0.012 * theme.ambientGlow;

      for (let r = neb.radius; r > 10; r -= 20) {
        ctx.beginPath();
        ctx.arc(posX, neb.y, r, 0, Math.PI * 2);
        ctx.fill();

        const { lobeX, lobeY } = computeNebulaLobePosition(posX, neb.y, offsetAngle, r);
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
    const setup = resolveDriftingNebulaSetup(world);
    if (!setup) return;
    const { theme, layerCtx } = setup;
    const { layerState: nebulae, state, offsetX } = layerCtx;

    canvas.save();
    const paint = Skia.Paint();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = nebulae[i];
      const { posX, offsetAngle } = advanceNebulaCloud(neb, state.timePhase, i, offsetX);
      const nebColorHex = resolveNebulaCloudColor(theme, i, neb.color);

      paint.setColor(Skia.Color(nebColorHex));
      paint.setAlphaf(0.012 * theme.ambientGlow);

      for (let r = neb.radius; r > 10; r -= 20) {
        canvas.drawCircle(posX, neb.y, r, paint);

        const { lobeX, lobeY } = computeNebulaLobePosition(posX, neb.y, offsetAngle, r);
        canvas.drawCircle(lobeX, lobeY, r * 0.7, paint);
      }
    }

    canvas.restore();
  }
};
