import { ShapeDrawer } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { colors } from "../../../theme/colors";
import {
  isPlayerShooting,
  calculatePlayerTilt,
  calculateThrusterPlumeLength,
  resolveMuzzleFlashState,
  resolveShieldPulseState,
  resolveInvaderColor,
  resolveKamikazeAimVector,
  resolveBulletTrailContext,
  resolveBossVisualState,
  resolveParticleState,
  getBossPolygonPoints,
  drawShieldAdapter,
  drawParticleAdapter,
  drawExplosionParticlesAdapter,
} from "./SpaceInvadersVisualUtils";
import { calculateTeleporterShimmer, resolvePlayerRoleVisual } from "../../shared/rendering/spaceInvadersMath";
import { safeGetRenderComponent, getRenderFlash } from "./RenderHelper";
import { EXPLOSION_PARTICLE_POOL, updateExplosionParticles } from "./ExplosionParticlePool";

import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { CircularPositionBuffer } from "../../shared/rendering/SharedVFX";
import { SkiaDrawAdapter } from "../../shared/rendering/DrawAdapter";
import { tryDrawCustomGeometryAdapter } from "../../shared/rendering/GenericEntityDrawer";

const bulletSkiaTrailMap = new WeakMap<any, CircularPositionBuffer>();

function getBulletSkiaTrailBuffer(render: any): CircularPositionBuffer {
  let buf = bulletSkiaTrailMap.get(render);
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
    bulletSkiaTrailMap.set(render, buf);
  }
  return buf;
}

export function drawExplosionParticlesSkia(canvas: any): void {
  drawExplosionParticlesAdapter(new SkiaDrawAdapter(canvas));
}

/**
 * Background drawer for Skia layered visual explosion particles.
 */
export const drawSkiaExplosionBackgroundEffect = {
  draw(canvas: any) {
    updateExplosionParticles();
    drawExplosionParticlesSkia(canvas);
  }
};

const cachedPlayerPaths = new WeakMap<any, { chassis: any; cockpit: any; reflection: any }>();

/**
 * Visuals for the player ship using React Native Skia. Supports Concept Pack geometry overrides.
 */
