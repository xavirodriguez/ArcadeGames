/**
 * Canvas EffectDrawer for procedural Hit&Run backdrop.
 * Delegates rendering to active ThemeRegistry theme.
 */
import type {
  EffectDrawer,
  CoreComponentRegistry,
  Camera2DComponent,
  RunState
} from "@tiny-aster/core";
import {
  getHitRunTheme,
  resizeHitRunPresentationSession
} from "./theme/HitRunPresentationSession";
import {
  drawAmbientParticlesCanvas,
  SUMI_E_AMBIENT_POOL_RESOURCE
} from "../../shared/rendering/sumi-e";
import type { VisualParticlePool } from "../../shared/rendering/VisualParticlePool";

const RESOURCE_KEY = "HitRunBackdropSpec";

export function resolveMainCameraX(world: {
  query: (t: string) => readonly number[];
  getComponent: (e: number, t: string) => unknown;
}): number {
  const cameras = world.query("Camera2D");
  for (let i = 0; i < cameras.length; i++) {
    const cam = world.getComponent(cameras[i], "Camera2D") as Camera2DComponent | undefined;
    if (cam?.isMain) return cam.x ?? 0;
  }
  return 0;
}

export function resolveElapsed(world: {
  getResource: (k: string) => unknown;
  tick?: number;
}): number {
  const rs = world.getResource("RunState") as RunState | undefined;
  if (rs && typeof rs.elapsedTime === "number") return rs.elapsedTime;
  return ((world as { tick?: number }).tick ?? 0) / 60;
}

export const drawHitRunProceduralBackdrop: EffectDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world) {
    const gameConfig = world.getResource<{ viewportWidth?: number; viewportHeight?: number }>("GameConfig");
    const w = gameConfig?.viewportWidth ?? 800;
    const h = gameConfig?.viewportHeight ?? 600;
    const camX = resolveMainCameraX(world);
    const elapsed = resolveElapsed(world);

    resizeHitRunPresentationSession(world, w, h);
    const theme = getHitRunTheme(world);
    theme.renderBackdrop(ctx, w, h, camX, 0, elapsed);

    // Ambient Sumi-e particles (pool driven by SumiEAmbientSystem when theme is sumi-e).
    const pool = world.getResource<VisualParticlePool>(SUMI_E_AMBIENT_POOL_RESOURCE);
    if (pool) {
      drawAmbientParticlesCanvas(ctx, pool.getActiveParticles());
    }
  }
};

export const HIT_RUN_BACKDROP_RESOURCE = RESOURCE_KEY;
