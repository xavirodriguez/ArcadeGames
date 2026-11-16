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

/** Minimal filled-circle particle for SharedParticlePool / spawnLayeredExplosion debris. */
function drawCanvasParticle(ctx: CanvasRenderingContext2D, entity: { size?: number; color?: string }): void {
  const size = entity.size ?? 3;
  const color = entity.color ?? "#ffffff";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.5, size * 0.5), 0, Math.PI * 2);
  ctx.fill();
}

function drawSkiaParticle(
  canvas: { drawCircle: (x: number, y: number, r: number, paint: unknown) => void },
  entity: { size?: number; color?: string },
  paintFactory?: { Color: (c: string) => unknown; setColor: (p: unknown, c: unknown) => void; Make: () => unknown }
): void {
  if (!paintFactory) return;
  const size = entity.size ?? 3;
  const paint = paintFactory.Make();
  paintFactory.setColor(paint, paintFactory.Color(entity.color ?? "#ffffff"));
  canvas.drawCircle(0, 0, Math.max(0.5, size * 0.5), paint);
}

export function initializeShmupRenderer(renderer: Renderer<ShmupComponentRegistry, unknown>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerBackgroundEffect("shmup_starfield", drawShmupStarfield);
      r.registerShape("shmup_player", drawShmupPlayer);
      r.registerShape("shmup_enemy", drawShmupEnemy);
      r.registerShape("shmup_player_bullet", drawThemeCanvasPlayerBullet);
      r.registerShape("shmup_enemy_bullet", drawThemeCanvasEnemyBullet);
      r.registerShape("particle", drawCanvasParticle as never);
    },
    skia: (r) => {
      r.registerBackgroundEffect("shmup_starfield", drawSkiaShmupStarfield as never);
      r.registerShape("shmup_player", drawSkiaShmupPlayer as never);
      r.registerShape("shmup_enemy", drawSkiaShmupEnemy as never);
      r.registerShape("shmup_player_bullet", drawThemeSkiaPlayerBullet as never);
      r.registerShape("shmup_enemy_bullet", drawThemeSkiaEnemyBullet as never);
      r.registerShape("particle", drawSkiaParticle as never);
    }
  });
}
