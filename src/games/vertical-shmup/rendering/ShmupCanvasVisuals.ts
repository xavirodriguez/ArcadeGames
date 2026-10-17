import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { colors } from "../../../theme/colors";
import {
  computeShmupStarfield,
  resolveShmupPlayerDrawContext,
  resolveShmupEnemyDrawContext,
  resolveShmupBulletDrawContext,
} from "./ShmupVisualHelpers";

export const drawShmupPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const pCtx = resolveShmupPlayerDrawContext(world, entity);
    if (!pCtx || pCtx.shouldBlink) return;

    const { invulnerable, time, size, primaryColor } = pCtx;

    ctx.save();

    // Invulnerability shield aura
    if (invulnerable) {
      ctx.save();
      ctx.strokeStyle = colors.cyan;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = colors.cyan;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Engine Thruster Flame
    const flicker = 0.8 + 0.4 * Math.sin(time * 30);
    const plumeLength = size * 0.9 * flicker;
    ctx.save();
    ctx.fillStyle = colors.orange;
    ctx.shadowBlur = 12;
    ctx.shadowColor = colors.orange;
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.5);
    ctx.lineTo(size * 0.25, size * 0.5);
    ctx.lineTo(0, size * 0.5 + plumeLength);
    ctx.closePath();
    ctx.fill();

    // Thruster core
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, size * 0.5);
    ctx.lineTo(size * 0.15, size * 0.5);
    ctx.lineTo(0, size * 0.5 + plumeLength * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Main Fighter Hull (Arcade Jet Wings)
    ctx.shadowBlur = 12;
    ctx.shadowColor = primaryColor;
    ctx.fillStyle = primaryColor;

    ctx.beginPath();
    // Nose tip
    ctx.moveTo(0, -size * 1.1);
    // Right wingtip
    ctx.lineTo(size * 0.95, size * 0.75);
    // Right wing notch
    ctx.lineTo(size * 0.45, size * 0.45);
    // Tail center
    ctx.lineTo(0, size * 0.65);
    // Left wing notch
    ctx.lineTo(-size * 0.45, size * 0.45);
    // Left wingtip
    ctx.lineTo(-size * 0.95, size * 0.75);
    ctx.closePath();
    ctx.fill();

    // Wing panels / accent lines
    ctx.strokeStyle = colors.white;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(size * 0.6, size * 0.5);
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.stroke();

    // Cockpit Glass Canopy
    ctx.fillStyle = colors.cyan;
    ctx.shadowBlur = 8;
    ctx.shadowColor = colors.white;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 0.22, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawShmupEnemy: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const eCtx = resolveShmupEnemyDrawContext(world, entity);
    if (!eCtx) return;

    const { path, size, enemyColor, time } = eCtx;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = enemyColor;

    // Engine glow at top
    const pulse = 0.8 + 0.3 * Math.sin(time * 20 + entity);
    ctx.fillStyle = colors.orange;
    ctx.beginPath();
    ctx.arc(0, -size * 0.5, size * 0.25 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Main Enemy Silhouette
    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.moveTo(0, size * 1.1);
    ctx.lineTo(size * 0.9, -size * 0.2);
    ctx.lineTo(size * 0.4, -size * 0.85);
    ctx.lineTo(0, -size * 0.5);
    ctx.lineTo(-size * 0.4, -size * 0.85);
    ctx.lineTo(-size * 0.9, -size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Cannons on wingtips
    ctx.fillStyle = colors.white;
    ctx.fillRect(size * 0.8, -size * 0.2, size * 0.12, size * 0.6);
    ctx.fillRect(-size * 0.92, -size * 0.2, size * 0.12, size * 0.6);

    // Glowing Central Core
    ctx.shadowBlur = 12;
    ctx.shadowColor = colors.yellow;
    ctx.fillStyle = path?.kind === "sine" ? colors.amber : colors.white;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawShmupPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const bCtx = resolveShmupBulletDrawContext(world, entity, 4, colors.amber);
    if (!bCtx) return;
    const { size, color } = bCtx;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    // Outer plasma aura
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.75, -size * 2.5, size * 1.5, size * 5);

    // Core laser beam
    ctx.fillStyle = colors.white;
    ctx.fillRect(-size * 0.35, -size * 2, size * 0.7, size * 4);

    ctx.restore();
  }
};

export const drawShmupEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const bCtx = resolveShmupBulletDrawContext(world, entity, 5, colors.danger);
    if (!bCtx) return;
    const { size, color } = bCtx;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    // Hazard plasma orb
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // White energy core
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawShmupStarfield: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, stars } = computeShmupStarfield(world);

    ctx.save();
    ctx.fillStyle = colors.backgroundDark;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i]!;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.rawX, star.y, star.w, star.h);
    }

    ctx.restore();
  }
};
