import { ShapeDrawer, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { colors } from "../../../theme/colors";
import {
  resolveBulletDrawSetup,
  resolveBossRenderSetup,
  computeBossHullPoints,
  computeTrailPointOffset,
} from "./SpaceInvadersVisualUtils";
import { CircularPositionBuffer } from "../../shared/rendering/SharedVFX";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";
import { SkiaDrawAdapter } from "../../shared/rendering/DrawAdapter";
import { drawFromGeometryProfileAdapter } from "../../shared/rendering/GenericEntityDrawer";

const bulletSkiaTrailMap = new WeakMap<object, CircularPositionBuffer>();

function getBulletSkiaTrailBuffer(render: object): CircularPositionBuffer {
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

export const drawSkiaSpaceInvadersBullet: ShapeDrawer<SkCanvas, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const renderComp = safeGetRender(world, entity);
    if (!renderComp) return;
    const trail = getBulletSkiaTrailBuffer(renderComp);
    const setup = resolveBulletDrawSetup(world, entity, trail);
    if (!setup) return;
    const { customGeom, customGeomSize, render, bulletContext } = setup;
    if (customGeom) {
      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size: customGeomSize,
        baseColor: render.color || colors.gold,
      });
      return;
    }
    const {
      size, glowColor, coreColor, currentX, currentY, points,
      baseTrailAlpha, baseAuraAlpha, shadowBlurAmount, auraSizeScale,
    } = bulletContext;
    const paint = getPaint();
    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia!.PaintStyle.Fill);
    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const { relX, relY, pointWidth } = computeTrailPointOffset(pt, currentX, currentY, size);
      paint.setColor(Skia!.Color(glowColor));
      paint.setAlphaf(baseTrailAlpha * pt.alpha);
      canvas.drawRect(Skia!.XYWHRect(relX - pointWidth / 2, relY - pointWidth, pointWidth, pointWidth * 2), paint);
    }
    paint.setColor(Skia!.Color(glowColor));
    paint.setAlphaf(baseAuraAlpha);
    canvas.drawRect(Skia!.XYWHRect(-size * 1.25 * auraSizeScale, -size * 1.25 * auraSizeScale, size * 2.5 * auraSizeScale, size * 2.5 * auraSizeScale), paint);
    paint.setAlphaf(1.0);
    paint.setColor(Skia!.Color(glowColor));
    canvas.drawRect(Skia!.XYWHRect(-size / 2, -size, size, size * 2), paint);
    paint.setColor(Skia!.Color(coreColor));
    canvas.drawRect(Skia!.XYWHRect(-size / 4, -size * 0.7, size / 2, size * 1.4), paint);
    canvas.restore();
  }
};

function safeGetRender(world: any, entity: number) {
  return world.getComponent(entity, "Render");
}

export const drawSkiaSpaceInvadersBoss: ShapeDrawer<SkCanvas, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const setup = resolveBossRenderSetup(world, entity);
    if (!setup) return;
    const { render, customGeom, flash, phase, accentColor, scaleMultiplier, scale, shakeX, shakeY, vibX, vibY, s, coreRadius, hpRatio } = setup;
    const opacity = flash.opacity;
    canvas.save();
    if (phase === 3) canvas.translate(shakeX, shakeY);
    canvas.scale(scale, scale);
    canvas.translate(vibX, vibY);
    canvas.scale(scaleMultiplier, scaleMultiplier);
    if (customGeom) {
      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size: (render.size || 80),
        baseColor: flash.color,
        globalAlpha: opacity,
      });
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
    const hullPts = computeBossHullPoints(s);
    hull.moveTo(hullPts[0][0], hullPts[0][1]);
    for (let i = 1; i < hullPts.length; i++) hull.lineTo(hullPts[i][0], hullPts[i][1]);
    hull.close();
    canvas.drawPath(hull, paint);
    paint.setStyle(Skia!.PaintStyle.Stroke);
    paint.setStrokeWidth(2.5);
    paint.setColor(Skia!.Color(accentColor));
    canvas.drawLine(-s * 8, -s * 2, -s * 8, -s * 6, paint);
    canvas.drawLine(s * 8, -s * 2, s * 8, -s * 6, paint);
    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(phase === 3 ? colors.white : accentColor));
    canvas.drawCircle(0, 0, coreRadius, paint);
    if (hpRatio < 1.0) {
      paint.setStyle(Skia!.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      paint.setColor(Skia!.Color("rgba(0, 0, 0, 0.85)"));
      canvas.drawLine(-s * 6, -s * 2, s * 2, s * 4, paint);
      if (phase === 3) canvas.drawLine(s * 5, -s * 3, -s * 3, s * 5, paint);
    }
    canvas.restore();
  }
};
