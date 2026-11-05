import type { CoreComponentRegistry, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import { Skia } from "../../shared/rendering/SkiaContext";
import { resolveElapsed, resolveMainCameraX } from "./HitRunBackdropCanvas";
import {
  getHitRunTheme,
  resizeHitRunPresentationSession
} from "./theme/HitRunPresentationSession";
import {
  drawAmbientParticlesSkia,
  SUMI_E_AMBIENT_POOL_RESOURCE
} from "../../shared/rendering/sumi-e";
import type { VisualParticlePool } from "../../shared/rendering/VisualParticlePool";

/**
 * Native Skia effect for Hit & Run.
 * Themes implement renderBackdropSkia (required on HitRunTheme).
 */
export const drawHitRunProceduralBackdropSkia: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(context, world) {
    const canvas = context as never as SkCanvas;
    if (!canvas || typeof canvas.drawRect !== "function" || !Skia) return;

    const gameConfig = world.getResource<{ viewportWidth?: number; viewportHeight?: number }>("GameConfig");
    const width = gameConfig?.viewportWidth ?? 800;
    const height = gameConfig?.viewportHeight ?? 600;
    const cameraX = resolveMainCameraX(world);
    const elapsed = resolveElapsed(world);
    resizeHitRunPresentationSession(world, width, height);
    const theme = getHitRunTheme(world);

    theme.renderBackdropSkia(canvas, width, height, cameraX, 0, elapsed);

    const pool = world.getResource<VisualParticlePool>(SUMI_E_AMBIENT_POOL_RESOURCE);
    if (pool) {
      drawAmbientParticlesSkia(canvas, pool.getActiveParticles());
    }
  }
};
