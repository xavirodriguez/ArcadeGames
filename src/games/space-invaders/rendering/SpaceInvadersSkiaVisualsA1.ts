import { ShapeDrawer, RenderContext, THEME_RESOURCE_KEY, Theme, World, RenderComponent, EntityGeometryProfile } from "@tiny-aster/core";
import type { SkPath } from "@shopify/react-native-skia";
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
import { safeGetRenderComponent, getRenderFlash } from "./RenderHelper";
import { EXPLOSION_PARTICLE_POOL, updateExplosionParticles } from "./ExplosionParticlePool";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";
import { CircularPositionBuffer } from "../../shared/rendering/SharedVFX";
import { SkiaDrawAdapter } from "../../shared/rendering/DrawAdapter";
import { drawFromGeometryProfileAdapter } from "../../shared/rendering/GenericEntityDrawer";

export function drawExplosionParticlesSkia(canvas: SkCanvas): void {
  if (!Skia) return;
  const paint = getPaint();
  canvas.save();
  for (let i = 0; i < EXPLOSION_PARTICLE_POOL.length; i++) {
    const data = resolveExplosionParticleData(EXPLOSION_PARTICLE_POOL[i]);
    if (!data) continue;
    const { ratio, type, x, y, radius, size, color, skColor } = data;
    if (type === "ring") {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(skColor || Skia.Color(color));
      paint.setStrokeWidth(2.5 * ratio);
      paint.setAlphaf(ratio * 0.8);
      canvas.drawCircle(x, y, Math.max(0.1, radius), paint);
    } else if (type === "debris") {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(skColor || Skia.Color(color));
      paint.setAlphaf(ratio);
      canvas.drawRect(Skia.XYWHRect(x - size / 2, y - size / 2, size, size), paint);
    } else if (type === "smoke") {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(skColor || Skia.Color(color));
      paint.setAlphaf(ratio * 0.35);
      canvas.drawCircle(x, y, Math.max(0.1, size), paint);
    }
  }
  canvas.restore();
}

export const drawSkiaExplosionBackgroundEffect = {
  draw(canvas: SkCanvas) {
    updateExplosionParticles();
    drawExplosionParticlesSkia(canvas);
  }
};

function resolveSkiaPlayerRenderSetup(world: World<SpaceInvadersComponentRegistry>, entity: number) {
  const render = safeGetRenderComponent(world, entity);
  if (!render) return null;
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  const customGeom = theme?.visualTheme?.shapeTokens?.playerGeometry;
  const playerComp = world.getComponent(entity, "Player");
  const role = playerComp?.role || "pioneer";
  const { roleColor } = resolvePlayerRoleVisual(role, theme);
  const flash = getRenderFlash(render, roleColor, 40);
  return { render, customGeom, role, size: flash.size, colorStr: flash.color, opacity: flash.opacity };
}

export const drawSkiaSpaceInvadersPlayer: ShapeDrawer<SkCanvas, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const setup = resolveSkiaPlayerRenderSetup(world, entity);
    if (!setup) return;
    const { render, customGeom, role, size, colorStr, opacity } = setup;
    canvas.save();
    const velocity = world.getComponent(entity, "Velocity");
    if (velocity) {
      const tilt = calculatePlayerTilt(velocity.vx);
      canvas.rotate(tilt, 0, 0);
    }
    if (customGeom) {
      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size,
        baseColor: colorStr,
        globalAlpha: opacity,
        isHitFlashing: opacity < 1.0,
      });
      canvas.restore();
      const health = world.getComponent(entity, "Health");
      const shieldState = resolveShieldPulseState(health, size, world.tick);
      if (shieldState.isInvulnerable) {
        const { shieldAlpha, radius } = shieldState;
        const paint = getPaint();
        paint.reset();
        paint.setAntiAlias(true);
        paint.setStyle(Skia!.PaintStyle.Stroke);
        paint.setStrokeWidth(3);
        paint.setColor(Skia!.Color(colors.cyan));
        paint.setAlphaf(shieldAlpha);
        canvas.drawCircle(0, 0, radius, paint);
      }
      return;
    }
    const tick = world.tick;
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(colorStr));
    paint.setAlphaf(opacity);
    const plumeLength = calculateThrusterPlumeLength(tick, size);
    paint.setColor(Skia!.Color(colors.orangeDark));
    const plume = Skia!.Path.Make();
    plume.moveTo(-size / 5, size / 4);
    plume.lineTo(size / 5, size / 4);
    plume.lineTo(0, size / 4 + plumeLength);
    plume.close();
    canvas.drawPath(plume, paint);
    paint.setColor(Skia!.Color(colorStr));
    const hull = Skia!.Path.Make();
    hull.moveTo(0, -size / 2);
    hull.lineTo(size / 4, -size / 6);
    hull.lineTo(size / 2, size / 4);
    hull.lineTo(size / 3, size / 4);
    hull.lineTo(size / 5, size / 6);
    hull.lineTo(-size / 5, size / 6);
    hull.lineTo(-size / 3, size / 4);
    hull.lineTo(-size / 2, size / 4);
    hull.lineTo(-size / 4, -size / 6);
    hull.close();
    canvas.drawPath(hull, paint);
    canvas.restore();
  }
};

export const drawSkiaSpaceInvadersInvader: ShapeDrawer<SkCanvas, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const setup = resolveInvaderRenderSetup(world, entity);
    if (!setup) return;
    const { size, customGeom, isTeleporter, flash, tick } = setup;
    if (customGeom) {
      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size: size * 1.8,
        baseColor: flash.color,
        globalAlpha: flash.opacity,
      });
      return;
    }
    const shimmerAlpha = calculateTeleporterShimmer(isTeleporter, tick);
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(flash.color));
    paint.setAlphaf(flash.opacity * shimmerAlpha);
    const s = size / 11;
    canvas.drawRect(Skia!.XYWHRect(-s * 4, -s * 5, s, s), paint);
    canvas.drawRect(Skia!.XYWHRect(s * 3, -s * 5, s, s), paint);
    canvas.drawRect(Skia!.XYWHRect(-s * 4, -s * 3, s * 8, s * 4), paint);
    paint.setColor(Skia!.Color(colors.redHot));
    canvas.drawRect(Skia!.XYWHRect(-s * 2, -s * 2, s, s), paint);
    canvas.drawRect(Skia!.XYWHRect(s, -s * 2, s, s), paint);
  }
};
