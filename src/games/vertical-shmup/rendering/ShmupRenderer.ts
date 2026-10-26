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

export function initializeShmupRenderer(renderer: Renderer<ShmupComponentRegistry, unknown>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerBackgroundEffect("shmup_starfield", drawShmupStarfield);
      r.registerShape("shmup_player", drawShmupPlayer);
      r.registerShape("shmup_enemy", drawShmupEnemy);
      r.registerShape("shmup_player_bullet", drawThemeCanvasPlayerBullet);
      r.registerShape("shmup_enemy_bullet", drawThemeCanvasEnemyBullet);
    },
    skia: (r) => {
      r.registerBackgroundEffect("shmup_starfield", drawSkiaShmupStarfield as never);
      r.registerShape("shmup_player", drawSkiaShmupPlayer as never);
      r.registerShape("shmup_enemy", drawSkiaShmupEnemy as never);
      r.registerShape("shmup_player_bullet", drawThemeSkiaPlayerBullet as never);
      r.registerShape("shmup_enemy_bullet", drawThemeSkiaEnemyBullet as never);
    }
  });
}