export const drawSkiaSpaceInvadersPlayer: ShapeDrawer<any, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;

    const playerComp = world.getComponent(entity, "Player");
    const role = playerComp?.role || "pioneer";
    const roleInfo = resolvePlayerRoleVisual(role, world.getResource("Theme"));

    const flash = getRenderFlash(render, roleInfo.roleColor, 40);
    const size = flash.size;
    const colorStr = flash.color;
    const opacity = flash.opacity;

    canvas.save();

    const velocity = world.getComponent(entity, "Velocity");
    if (velocity) {
      canvas.rotate((calculatePlayerTilt(velocity.vx) * 180) / Math.PI, 0, 0);
    }

    const adapter = new SkiaDrawAdapter(canvas);
    if (tryDrawCustomGeometryAdapter(adapter, world, "player", { size, baseColor: colorStr, globalAlpha: opacity })) {
      canvas.restore();

      const health = world.getComponent(entity, "Health");
      const shieldState = resolveShieldPulseState(health, size, world.tick);
      if (shieldState.isInvulnerable) {
        canvas.save();
        const paint = getPaint();
        paint.reset();
        paint.setAntiAlias(true);
        paint.setStyle(Skia!.PaintStyle.Stroke);
        paint.setColor(Skia!.Color(colors.cyan));
        paint.setStrokeWidth(3);
        paint.setAlphaf(shieldState.shieldAlpha);
        canvas.drawCircle(0, 0, shieldState.radius, paint);
        canvas.restore();
      }
      return;
    }

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);

    const tick = world.tick;
    if (role === "hunter") {
      paint.setStyle(Skia!.PaintStyle.Stroke);
      paint.setColor(Skia!.Color("rgba(255, 0, 110, 0.4)"));
      paint.setStrokeWidth(1.5);
      canvas.drawCircle(0, 0, size * 1.8 + Math.sin(tick * 0.15) * 4, paint);
    } else if (role === "sentinel") {
      paint.setStyle(Skia!.PaintStyle.Stroke);
      paint.setColor(Skia!.Color("rgba(0, 217, 255, 0.5)"));
      paint.setStrokeWidth(1);
      canvas.drawLine(0, -size / 2, 0, -size * 3, paint);
    } else if (role === "pioneer") {
      paint.setStyle(Skia!.PaintStyle.Stroke);
      paint.setColor(Skia!.Color("rgba(0, 255, 65, 0.35)"));
      paint.setStrokeWidth(2);
      canvas.drawCircle(0, 0, size * 0.85, paint);
    } else if (role === "support") {
      paint.setStyle(Skia!.PaintStyle.Stroke);
      paint.setColor(Skia!.Color("rgba(255, 215, 0, 0.4)"));
      paint.setStrokeWidth(1.5);
      canvas.drawCircle(0, 0, size * 0.9, paint);
    }

    const plumeLength = calculateThrusterPlumeLength(tick, size);

    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(colors.orangeDark));
    paint.setAlphaf(opacity * 0.8);
    const outerFlame = Skia!.Path.Make();
    outerFlame.moveTo(-size / 5, size / 4);
    outerFlame.lineTo(size / 5, size / 4);
    outerFlame.lineTo(0, size / 4 + plumeLength);
    outerFlame.close();
    canvas.drawPath(outerFlame, paint);

    paint.setColor(Skia!.Color(colors.gold));
    paint.setAlphaf(opacity);
    const innerFlame = Skia!.Path.Make();
    innerFlame.moveTo(-size / 8, size / 4);
    innerFlame.lineTo(size / 8, size / 4);
    innerFlame.lineTo(0, size / 4 + plumeLength * 0.6);
    innerFlame.close();
    canvas.drawPath(innerFlame, paint);

    let paths = cachedPlayerPaths.get(render);
    if (!paths) {
      const chassis = Skia!.Path.Make();
      chassis.moveTo(0, -size / 2);
      chassis.lineTo(size / 4, -size / 6);
      chassis.lineTo(size / 2, size / 4);
      chassis.lineTo(size / 3, size / 4);
      chassis.lineTo(size / 5, size / 6);
      chassis.lineTo(-size / 5, size / 6);
      chassis.lineTo(-size / 3, size / 4);
      chassis.lineTo(-size / 2, size / 4);
      chassis.lineTo(-size / 4, -size / 6);
      chassis.close();

      const cockpit = Skia!.Path.Make();
      cockpit.moveTo(0, -size / 3);
      cockpit.lineTo(size / 6, -size / 10);
      cockpit.lineTo(size / 8, size / 8);
      cockpit.lineTo(-size / 8, size / 8);
      cockpit.lineTo(-size / 6, -size / 10);
      cockpit.close();

      const reflection = Skia!.Path.Make();
      reflection.moveTo(-size / 12, -size / 5);
      reflection.lineTo(0, -size / 4);
      reflection.lineTo(size / 12, -size / 5);
      reflection.close();

      paths = { chassis, cockpit, reflection };
      cachedPlayerPaths.set(render, paths);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(colorStr));
    paint.setAlphaf(opacity);
    canvas.drawPath(paths.chassis, paint);

    paint.setStyle(Skia!.PaintStyle.Stroke);
    paint.setColor(Skia!.Color(colors.cyan));
    paint.setStrokeWidth(2);
    canvas.drawLine(-size / 3, size / 6, -size / 3, -size / 3, paint);
    canvas.drawLine(size / 3, size / 6, size / 3, -size / 3, paint);

    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(colors.white));
    canvas.drawRect(Skia!.XYWHRect(-size / 3 - 1, -size / 3, 2, size / 4), paint);
    canvas.drawRect(Skia!.XYWHRect(size / 3 - 1, -size / 3, 2, size / 4), paint);

    const isShooting = isPlayerShooting(world, entity);
    const { flashSize, muzzleFlashFrames, shouldDrawFlash } = resolveMuzzleFlashState(render, isShooting, tick);
    if (shouldDrawFlash) {
      if (muzzleFlashFrames > 0) {
        paint.setColor(Skia!.Color("#FFFFFF"));
        canvas.drawCircle(0, -size / 2 - 4, flashSize * 1.5, paint);
      }
      paint.setColor(Skia!.Color("#00FFFF"));
      canvas.drawCircle(-size / 3, -size / 3 - 2, flashSize, paint);
      canvas.drawCircle(size / 3, -size / 3 - 2, flashSize, paint);
    }

    paint.setColor(Skia!.Color(colors.cyan));
    canvas.drawPath(paths.cockpit, paint);

    paint.setColor(Skia!.Color(colors.white));
    canvas.drawPath(paths.reflection, paint);

    canvas.restore();

    const health = world.getComponent(entity, "Health");
    const shieldState = resolveShieldPulseState(health, size, tick);
    if (shieldState.isInvulnerable) {
      canvas.save();

      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia!.PaintStyle.Fill);
      paint.setColor(Skia!.Color("rgba(0, 240, 255, 0.08)"));
      paint.setAlphaf(shieldState.shieldAlpha * 0.5);
      canvas.drawCircle(0, 0, shieldState.radius, paint);

      paint.setStyle(Skia!.PaintStyle.Stroke);
      paint.setColor(Skia!.Color(colors.cyan));
      paint.setStrokeWidth(3);
      paint.setAlphaf(shieldState.shieldAlpha);
      canvas.drawCircle(0, 0, shieldState.radius, paint);

      paint.setColor(Skia!.Color(colors.blue));
      paint.setStrokeWidth(1.5);
      paint.setAlphaf(shieldState.shieldAlpha * 0.6);
      canvas.drawCircle(0, 0, shieldState.radius * 0.82, paint);

      canvas.restore();
    }
  }
};

