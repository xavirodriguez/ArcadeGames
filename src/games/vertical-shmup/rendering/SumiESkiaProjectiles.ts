import type { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { withSumiEAlpha } from "../../shared/rendering/sumi-e/SumiEColor";
import { SHMUP_SUMI_E_THEME, resolveShmupBulletDrawContext } from "./ShmupVisualHelpers";

export const drawSumiESkiaPlayerBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bullet = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_SUMI_E_THEME.palette.player);
    if (!bullet) return;
    const size = bullet.size;
    const time = world.tick * 0.016;
    const palette = SHMUP_SUMI_E_THEME.palette;
    const paint = getPaint();
    canvas.save();
    paint.reset(); paint.setAntiAlias(true); paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1.2, size * 0.22)); paint.setStrokeCap(Skia.StrokeCap.Round);
    paint.setColor(Skia.Color(withSumiEAlpha(palette.player, 0.5)));
    const trail = Skia.Path.Make();
    trail.moveTo(-size * 0.22, size * 2.8);
    trail.quadTo(size * 0.15 * Math.sin(time * 8), size * 1.1, 0, size * 0.1);
    canvas.drawPath(trail, paint);
    paint.setStyle(Skia.PaintStyle.Fill); paint.setColor(Skia.Color(palette.player));
    const shot = Skia.Path.Make();
    shot.moveTo(0, -size * 1.8);
    shot.quadTo(size * 0.6, -size * 0.6, size * 0.26, size * 0.65);
    shot.quadTo(0, size * 1.1, -size * 0.26, size * 0.65);
    shot.quadTo(-size * 0.6, -size * 0.6, 0, -size * 1.8);
    shot.close(); canvas.drawPath(shot, paint);
    canvas.restore();
  }
};

export const drawSumiESkiaEnemyBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bullet = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_SUMI_E_THEME.palette.threat);
    if (!bullet) return;
    const { size, kind } = bullet;
    const palette = SHMUP_SUMI_E_THEME.palette;
    const time = world.tick * 0.016;
    const special = kind === "special";
    const scale = special ? 1.22 : kind === "hot" ? 0.82 : 1;
    const paint = getPaint();
    canvas.save(); canvas.scale(scale, scale);
    paint.reset(); paint.setAntiAlias(true); paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.ink));
    const outer = Skia.Path.Make();
    outer.moveTo(0, -size * 1.35);
    outer.quadTo(size * 1.45, -size * 0.2, size * 0.56, size * 1.05);
    outer.quadTo(0, size * 1.55, -size * 0.56, size * 1.05);
    outer.quadTo(-size * 1.45, -size * 0.2, 0, -size * 1.35);
    outer.close(); canvas.drawPath(outer, paint);
    paint.setColor(Skia.Color(palette.threat));
    const inner = Skia.Path.Make();
    inner.moveTo(0, -size * 0.92);
    inner.quadTo(size * 0.9, -size * 0.12, size * 0.34, size * 0.75);
    inner.quadTo(0, size * 1.08, -size * 0.34, size * 0.75);
    inner.quadTo(-size * 0.9, -size * 0.12, 0, -size * 0.92);
    inner.close(); canvas.drawPath(inner, paint);
    if (special) {
      paint.setStyle(Skia.PaintStyle.Stroke); paint.setStrokeWidth(1.2);
      paint.setColor(Skia.Color(withSumiEAlpha(palette.threat, 0.55)));
      const radiusX = size * 1.65; const radiusY = size * 1.9;
      canvas.drawArc(Skia.XYWHRect(-radiusX, -radiusY, radiusX * 2, radiusY * 2), time * 11.46, 261, false, paint);
    }
    canvas.restore();
  }
};