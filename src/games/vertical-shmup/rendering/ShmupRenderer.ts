import { Renderer, RendererUtils } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
import { drawShmupPlayer, drawShmupEnemy, drawShmupPlayerBullet, drawShmupEnemyBullet, drawSolarBloomBoss, drawShmupBackground } from "./ShmupCanvasVisuals";

export function initializeShmupRenderer(renderer: Renderer<ShmupComponentRegistry, unknown>): void {
  renderer.registerBackgroundEffect("shmup_bg", drawShmupBackground);

  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("shmup_player", drawShmupPlayer);
      r.registerShape("shmup_enemy", drawShmupEnemy);
      r.registerShape("shmup_player_bullet", drawShmupPlayerBullet);
      r.registerShape("shmup_enemy_bullet", drawShmupEnemyBullet);
      r.registerShape("shmup_boss", drawSolarBloomBoss);
    },
    skia: () => {}
  });
}