/**
 * Visuals for an invader using React Native Skia. Supports Concept Pack enemy geometry.
 */
export const drawSkiaSpaceInvadersInvader: ShapeDrawer<any, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;

    const invaderComp = world.getComponent(entity, "Invader");
    const enemyTag = world.getComponent(entity, "EnemyTag");
    const { baseColor, isTeleporter } = resolveInvaderColor(render, invaderComp, enemyTag);

    const flash = getRenderFlash(render, baseColor, 15);
    const size = flash.size;
    const colorStr = flash.color;

    const tick = world.tick;
    const shimmerAlpha = calculateTeleporterShimmer(isTeleporter, tick);
    const opacity = flash.opacity * shimmerAlpha;

    const adapter = new SkiaDrawAdapter(canvas);
    if (tryDrawCustomGeometryAdapter(adapter, world, "enemy", { size: size * 1.8, baseColor: colorStr, globalAlpha: opacity })) {
      return;
    }

    const s = size / 11;
    const animPhase = Math.floor(tick / 15) % 2 === 0;

    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(colorStr));
    paint.setAlphaf(opacity);

    canvas.drawRect(Skia!.XYWHRect(-s * 4, -s * 5, s, s), paint);
    canvas.drawRect(Skia!.XYWHRect(s * 3, -s * 5, s, s), paint);
    canvas.drawRect(Skia!.XYWHRect(-s * 3, -s * 4, s, s), paint);
    canvas.drawRect(Skia!.XYWHRect(s * 2, -s * 4, s, s), paint);

    canvas.drawRect(Skia!.XYWHRect(-s * 4, -s * 3, s * 8, s * 4), paint);

    if (animPhase) {
      canvas.drawRect(Skia!.XYWHRect(-s * 5, -s, s, s * 3), paint);
      canvas.drawRect(Skia!.XYWHRect(s * 4, -s, s, s * 3), paint);
      canvas.drawRect(Skia!.XYWHRect(-s * 3, s, s * 2, s), paint);
      canvas.drawRect(Skia!.XYWHRect(s * 1, s, s * 2, s), paint);
      canvas.drawRect(Skia!.XYWHRect(-s * 2, s * 2, s, s), paint);
      canvas.drawRect(Skia!.XYWHRect(s * 1, s * 2, s, s), paint);
    } else {
      canvas.drawRect(Skia!.XYWHRect(-s * 4, -s, s, s * 2), paint);
      canvas.drawRect(Skia!.XYWHRect(s * 3, -s, s, s * 2), paint);
      canvas.drawRect(Skia!.XYWHRect(-s * 5, s, s, s * 2), paint);
      canvas.drawRect(Skia!.XYWHRect(s * 4, s, s, s * 2), paint);
      canvas.drawRect(Skia!.XYWHRect(-s * 2, s, s, s * 2), paint);
      canvas.drawRect(Skia!.XYWHRect(s * 1, s, s * 2, s), paint);
    }

    const eyePulse = (1.0 + Math.sin(tick * 0.3)) * 0.5;
    paint.setColor(Skia!.Color(colors.redHot));
    paint.setAlphaf(opacity * eyePulse);
    canvas.drawRect(Skia!.XYWHRect(-s * 2, -s * 2, s, s), paint);
    canvas.drawRect(Skia!.XYWHRect(s, -s * 2, s, s), paint);

    const kamiAim = resolveKamikazeAimVector(world, entity);
    if (kamiAim) {
      const { phase, relTargetX, relTargetY, blinkAlpha, pulse, bottomRelY } = kamiAim;
      if (phase === "telegraphing") {
        canvas.save();

        paint.reset();
        paint.setAntiAlias(true);
        paint.setStyle(Skia!.PaintStyle.Stroke);
        paint.setColor(Skia!.Color("#FF0000"));
        paint.setStrokeWidth(1.5);
        paint.setAlphaf(blinkAlpha);

        canvas.drawLine(0, 0, relTargetX, relTargetY, paint);

        paint.setColor(Skia!.Color(colors.redHot));
        paint.setStrokeWidth(2);
        canvas.drawCircle(relTargetX, relTargetY, 12, paint);
        canvas.drawLine(relTargetX - 16, relTargetY, relTargetX + 16, relTargetY, paint);
        canvas.drawLine(relTargetX, relTargetY - 16, relTargetX, relTargetY + 16, paint);

        canvas.restore();
      } else if (phase === "warning") {
        canvas.save();

        const arrowPath = Skia!.Path.Make();
        arrowPath.moveTo(0, bottomRelY);
        arrowPath.lineTo(-8, bottomRelY - 14);
        arrowPath.lineTo(8, bottomRelY - 14);
        arrowPath.close();

        paint.reset();
        paint.setAntiAlias(true);
        paint.setStyle(Skia!.PaintStyle.Fill);
        paint.setColor(Skia!.Color(colors.danger));
        paint.setAlphaf(pulse);
        canvas.drawPath(arrowPath, paint);

        paint.setStyle(Skia!.PaintStyle.Stroke);
        paint.setColor(Skia!.Color(colors.magentaHot));
        paint.setStrokeWidth(2);
        paint.setAlphaf(pulse);
        canvas.drawPath(arrowPath, paint);

        canvas.restore();
      }
    }
  }
};

