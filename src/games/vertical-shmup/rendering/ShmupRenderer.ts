import { Renderer, RendererUtils } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
import {
  drawShmupPlayer,
  drawShmupEnemy,
  drawShmupStarfield
} from "./ShmupCanvasVisuals";
import {
  drawSkiaShmupPlayer,
  drawSkiaShmupEnemy,
  drawSkiaShmupStarfield
} from "./ShmupSkiaVisuals";
import {
  drawThemeCanvasPlayerBullet,
  drawThemeCanvasEnemyBullet,
  drawThemeSkiaPlayerBullet,
  drawThemeSkiaEnemyBullet
} from "./ShmupProjectileThemeRouting";
import { drawCanvasParticle, drawSkiaParticle } from "./ShmupParticleVisuals";
import { createShmupBloomPostProcess } from "./ShmupBloomPostProcess";
import { createShmupDamageVignettePostProcess } from "./ShmupDamageVignettePostProcess";
import {
  FloatingTextScoreEffect,
  SkiaFloatingTextScoreEffect,
  registerSharedVFXAssets
} from "../../shared/rendering/SharedVFX";

export function initializeShmupRenderer(renderer: Renderer<ShmupComponentRegistry, unknown>): void {
  // Shared VFX shapes (floating_text, shockwave, etc.) when available.
  try {
    registerSharedVFXAssets(renderer as never);
  } catch {
    /* optional on backends without full shared registry */
  }

  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerBackgroundEffect("shmup_starfield", drawShmupStarfield);
      r.registerShape("shmup_player", drawShmupPlayer);
      r.registerShape("shmup_enemy", drawShmupEnemy);
      r.registerShape("shmup_player_bullet", drawThemeCanvasPlayerBullet);
      r.registerShape("shmup_enemy_bullet", drawThemeCanvasEnemyBullet);
      r.registerShape("particle", drawCanvasParticle as never);
      r.registerShape("floating_text", FloatingTextScoreEffect as never);
      r.registerPostProcessEffect?.("shmup_bloom", createShmupBloomPostProcess() as never);
      r.registerPostProcessEffect?.("shmup_damage_vignette", createShmupDamageVignettePostProcess() as never);
    },
    skia: (r) => {
      r.registerBackgroundEffect("shmup_starfield", drawSkiaShmupStarfield as never);
      r.registerShape("shmup_player", drawSkiaShmupPlayer as never);
      r.registerShape("shmup_enemy", drawSkiaShmupEnemy as never);
      r.registerShape("shmup_player_bullet", drawThemeSkiaPlayerBullet as never);
      r.registerShape("shmup_enemy_bullet", drawThemeSkiaEnemyBullet as never);
      r.registerShape("particle", drawSkiaParticle as never);
      r.registerShape("floating_text", SkiaFloatingTextScoreEffect as never);
    }
  });
}
