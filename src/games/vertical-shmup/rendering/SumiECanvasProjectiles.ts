import type { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SHMUP_SUMI_E_THEME, resolveShmupBulletDrawContext } from "./ShmupVisualHelpers";

/** Sumi-e projectile silhouettes; colors remain semantic and collision geometry is untouched. */
export const drawSumiECanvasPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const bullet = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_SUMI_E_THEME.palette.player);
    if (!bullet) return;
    const { size } = bullet;
    const time = world.tick * 0.016;
    const palette = SHMUP_SUMI_E_THEME.palette;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = palette.player;
    ctx.lineWidth = Math.max(1.2, size * 0.22);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, size * 2.8);
    ctx.quadraticCurveTo(size * 0.15 * Math.sin(time * 8), size * 1.1, 0, size * 0.1);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.player;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.8);
    ctx.quadraticCurveTo(size * 0.6, -size * 0.6, size * 0.26, size * 0.65);
    ctx.quadraticCurveTo(0, size * 1.1, -size * 0.26, size * 0.65);
    ctx.quadraticCurveTo(-size * 0.6, -size * 0.6, 0, -size * 1.8);
    ctx.fill();
    ctx.restore();
  }
};

export const drawSumiECanvasEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const bullet = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_SUMI_E_THEME.palette.threat);
    if (!bullet) return;
    const { size, kind } = bullet;
    const palette = SHMUP_SUMI_E_THEME.palette;
    const time = world.tick * 0.016;
    const special = kind === "special";
    const scale = special ? 1.22 : kind === "hot" ? 0.82 : 1;
    ctx.save();
    ctx.translate(Math.sin(time * 1.8 + entity) * size * 0.06, 0);
    ctx.rotate(Math.sin(time * 1.2 + entity * 0.17) * 0.12);
    ctx.scale(scale, scale);
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.35);
    ctx.quadraticCurveTo(size * 1.45, -size * 0.2, size * 0.56, size * 1.05);
    ctx.quadraticCurveTo(0, size * 1.55, -size * 0.56, size * 1.05);
    ctx.quadraticCurveTo(-size * 1.45, -size * 0.2, 0, -size * 1.35);
    ctx.fill();
    ctx.fillStyle = palette.threat;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.92);
    ctx.quadraticCurveTo(size * 0.9, -size * 0.12, size * 0.34, size * 0.75);
    ctx.quadraticCurveTo(0, size * 1.08, -size * 0.34, size * 0.75);
    ctx.quadraticCurveTo(-size * 0.9, -size * 0.12, 0, -size * 0.92);
    ctx.fill();
    if (special) {
      ctx.strokeStyle = palette.threat;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.65, size * 1.9, 0, time * 0.2, time * 0.2 + Math.PI * 1.45);
      ctx.stroke();
    }
    ctx.restore();
  }
};