/**
 * Visuals for bullets using React Native Skia. Supports Concept Pack projectile geometry.
 */
export const drawSkiaSpaceInvadersBullet: ShapeDrawer<any, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;

    const skAdapter = new SkiaDrawAdapter(canvas);
    if (tryDrawCustomGeometryAdapter(skAdapter, world, "projectile", { size: (render.size || 6) * 2, baseColor: render.color || colors.gold })) {
      return;
    }

    const trail = getBulletSkiaTrailBuffer(render);
    const bulletContext = resolveBulletTrailContext(world, entity, render, trail);

    const {
      size,
      glowColor,
      coreColor,
      currentX,
      currentY,
      points,
      baseTrailAlpha,
      baseAuraAlpha,
      auraSizeScale,
    } = bulletContext;

    canvas.save();

    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia!.PaintStyle.Fill);

    paint.setColor(Skia!.Color(glowColor));
    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const relX = pt.x - currentX;
      const relY = pt.y - currentY;
      const pointWidth = size * pt.widthScale;

      paint.setAlphaf(baseTrailAlpha * pt.alpha);
      canvas.drawRect(Skia!.XYWHRect(relX - pointWidth / 2, relY - pointWidth, pointWidth, pointWidth * 2), paint);
    }

    paint.setAlphaf(baseAuraAlpha);
    canvas.drawRect(Skia!.XYWHRect(-size * 1.25 * auraSizeScale, -size * 1.25 * auraSizeScale, size * 2.5 * auraSizeScale, size * 2.5 * auraSizeScale), paint);

    paint.setAlphaf(1.0);
    canvas.drawRect(Skia!.XYWHRect(-size / 2, -size, size, size * 2), paint);

    paint.setColor(Skia!.Color(coreColor));
    canvas.drawRect(Skia!.XYWHRect(-size / 4, -size * 0.7, size / 2, size * 1.4), paint);

    canvas.restore();
  }
};

