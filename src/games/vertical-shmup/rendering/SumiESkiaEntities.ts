import type { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { SHMUP_SUMI_E_THEME, resolveShmupPlayerDrawContext } from "./ShmupVisualHelpers";


const sumiESkiaImages = new Map<string, unknown>();
const sumiESkiaPendingImages = new Set<string>();

function tryDrawBundledPlayerSprite(
  canvas: SkCanvas,
  world: Parameters<ShapeDrawer<SkCanvas, ShmupComponentRegistry>["draw"]>[1],
  entity: number,
  size: number,
  moveX: number
): boolean {
  const sprite = world.getComponent(entity, "Sprite");
  if (!sprite) return false;
  const loader = world.getResource<{ get: (key: string) => unknown }>("AssetLoader");
  const raw = loader?.get(sprite.assetKey ?? "");
  if (!raw) return false;
  const asset = raw as { uri?: string; localUri?: string };
  const uri = asset.localUri || asset.uri;
  if (!uri || !Skia) return false;

  let image = sumiESkiaImages.get(uri);
  if (!image && !sumiESkiaPendingImages.has(uri)) {
    sumiESkiaPendingImages.add(uri);
    Skia.Data.fromURI(uri)
      .then((data) => {
        if (!data) return;
        const decoded = Skia.Image.MakeImageFromEncoded(data);
        if (decoded) sumiESkiaImages.set(uri, decoded);
      })
      .catch(() => undefined)
      .finally(() => { sumiESkiaPendingImages.delete(uri); });
  }
  if (!image) return false;

  const dimensions = image as { width?: number | (() => number); height?: number | (() => number) };
  const imageWidth = typeof dimensions.width === "function" ? dimensions.width() : dimensions.width ?? 0;
  const imageHeight = typeof dimensions.height === "function" ? dimensions.height() : dimensions.height ?? 0;
  if (imageWidth <= 0 || imageHeight <= 0) return false;

  const paint = getPaint();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  canvas.save();
  canvas.rotate(moveX * 0.12 * 180 / Math.PI, 0, 0);
  canvas.drawImageRect(
    image as never,
    Skia.XYWHRect(0, 0, imageWidth, imageHeight),
    Skia.XYWHRect(-size * 1.1, -size * 1.4, size * 2.2, size * 2.8),
    paint
  );
  paint.setColor(Skia.Color(SHMUP_SUMI_E_THEME.palette.reward));
  const ofuda = Skia.Path.Make();
  ofuda.moveTo(0, -size * 0.24);
  ofuda.lineTo(size * 0.09, -size * 0.08);
  ofuda.lineTo(0, size * 0.08);
  ofuda.lineTo(-size * 0.09, -size * 0.08);
  ofuda.close();
  canvas.drawPath(ofuda, paint);
  canvas.restore();
  return true;
}

/** Skia counterpart to the Canvas ink-brush shrine glider. */
export const drawSumiESkiaPlayer: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const player = resolveShmupPlayerDrawContext(world, entity);
    if (!player || player.shouldBlink) return;
    const { size, time, moveX, invulnerable, isShooting } = player;
    const palette = SHMUP_SUMI_E_THEME.palette;
    if (tryDrawBundledPlayerSprite(canvas, world, entity, size, moveX)) return;
    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(2, size * 0.09));
    paint.setStrokeCap(Skia.StrokeCap.Round);
    paint.setColor(Skia.Color(palette.player));
    const trailLeft = Skia.Path.Make();
    trailLeft.moveTo(-size * 0.18, size * 0.62);
    trailLeft.quadTo(-size * 0.24 + moveX * size * 0.12, size * 1.05, -size * 0.08, size * (1.5 + 0.08 * Math.sin(time * 7)));
    canvas.drawPath(trailLeft, paint);
    const trailRight = Skia.Path.Make();
    trailRight.moveTo(size * 0.18, size * 0.62);
    trailRight.quadTo(size * 0.24 + moveX * size * 0.12, size * 1.05, size * 0.08, size * (1.5 + 0.08 * Math.sin(time * 7 + 1)));
    canvas.drawPath(trailRight, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.ink));
    const hull = Skia.Path.Make();
    hull.moveTo(0, -size * 1.2);
    hull.quadTo(size * 0.2, -size * 0.55, size * 0.88, -size * 0.08);
    hull.lineTo(size * 1.02, size * 0.26);
    hull.quadTo(size * 0.58, size * 0.18, size * 0.3, size * 0.55);
    hull.lineTo(size * 0.12, size * 0.38);
    hull.lineTo(0, size * 0.62);
    hull.lineTo(-size * 0.12, size * 0.38);
    hull.lineTo(-size * 0.3, size * 0.55);
    hull.quadTo(-size * 0.58, size * 0.18, -size * 1.02, size * 0.26);
    hull.lineTo(-size * 0.88, -size * 0.08);
    hull.quadTo(-size * 0.2, -size * 0.55, 0, -size * 1.2);
    hull.close();
    canvas.drawPath(hull, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1.5, size * 0.045));
    paint.setColor(Skia.Color(palette.player));
    canvas.drawLine(0, -size * 0.86, size * 0.16, -size * 0.16, paint);
    canvas.drawLine(size * 0.16, -size * 0.16, size * 0.08, size * 0.26, paint);
    canvas.drawLine(0, -size * 0.86, -size * 0.16, -size * 0.16, paint);
    canvas.drawLine(-size * 0.16, -size * 0.16, -size * 0.08, size * 0.26, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.reward));
    const ofuda = Skia.Path.Make();
    ofuda.moveTo(0, -size * 0.24);
    ofuda.lineTo(size * 0.09, -size * 0.08);
    ofuda.lineTo(0, size * 0.08);
    ofuda.lineTo(-size * 0.09, -size * 0.08);
    ofuda.close();
    canvas.drawPath(ofuda, paint);

    if (isShooting) {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(Math.max(2, size * 0.06));
      paint.setColor(Skia.Color(palette.player));
      canvas.drawLine(-size * 0.72, -size * 0.06, -size * 0.88, -size * 0.36, paint);
      canvas.drawLine(size * 0.72, -size * 0.06, size * 0.88, -size * 0.36, paint);
    }

    if (invulnerable) {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(1.5);
      paint.setColor(Skia.Color(palette.player));
      const radius = size * 1.28;
      canvas.drawArc(Skia.XYWHRect(-radius, -radius, radius * 2, radius * 2), (time * 0.4) * 180 / Math.PI, 300, false, paint);
      canvas.drawArc(Skia.XYWHRect(-radius, -radius, radius * 2, radius * 2), (time * 0.4) * 180 / Math.PI + 205, 55, false, paint);
    }
    canvas.restore();
  }
};
