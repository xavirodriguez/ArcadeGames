import type { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { SHMUP_SUMI_E_THEME, resolveShmupEnemyDrawContext } from "./ShmupVisualHelpers";

/** Skia counterpart of the Canvas ink-yokai enemy family. */
export const drawSumiESkiaEnemy: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const enemy = resolveShmupEnemyDrawContext(world, entity);
    if (!enemy) return;
    const { size, time, archetype, isTelegraphing } = enemy;
    const palette = SHMUP_SUMI_E_THEME.palette;
    const boss = archetype === "boss";
    const scale = boss ? 1.18 : archetype === "armored" ? 1.05 : 1;
    const paint = getPaint();
    canvas.save();
    canvas.scale(scale, scale);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    if (isTelegraphing) {
      paint.setColor(Skia.Color(palette.threat));
      paint.setStrokeWidth(1.5);
      canvas.drawCircle(0, 0, size * 1.28, paint);
    }

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.ink));
    if (archetype === "support") {
      canvas.drawOval(Skia.XYWHRect(-size * 0.64, -size * 0.83, size * 1.28, size * 1.56), paint);
      const tail = Skia.Path.Make();
      tail.moveTo(-size * 0.34, size * 0.52);
      tail.quadTo(-size * 0.18, size * 1.02, size * 0.04, size * 1.24);
      tail.quadTo(size * 0.18, size * 0.88, size * 0.36, size * 0.62);
      tail.close();
      canvas.drawPath(tail, paint);
    } else if (archetype === "interceptor") {
      const tengu = Skia.Path.Make();
      tengu.moveTo(0, -size * 1.12);
      tengu.lineTo(size * 0.68, -size * 0.3);
      tengu.lineTo(size * 0.38, size * 0.5);
      tengu.lineTo(0, size * 0.96);
      tengu.lineTo(-size * 0.38, size * 0.5);
      tengu.lineTo(-size * 0.68, -size * 0.3);
      tengu.close();
      canvas.drawPath(tengu, paint);
      const beak = Skia.Path.Make();
      beak.moveTo(-size * 0.22, -size * 0.18);
      beak.lineTo(0, size * 0.64);
      beak.lineTo(size * 0.22, -size * 0.18);
      beak.close();
      canvas.drawPath(beak, paint);
    } else {
      const mask = Skia.Path.Make();
      mask.moveTo(-size * 0.74, -size * 0.32);
      mask.quadTo(-size * 0.7, -size * 0.96, 0, -size * 0.88);
      mask.quadTo(size * 0.7, -size * 0.96, size * 0.74, -size * 0.32);
      mask.lineTo(size * 0.56, size * 0.42);
      mask.quadTo(0, size * 1.05, -size * 0.56, size * 0.42);
      mask.close();
      canvas.drawPath(mask, paint);
      if (archetype === "armored" || boss) {
        const leftHorn = Skia.Path.Make();
        leftHorn.moveTo(-size * 0.48, -size * 0.56);
        leftHorn.lineTo(-size * 0.84, -size * 1.05);
        leftHorn.lineTo(-size * 0.16, -size * 0.78);
        leftHorn.close();
        canvas.drawPath(leftHorn, paint);
        const rightHorn = Skia.Path.Make();
        rightHorn.moveTo(size * 0.48, -size * 0.56);
        rightHorn.lineTo(size * 0.84, -size * 1.05);
        rightHorn.lineTo(size * 0.16, -size * 0.78);
        rightHorn.close();
        canvas.drawPath(rightHorn, paint);
      }
    }

    paint.setColor(Skia.Color(palette.threat));
    const eyeY = archetype === "interceptor" ? -size * 0.08 : -size * 0.18;
    canvas.drawOval(Skia.XYWHRect(-size * 0.355, eyeY - size * 0.075, size * 0.21, size * 0.15), paint);
    canvas.drawOval(Skia.XYWHRect(size * 0.145, eyeY - size * 0.075, size * 0.21, size * 0.15), paint);

    if (boss) {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      paint.setColor(Skia.Color(palette.threat));
      const radius = size * (1.12 + 0.035 * Math.sin(time * 2));
      canvas.drawArc(Skia.XYWHRect(-radius, -radius, radius * 2, radius * 2), 194.4, 151.2, false, paint);
    }
    canvas.restore();
  }
};