/**
 * Visuals for the Boss flagship using React Native Skia. Supports Concept Pack boss geometry.
 */
export const drawSkiaSpaceInvadersBoss: ShapeDrawer<any, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;

    const bossState = resolveBossVisualState(world, entity, render);
    const {
      hpRatio,
      phase,
      baseColor,
      accentColor,
      scaleMultiplier,
      scale,
      shakeX,
      shakeY,
      vibX,
      vibY,
      s,
      coreRadius,
    } = bossState;

    const flash = getRenderFlash(render, baseColor, 80);
    const opacity = flash.opacity;

    canvas.save();
    if (phase === 3) {
      canvas.translate(shakeX, shakeY);
    }
    canvas.scale(scale, scale);

    canvas.translate(vibX, vibY);
    canvas.scale(scaleMultiplier, scaleMultiplier);

    const adapter = new SkiaDrawAdapter(canvas);
    if (tryDrawCustomGeometryAdapter(adapter, world, "boss", { size: (render.size || 80), baseColor: flash.color, globalAlpha: opacity })) {
      canvas.restore();
      return;
    }

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(flash.color));
    paint.setAlphaf(opacity);

    const hull = Skia!.Path.Make();
    const poly = getBossPolygonPoints(s);
    hull.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      hull.lineTo(poly[i].x, poly[i].y);
    }
    hull.close();

    canvas.drawPath(hull, paint);

    paint.setStyle(Skia!.PaintStyle.Stroke);
    paint.setColor(Skia!.Color(accentColor));
    paint.setStrokeWidth(2.5);
    canvas.drawLine(-s * 8, -s * 2, -s * 8, -s * 6, paint);
    canvas.drawLine(s * 8, -s * 2, s * 8, -s * 6, paint);

    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(phase === 3 ? colors.white : accentColor));
    canvas.drawCircle(0, 0, coreRadius, paint);

    if (hpRatio < 1.0) {
      paint.setStyle(Skia!.PaintStyle.Stroke);
      paint.setColor(Skia!.Color("rgba(0,0,0,0.85)"));
      paint.setStrokeWidth(2);
      canvas.drawLine(-s * 6, -s * 2, s * 2, s * 4, paint);

      if (phase === 3) {
        canvas.drawLine(s * 5, -s * 3, -s * 3, s * 5, paint);
      }
    }

    canvas.restore();
  }
};

/**
 * Visuals for shield blocks using React Native Skia.
 */
export const drawSkiaSpaceInvadersShield: ShapeDrawer<any, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;
    const flash = getRenderFlash(render, colors.green, 15);
    const shieldComp = world.getComponent(entity, "Shield");
    const skAdapter = new SkiaDrawAdapter(canvas);
    drawShieldAdapter(skAdapter, entity, flash.size, flash.color, flash.opacity, shieldComp ? shieldComp.hp : 3, shieldComp ? shieldComp.maxHp : 3);
  }
};

/**
 * Visuals for particles using React Native Skia.
 */
export const drawSkiaSpaceInvadersParticle: ShapeDrawer<any, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;

    const particleState = resolveParticleState(world, entity, render);
    drawParticleAdapter(new SkiaDrawAdapter(canvas), particleState);
  }
};
