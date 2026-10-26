import type { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SHMUP_SUMI_E_THEME } from "./ShmupVisualHelpers";
import { resolveShmupPlayerDrawContext } from "./ShmupVisualHelpers";

/** Brush-ink shrine glider. Pure presentation; geometry and hitbox are unchanged. */
export const drawSumiECanvasPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const player = resolveShmupPlayerDrawContext(world, entity);
    if (!player || player.shouldBlink) return;
    const { size, time, moveX, invulnerable, isShooting } = player;
    const palette = SHMUP_SUMI_E_THEME.palette;
    ctx.save();

    // A restrained blue brush trail identifies the player without neon bloom.
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = palette.player;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, size * 0.62);
    ctx.quadraticCurveTo(-size * 0.24 + moveX * size * 0.12, size * 1.05, -size * 0.08, size * (1.5 + 0.08 * Math.sin(time * 7)));
    ctx.moveTo(size * 0.18, size * 0.62);
    ctx.quadraticCurveTo(size * 0.24 + moveX * size * 0.12, size * 1.05, size * 0.08, size * (1.5 + 0.08 * Math.sin(time * 7 + 1)));
    ctx.stroke();
    ctx.restore();

    // Wide ink wings and a narrow central fuselage suggest a flying shrine/warrior craft.
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);
    ctx.quadraticCurveTo(size * 0.2, -size * 0.55, size * 0.88, -size * 0.08);
    ctx.lineTo(size * 1.02, size * 0.26);
    ctx.quadraticCurveTo(size * 0.58, size * 0.18, size * 0.3, size * 0.55);
    ctx.lineTo(size * 0.12, size * 0.38);
    ctx.lineTo(0, size * 0.62);
    ctx.lineTo(-size * 0.12, size * 0.38);
    ctx.lineTo(-size * 0.3, size * 0.55);
    ctx.quadraticCurveTo(-size * 0.58, size * 0.18, -size * 1.02, size * 0.26);
    ctx.lineTo(-size * 0.88, -size * 0.08);
    ctx.quadraticCurveTo(-size * 0.2, -size * 0.55, 0, -size * 1.2);
    ctx.closePath();
    ctx.fill();

    // Vermilion-free blue flight markings: red remains reserved for hostile cues.
    ctx.strokeStyle = palette.player;
    ctx.lineWidth = Math.max(1.5, size * 0.045);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.86);
    ctx.lineTo(size * 0.16, -size * 0.16);
    ctx.lineTo(size * 0.08, size * 0.26);
    ctx.moveTo(0, -size * 0.86);
    ctx.lineTo(-size * 0.16, -size * 0.16);
    ctx.lineTo(-size * 0.08, size * 0.26);
    ctx.stroke();

    // Small gold ofuda on the hull is a reward/ally signal, not an attack indicator.
    ctx.fillStyle = palette.reward;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.24);
    ctx.lineTo(size * 0.09, -size * 0.08);
    ctx.lineTo(0, size * 0.08);
    ctx.lineTo(-size * 0.09, -size * 0.08);
    ctx.closePath();
    ctx.fill();

    if (isShooting) {
      ctx.strokeStyle = palette.player;
      ctx.lineWidth = Math.max(2, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(-size * 0.72, -size * 0.06);
      ctx.lineTo(-size * 0.88, -size * 0.36);
      ctx.moveTo(size * 0.72, -size * 0.06);
      ctx.lineTo(size * 0.88, -size * 0.36);
      ctx.stroke();
    }

    if (invulnerable) {
      ctx.strokeStyle = palette.player;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([size * 0.18, size * 0.12]);
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.28, time * 0.4, time * 0.4 + Math.PI * 1.7);
      ctx.stroke();
    }
    ctx.restore();
  }
};
