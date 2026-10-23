import type { ShapeDrawer } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry } from "../../types/AsteroidRegistry";
import { Skia, getPaint, type SkCanvas } from "../../../shared/rendering/SkiaContext";
import { getVisibleSkiaRender } from "../../../shared/rendering/renderingUtils";
import { ICEBERG_PALETTE } from "./IcebergPalette";

/**
 * Diamond / shard particle for Borealis fracture debris (Canvas).
 * Replaces the default circular particle when the iceberg mod is active.
 *
 * @public
 */
export const drawIcebergParticle: ShapeDrawer<
  CanvasRenderingContext2D,
  AsteroidsComponentRegistry
> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || render.visible === false) return;

    const size = Math.max(1.5, render.size || 3);
    const color = render.color || ICEBERG_PALETTE.iceMid;
    const alpha = render.opacity ?? 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = ICEBERG_PALETTE.iceDark;
    ctx.lineWidth = 0.75;

    // Elongated diamond (shard), oriented along velocity when present
    const vel = world.getComponent(entity, "Velocity");
    if (vel && (vel.vx !== 0 || vel.vy !== 0)) {
      ctx.rotate(Math.atan2(vel.vy, vel.vx));
    }

    const hx = size * 1.4;
    const hy = size * 0.55;
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(0, hy);
    ctx.lineTo(-hx, 0);
    ctx.lineTo(0, -hy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Diamond / shard particle (Skia).
 *
 * @public
 */
export const drawSkiaIcebergParticle: ShapeDrawer<
  SkCanvas,
  AsteroidsComponentRegistry
> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const size = Math.max(1.5, render.size || 3);
    const color = render.color || ICEBERG_PALETTE.iceMid;
    const alpha = render.opacity ?? 1;

    canvas.save();

    const vel = world.getComponent(entity, "Velocity");
    if (vel && (vel.vx !== 0 || vel.vy !== 0)) {
      canvas.rotate((Math.atan2(vel.vy, vel.vx) * 180) / Math.PI, 0, 0);
    }

    const hx = size * 1.4;
    const hy = size * 0.55;
    const path = Skia.Path.Make();
    path.moveTo(hx, 0);
    path.lineTo(0, hy);
    path.lineTo(-hx, 0);
    path.lineTo(0, -hy);
    path.close();

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));
    paint.setAlphaf(alpha);
    canvas.drawPath(path, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ICEBERG_PALETTE.iceDark));
    paint.setStrokeWidth(0.75);
    paint.setAlphaf(alpha);
    canvas.drawPath(path, paint);

    canvas.restore();
  }
};
