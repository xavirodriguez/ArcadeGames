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

export const drawSpaceInvadersBullet: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const renderComp = world.getComponent(entity, "Render");
    if (!renderComp) return;
    const trail = getBulletTrailBuffer(renderComp);
    const setup = resolveBulletDrawSetup(world, entity, trail);
    if (!setup) return;
    const { customGeom, customGeomSize, render, bulletContext } = setup;
    if (customGeom) {
      ctx.save();
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size: customGeomSize,
        baseColor: render.color || colors.gold,
      });
      ctx.restore();
      return;
    }
    const {
      size, glowColor, coreColor, currentX, currentY, points,
      baseTrailAlpha, baseAuraAlpha, shadowBlurAmount, auraSizeScale,
    } = bulletContext;
    ctx.save();
    ctx.fillStyle = glowColor;
    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const { relX, relY, pointWidth } = computeTrailPointOffset(pt, currentX, currentY, size);
      ctx.globalAlpha = baseTrailAlpha * pt.alpha;
      ctx.fillRect(relX - pointWidth / 2, relY - pointWidth, pointWidth, pointWidth * 2);
    }
    ctx.globalAlpha = baseAuraAlpha;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = shadowBlurAmount;
    ctx.fillRect(-size * 1.25 * auraSizeScale, -size * 1.25 * auraSizeScale, size * 2.5 * auraSizeScale, size * 2.5 * auraSizeScale);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = glowColor;
    ctx.fillRect(-size / 2, -size, size, size * 2);
    ctx.fillStyle = coreColor;
    ctx.fillRect(-size / 4, -size * 0.7, size / 2, size * 1.4);
    ctx.restore();
  }
};

export const drawSpaceInvadersBoss: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const setup = resolveBossRenderSetup(world, entity);
    if (!setup) return;
    const { render, customGeom, flash, phase, accentColor, scaleMultiplier, scale, shakeX, shakeY, vibX, vibY, s, coreRadius, hpRatio } = setup;
    ctx.save();
    ctx.globalAlpha = flash.opacity;
    if (phase === 3) ctx.translate(shakeX, shakeY);
    ctx.scale(scale, scale);
    ctx.translate(vibX, vibY);
    ctx.scale(scaleMultiplier, scaleMultiplier);
    if (customGeom) {
      drawFromGeometryProfileCanvas(ctx, customGeom, { size: (render.size || 80), baseColor: flash.color });
      ctx.restore();
      return;
    }
    if (phase === 3) {
      const auraPulse = 1.0 + 0.25 * Math.sin(world.tick * 0.5);
      ctx.shadowColor = "#FF4444";
      ctx.shadowBlur = 20 * auraPulse;
    } else if (phase === 2) {
      ctx.shadowColor = "#F97316";
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = colors.gold;
      ctx.shadowBlur = 6;
    }
    ctx.fillStyle = flash.color;
    ctx.beginPath();
    const hullPts = computeBossHullPoints(s);
    ctx.moveTo(hullPts[0][0], hullPts[0][1]);
    for (let i = 1; i < hullPts.length; i++) ctx.lineTo(hullPts[i][0], hullPts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-s * 8, -s * 2);
    ctx.lineTo(-s * 8, -s * 6);
    ctx.moveTo(s * 8, -s * 2);
    ctx.lineTo(s * 8, -s * 6);
    ctx.stroke();
    ctx.fillStyle = phase === 3 ? colors.white : accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    if (hpRatio < 1.0) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-s * 6, -s * 2);
      ctx.lineTo(s * 2, s * 4);
      if (phase === 3) {
        ctx.moveTo(s * 5, -s * 3);
        ctx.lineTo(-s * 3, s * 5);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
};

export const drawSpaceInvadersShield: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15 } = render;
    const flash = applyHitFlash(render, render.color || colors.green);
    const color = flash.color;
    const shield = world.getComponent(entity, "Shield");
    const hp = shield ? shield.hp : 3;
    const maxHp = shield ? shield.maxHp : 3;
    const ratio = calculateShieldHpRatio(hp, maxHp);
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom =
      theme?.visualTheme?.shapeTokens?.customGeometries?.["shield_block"] ||
      theme?.visualTheme?.shapeTokens?.customGeometries?.["shield"] ||
      theme?.visualTheme?.shapeTokens?.customGeometries?.["wall"] ||
      theme?.visualTheme?.shapeTokens?.customGeometries?.["pared"];
    ctx.save();
    if (customGeom) {
      const erodeScale = 0.55 + 0.45 * ratio;
      ctx.globalAlpha = flash.opacity * (0.3 + 0.7 * ratio);
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size: size * 1.8 * erodeScale,
        baseColor: color,
        isHitFlashing: flash.opacity < 1.0 || ratio < 0.85,
      });
      ctx.restore();
      return;
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = flash.opacity * (0.15 + 0.5 * ratio);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = flash.opacity * (0.3 + 0.7 * ratio);
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    if (ratio < 1.0) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      const coords = calculateShieldCrackCoords(entity, size);
      ctx.moveTo(coords.x1, coords.y1);
      ctx.lineTo(coords.x2, coords.y2);
      if (ratio < 0.4) {
        ctx.moveTo(coords.x3, coords.y3);
        ctx.lineTo(coords.x4, coords.y4);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1.0;
  }
};

export const drawSpaceInvadersParticle: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const particleState = resolveParticleState(world, entity, render);
    const { progress, particleColor, currentSize } = particleState;
    ctx.save();
    ctx.globalAlpha = 1.0 - progress;
    ctx.fillStyle = particleColor;
    if (progress < 0.5) {
      ctx.shadowColor = particleColor;
      ctx.shadowBlur = 6 * (1.0 - progress);
    }
    ctx.beginPath();
    ctx.arc(0, 0, currentSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

export const spaceInvadersScreenShakeEffect: EffectDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world) {
    const gameState = world.getSingleton("GameState");
    if (gameState && gameState.screenShake && gameState.screenShake.duration > 0) {
      const { intensity, elapsed = 0, totalDuration = 0.3 } = gameState.screenShake as any;
      const progress = elapsed / (totalDuration || 0.3);
      const attackTime = 0.1;
      const sustainTime = 0.2;
      const decayTime = 0.7;
      let env = 1.0;
      if (progress < attackTime) env = progress / attackTime;
      else if (progress < attackTime + sustainTime) env = 1.0;
      else {
        const decayProgress = (progress - attackTime - sustainTime) / decayTime;
        env = Math.max(0, 1.0 - decayProgress);
      }
      const currentIntensity = intensity * env;
      const renderRandom = world.renderRandom;
      const dx = (renderRandom.next() - 0.5) * currentIntensity;
      const dy = (renderRandom.next() - 0.5) * currentIntensity;
      ctx.translate(dx, dy);
    }
  }
};
