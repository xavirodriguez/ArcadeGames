import { Renderer, RendererUtils } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
import {
  drawShmupPlayer,
  drawShmupEnemy,
  drawSolarBloomBoss,
  drawShmupPlayerBullet,
  drawShmupEnemyBullet,
  drawSolarParallaxBackground,
  drawSolarPurificationWave
} from "./ShmupCanvasVisuals";

export function initializeShmupRenderer(renderer: Renderer<ShmupComponentRegistry, unknown>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerBackgroundEffect("shmup_solar_parallax", drawSolarParallaxBackground);
      r.registerBackgroundEffect("solar_purification_wave", drawSolarPurificationWave);
      r.registerShape("shmup_player", drawShmupPlayer);
      r.registerShape("shmup_enemy", drawShmupEnemy);
      r.registerShape("solar_bloom_boss", drawSolarBloomBoss);
      r.registerShape("shmup_player_bullet", drawShmupPlayerBullet);
      r.registerShape("shmup_enemy_bullet", drawShmupEnemyBullet);
    },
    skia: () => {}
  });
}
