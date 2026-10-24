import { ShapeDrawer, EffectDrawer, World, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { colors } from "../../../theme/colors";
import {
  applyHitFlash,
  isPlayerShooting,
  calculatePlayerTilt,
  calculateThrusterPlumeLength,
  resolveMuzzleFlashState,
  resolveShieldPulseState,
  resolveInvaderColor,
  resolveKamikazeAimVector,
  resolveBulletDrawSetup,
  resolveBossVisualState,
  resolveBossRenderSetup,
  resolveInvaderRenderSetup,
  resolveParticleState,
  resolveExplosionParticleData,
  computeBossHullPoints,
  computeTrailPointOffset,
} from "./SpaceInvadersVisualUtils";
import { calculateShieldHpRatio, calculateTeleporterShimmer, resolvePlayerRoleVisual, calculateShieldCrackCoords } from "../../shared/rendering/spaceInvadersMath";
import { EXPLOSION_PARTICLE_POOL, spawnLayeredExplosion, updateExplosionParticles } from "./ExplosionParticlePool";
import { CircularPositionBuffer } from "../../shared/rendering/SharedVFX";
import { drawFromGeometryProfileCanvas } from "../../shared/rendering/GenericEntityDrawer";

export { EXPLOSION_PARTICLE_POOL, spawnLayeredExplosion, updateExplosionParticles };

const bulletTrailMap = new WeakMap<any, CircularPositionBuffer>();

function getBulletTrailBuffer(render: any): CircularPositionBuffer {
  let buf = bulletTrailMap.get(render);
  if (!buf) {
    buf = new CircularPositionBuffer({
      capacity: 10,
      minDistance: 0.5,
      maxDiscontinuityDistance: 80,
      startAlpha: 1.0,
      endAlpha: 0.0,
      startWidthScale: 1.0,
      endWidthScale: 0.15
    });
    bulletTrailMap.set(render, buf);
  }
  return buf;
}

export function drawExplosionParticlesCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  for (let i = 0; i < EXPLOSION_PARTICLE_POOL.length; i++) {
    const data = resolveExplosionParticleData(EXPLOSION_PARTICLE_POOL[i]);
    if (!data) continue;
    const { ratio, type, x, y, radius, size, color } = data;
    if (type === "ring") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 * ratio;
      ctx.globalAlpha = ratio * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.1, radius), 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === "debris") {
      ctx.fillStyle = color;
      ctx.globalAlpha = ratio;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    } else if (type === "smoke") {
      ctx.fillStyle = color;
      ctx.globalAlpha = ratio * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.1, size), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export const drawExplosionBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx) {
    updateExplosionParticles();
    drawExplosionParticlesCanvas(ctx);
  }
};

