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
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 * ratio;
      ctx.globalAlpha = ratio * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.1, radius), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (type === "debris") {
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = ratio;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.restore();
    } else if (type === "smoke") {
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = ratio * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.1, size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * Background drawer for layered visual explosion particles.
 */
export const drawExplosionBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx) {
    updateExplosionParticles();
    drawExplosionParticlesCanvas(ctx);
  }
};

/**
 * Visuals for the player ship. Supports Concept Pack geometry overrides.
 */
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

    // 1. Dynamic tilt/lean based on horizontal velocity
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

      // Defensive neon shield if invulnerable
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

/**
 * Visuals for an invader. Supports Concept Pack enemy geometry overrides.
 */
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

/**
 * Visuals for bullets using CircularPositionBuffer or Concept Pack geometry.
 */
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
      size,
      glowColor,
      coreColor,
      currentX,
      currentY,
      points,
      baseTrailAlpha,
      baseAuraAlpha,
      shadowBlurAmount,
      auraSizeScale,
    } = bulletContext;

    ctx.save();

    ctx.fillStyle = glowColor;
    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const relX = pt.x - currentX;
      const relY = pt.y - currentY;
      const pointWidth = size * pt.widthScale;

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

/**
 * Visuals for the Boss flagship. Supports Concept Pack boss geometry overrides.
 */
export const drawSpaceInvadersBoss: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const setup = resolveBossRenderSetup(world, entity);
    if (!setup) return;

    const { render, customGeom, flash, phase, accentColor, scaleMultiplier, scale, shakeX, shakeY, vibX, vibY, s, coreRadius, hpRatio } = setup;

    ctx.save();
    ctx.globalAlpha = flash.opacity;
    if (phase === 3) {
      ctx.translate(shakeX, shakeY);
    }
    ctx.scale(scale, scale);

    ctx.translate(vibX, vibY);
    ctx.scale(scaleMultiplier, scaleMultiplier);

    if (customGeom) {
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size: (render.size || 80),
        baseColor: flash.color,
      });
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
    for (let i = 1; i < hullPts.length; i++) {
      ctx.lineTo(hullPts[i][0], hullPts[i][1]);
    }
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

/**
 * Visuals for shield blocks.
 */
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

    ctx.save();

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

/**
 * Visuals for particles.
 */
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

/**
 * Screen shake background effect.
 */
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
      if (progress < attackTime) {
        env = progress / attackTime;
      } else if (progress < attackTime + sustainTime) {
        env = 1.0;
      } else {
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
