import type { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SHMUP_SUMI_E_THEME, resolveShmupEnemyDrawContext } from "./ShmupVisualHelpers";

/** Ink-yokai silhouettes keep enemy families readable without neon or gradients. */
export const drawSumiECanvasEnemy: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const enemy = resolveShmupEnemyDrawContext(world, entity);
    if (!enemy) return;
    const { size, time, archetype, isTelegraphing } = enemy;
    const palette = SHMUP_SUMI_E_THEME.palette;
    const boss = archetype === "boss";
    const scale = boss ? 1.18 : archetype === "armored" ? 1.05 : 1;
    ctx.save();
    ctx.scale(scale, scale);

    if (isTelegraphing) {
      ctx.strokeStyle = palette.threat;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = palette.ink;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(1.5, size * 0.055);
    ctx.lineJoin = "round";

    if (archetype === "support") {
      // Lantern spirit with a trailing brush tail.
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.05, size * 0.64, size * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-size * 0.34, size * 0.52);
      ctx.quadraticCurveTo(-size * 0.18, size * 1.02, size * 0.04, size * 1.24);
      ctx.quadraticCurveTo(size * 0.18, size * 0.88, size * 0.36, size * 0.62);
      ctx.fill();
    } else if (archetype === "interceptor") {
      // Tengu-like long beak and swept silhouette.
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.12);
      ctx.lineTo(size * 0.68, -size * 0.3);
      ctx.lineTo(size * 0.38, size * 0.5);
      ctx.lineTo(0, size * 0.96);
      ctx.lineTo(-size * 0.38, size * 0.5);
      ctx.lineTo(-size * 0.68, -size * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, -size * 0.18);
      ctx.lineTo(0, size * 0.64);
      ctx.lineTo(size * 0.22, -size * 0.18);
      ctx.fill();
    } else {
      // Common ghost and oni mask share a mask silhouette; heavy types get horns.
      ctx.beginPath();
      ctx.moveTo(-size * 0.74, -size * 0.32);
      ctx.quadraticCurveTo(-size * 0.7, -size * 0.96, 0, -size * 0.88);
      ctx.quadraticCurveTo(size * 0.7, -size * 0.96, size * 0.74, -size * 0.32);
      ctx.lineTo(size * 0.56, size * 0.42);
      ctx.quadraticCurveTo(0, size * 1.05, -size * 0.56, size * 0.42);
      ctx.closePath();
      ctx.fill();
      if (archetype === "armored" || boss) {
        ctx.beginPath();
        ctx.moveTo(-size * 0.48, -size * 0.56);
        ctx.lineTo(-size * 0.84, -size * 1.05);
        ctx.lineTo(-size * 0.16, -size * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size * 0.48, -size * 0.56);
        ctx.lineTo(size * 0.84, -size * 1.05);
        ctx.lineTo(size * 0.16, -size * 0.78);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Vermilion eyes are the sole saturated enemy cue.
    ctx.fillStyle = palette.threat;
    const eyeY = archetype === "interceptor" ? -size * 0.08 : -size * 0.18;
    ctx.beginPath();
    ctx.ellipse(-size * 0.25, eyeY, size * 0.105, size * 0.075, -0.18, 0, Math.PI * 2);
    ctx.ellipse(size * 0.25, eyeY, size * 0.105, size * 0.075, 0.18, 0, Math.PI * 2);
    ctx.fill();

    if (boss) {
      ctx.strokeStyle = palette.threat;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * (1.12 + 0.035 * Math.sin(time * 2)), Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    // Impact feedback is a compact radial ink splatter, derived only from tick/entity id.
    const hit = Math.max(0, Math.min(1, (enemy.render.hitFlashFrames ?? 0) / 5));
    if (hit > 0) {
      ctx.save();
      ctx.globalAlpha = hit * 0.78;
      ctx.strokeStyle = palette.ink;
      ctx.fillStyle = palette.ink;
      ctx.lineCap = "round";
      for (let mark = 0; mark < 9; mark += 1) {
        const angle = mark * 2.399963 + entity * 0.37;
        const inner = size * (0.45 + (mark % 3) * 0.08);
        const outer = size * (0.85 + (mark % 4) * 0.12) * hit;
        ctx.lineWidth = 1 + (mark % 3) * 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
        if (mark % 2 === 0) {
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * outer, Math.sin(angle) * outer, 1.2 + (mark % 3) * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
};