export const drawSpaceInvadersPlayer: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 40 } = render;
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.playerGeometry;
    const playerComp = world.getComponent(entity, "Player");
    const role = playerComp?.role || "pioneer";
    const { roleColor } = resolvePlayerRoleVisual(role, theme);
    const flash = applyHitFlash(render, render.color || roleColor);
    const color = flash.color;
    ctx.save();
    ctx.globalAlpha = flash.opacity;
    const velocity = world.getComponent(entity, "Velocity");
    if (velocity) {
      const tilt = calculatePlayerTilt(velocity.vx);
      ctx.rotate(tilt);
    }
    if (customGeom) {
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size,
        baseColor: color,
        isHitFlashing: flash.opacity < 1.0,
      });
      ctx.restore();
      const health = world.getComponent(entity, "Health");
      const shieldState = resolveShieldPulseState(health, size, world.tick);
      if (shieldState.isInvulnerable) {
        const { shieldAlpha, radius } = shieldState;
        ctx.save();
        ctx.strokeStyle = colors.cyan;
        ctx.lineWidth = 3;
        ctx.globalAlpha = shieldAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    const tick = world.tick;
    if (role === "hunter") {
      const auraRadius = size * 1.8 + Math.sin(tick * 0.15) * 4;
      ctx.strokeStyle = "rgba(255, 0, 110, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (role === "sentinel") {
      ctx.strokeStyle = "rgba(0, 217, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(0, -size * 3);
      ctx.stroke();
    } else if (role === "pioneer") {
      ctx.strokeStyle = "rgba(0, 255, 65, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    } else if (role === "support") {
      ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }
    const plumeLength = calculateThrusterPlumeLength(tick, size);
    ctx.fillStyle = colors.orangeDark;
    ctx.beginPath();
    ctx.moveTo(-size / 5, size / 4);
    ctx.lineTo(size / 5, size / 4);
    ctx.lineTo(0, size / 4 + plumeLength);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.gold;
    ctx.beginPath();
    ctx.moveTo(-size / 8, size / 4);
    ctx.lineTo(size / 8, size / 4);
    ctx.lineTo(0, size / 4 + plumeLength * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(size / 4, -size / 6);
    ctx.lineTo(size / 2, size / 4);
    ctx.lineTo(size / 3, size / 4);
    ctx.lineTo(size / 5, size / 6);
    ctx.lineTo(-size / 5, size / 6);
    ctx.lineTo(-size / 3, size / 4);
    ctx.lineTo(-size / 2, size / 4);
    ctx.lineTo(-size / 4, -size / 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size / 3, size / 6);
    ctx.lineTo(-size / 3, -size / 3);
    ctx.moveTo(size / 3, size / 6);
    ctx.lineTo(size / 3, -size / 3);
    ctx.stroke();
    ctx.fillStyle = colors.white;
    ctx.fillRect(-size / 3 - 1, -size / 3, 2, size / 4);
    ctx.fillRect(size / 3 - 1, -size / 3, 2, size / 4);
    const isShooting = isPlayerShooting(world, entity);
    const { flashSize, muzzleFlashFrames, shouldDrawFlash } = resolveMuzzleFlashState(render, isShooting, tick);
    if (shouldDrawFlash) {
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 12;
      if (muzzleFlashFrames > 0) {
        ctx.beginPath();
        ctx.arc(0, -size / 2 - 4, flashSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#00FFFF";
      ctx.beginPath();
      ctx.arc(-size / 3, -size / 3 - 2, flashSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size / 3, -size / 3 - 2, flashSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }
    ctx.fillStyle = colors.cyan;
    ctx.beginPath();
    ctx.moveTo(0, -size / 3);
    ctx.lineTo(size / 6, -size / 10);
    ctx.lineTo(size / 8, size / 8);
    ctx.lineTo(-size / 8, size / 8);
    ctx.lineTo(-size / 6, -size / 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.moveTo(-size / 12, -size / 5);
    ctx.lineTo(0, -size / 4);
    ctx.lineTo(size / 12, -size / 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const health = world.getComponent(entity, "Health");
    const shieldState = resolveShieldPulseState(health, size, tick);
    if (shieldState.isInvulnerable) {
      const { shieldAlpha, radius } = shieldState;
      ctx.save();
      ctx.strokeStyle = colors.cyan;
      ctx.lineWidth = 3;
      ctx.globalAlpha = shieldAlpha;
      ctx.shadowColor = colors.cyan;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 240, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = colors.blue;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }
};

export const drawSpaceInvadersInvader: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const setup = resolveInvaderRenderSetup(world, entity);
    if (!setup) return;
    const { size, customGeom, isTeleporter, flash, tick } = setup;
    if (customGeom) {
      ctx.save();
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size: size * 1.8,
        baseColor: flash.color,
        globalAlpha: flash.opacity,
      });
      ctx.restore();
      return;
    }
    const shimmerAlpha = calculateTeleporterShimmer(isTeleporter, tick);
    if (isTeleporter) {
      ctx.shadowColor = "#00D9FF";
      ctx.shadowBlur = 8 * shimmerAlpha;
    }
    ctx.globalAlpha = flash.opacity * shimmerAlpha;
    ctx.fillStyle = flash.color;
    const s = size / 11;
    const animPhase = Math.floor(tick / 15) % 2 === 0;
    ctx.fillRect(-s * 4, -s * 5, s, s);
    ctx.fillRect(s * 3, -s * 5, s, s);
    ctx.fillRect(-s * 3, -s * 4, s, s);
    ctx.fillRect(s * 2, -s * 4, s, s);
    ctx.fillRect(-s * 4, -s * 3, s * 8, s * 4);
    if (animPhase) {
      ctx.fillRect(-s * 5, -s, s, s * 3);
      ctx.fillRect(s * 4, -s, s, s * 3);
      ctx.fillRect(-s * 3, s, s * 2, s);
      ctx.fillRect(s * 1, s, s * 2, s);
      ctx.fillRect(-s * 2, s * 2, s, s);
      ctx.fillRect(s * 1, s * 2, s, s);
    } else {
      ctx.fillRect(-s * 4, -s, s, s * 2);
      ctx.fillRect(s * 3, -s, s, s * 2);
      ctx.fillRect(-s * 5, s, s, s * 2);
      ctx.fillRect(s * 4, s, s, s * 2);
      ctx.fillRect(-s * 2, s, s, s * 2);
      ctx.fillRect(s * 1, s, s * 2, s);
    }
    const eyePulse = (1.0 + Math.sin(tick * 0.3)) * 0.5;
    ctx.fillStyle = colors.redHot;
    ctx.shadowColor = colors.redHot;
    ctx.shadowBlur = 6 * eyePulse;
    ctx.fillRect(-s * 2, -s * 2, s, s);
    ctx.fillRect(s, -s * 2, s, s);
    ctx.shadowBlur = 0;
    const kamiAim = resolveKamikazeAimVector(world, entity);
    if (kamiAim) {
      const { phase, relTargetX, relTargetY, blinkAlpha, pulse, bottomRelY } = kamiAim;
      if (phase === "telegraphing") {
        ctx.save();
        ctx.globalAlpha = blinkAlpha;
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(relTargetX, relTargetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = colors.redHot;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(relTargetX, relTargetY, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(relTargetX - 16, relTargetY);
        ctx.lineTo(relTargetX + 16, relTargetY);
        ctx.moveTo(relTargetX, relTargetY - 16);
        ctx.lineTo(relTargetX, relTargetY + 16);
        ctx.stroke();
        ctx.restore();
      } else if (phase === "warning") {
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = colors.danger;
        ctx.strokeStyle = colors.magentaHot;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, bottomRelY);
        ctx.lineTo(-8, bottomRelY - 14);
        ctx.lineTo(8, bottomRelY - 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1.0;
  }
};
