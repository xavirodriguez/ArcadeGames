import type { EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { computeSumiEBackdrop } from "./ShmupVisualHelpers";

function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = match[1]!;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

/** Skia peer of the Canvas Sumi-e backdrop, using the same deterministic geometry. */
export const drawSumiESkiaBackdrop: EffectDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const data = computeSumiEBackdrop(world);
    const { width, height, time, scroll, palette } = data;
    const paint = getPaint();
    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.paper));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(0.7);
    for (const fiber of data.paperFibers) {
      paint.setColor(Skia.Color(withAlpha(palette.inkWash, fiber.alpha)));
      canvas.drawLine(fiber.x, fiber.y, fiber.x + fiber.length, fiber.y + Math.sin(fiber.x * 0.03) * 1.5, paint);
    }

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(withAlpha(palette.sun, 0.32)));
    canvas.drawCircle(width * 0.72, height * 0.16, Math.min(width, height) * 0.105, paint);

    for (let band = 0; band < 3; band += 1) {
      const y = ((height * (0.28 + band * 0.24) + scroll * (0.08 + band * 0.025)) % (height + 180)) - 90;
      paint.setColor(Skia.Color(withAlpha(palette.mist, 0.25 - band * 0.035)));
      canvas.drawOval(Skia.XYWHRect(
        width * (0.48 + Math.sin(time * 0.12 + band) * 0.08) - width * 0.46,
        y - height * 0.035,
        width * 0.92,
        height * 0.07
      ), paint);
    }

    for (const ridge of data.ridges) {
      paint.setColor(Skia.Color(withAlpha(palette.inkWash, ridge.opacity)));
      const path = Skia.Path.Make();
      path.moveTo(0, height);
      path.lineTo(ridge.points[0]!.x, ridge.points[0]!.y);
      for (let i = 1; i < ridge.points.length; i += 1) {
        const previous = ridge.points[i - 1]!;
        const current = ridge.points[i]!;
        path.quadTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
      }
      const last = ridge.points[ridge.points.length - 1]!;
      path.lineTo(last.x, last.y);
      path.lineTo(width, height);
      path.close();
      canvas.drawPath(path, paint);
    }

    const edge = width * 0.22;
    for (let index = 0; index < 3; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const x = side > 0 ? width * (0.07 + index * 0.035) : width * (0.91 - index * 0.025);
      const y = height * (0.34 + index * 0.21) + ((scroll * 0.18) % (height * 0.12));
      const scale = 0.55 + (index % 2) * 0.22;
      paint.setColor(Skia.Color(withAlpha(palette.ink, 0.42)));
      canvas.drawRect(Skia.XYWHRect(x - 5 * scale, y, 10 * scale, 25 * scale), paint);
      for (let tier = 0; tier < 3; tier += 1) {
        const roofY = y + tier * 8 * scale;
        const roofW = (22 - tier * 4) * scale;
        const roof = Skia.Path.Make();
        roof.moveTo(x - roofW, roofY);
        roof.lineTo(x, roofY - 5 * scale);
        roof.lineTo(x + roofW, roofY);
        roof.lineTo(x + roofW * 0.82, roofY + 2 * scale);
        roof.lineTo(x - roofW * 0.82, roofY + 2 * scale);
        roof.close();
        canvas.drawPath(roof, paint);
      }
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2 * scale);
      paint.setColor(Skia.Color(withAlpha(palette.inkWash, 0.28)));
      const waterfall = Skia.Path.Make();
      waterfall.moveTo(x + side * 15 * scale, y + 28 * scale);
      waterfall.quadTo(x + side * 20 * scale, y + 46 * scale, x + side * 17 * scale, y + 70 * scale);
      canvas.drawPath(waterfall, paint);
      paint.setStyle(Skia.PaintStyle.Fill);
    }

    paint.setColor(Skia.Color(withAlpha(palette.ink, 0.78)));
    for (const side of [-1, 1]) {
      const baseX = side < 0 ? 0 : width;
      const direction = side < 0 ? 1 : -1;
      const cliff = Skia.Path.Make();
      cliff.moveTo(baseX, height);
      cliff.lineTo(baseX, height * 0.78);
      cliff.lineTo(baseX + direction * edge * 0.42, height * 0.84);
      cliff.lineTo(baseX + direction * edge * 0.2, height * 0.9);
      cliff.lineTo(baseX + direction * edge * 0.52, height * 0.95);
      cliff.close();
      canvas.drawPath(cliff, paint);
      paint.setColor(Skia.Color(withAlpha(palette.ink, 0.62)));
      for (let tree = 0; tree < 4; tree += 1) {
        const x = baseX + direction * width * (0.045 + tree * 0.035);
        const y = height * (0.58 + ((tree * 17 + Math.floor(scroll / 90)) % 4) * 0.085);
        canvas.drawRect(Skia.XYWHRect(x - 2, y, 4, height - y), paint);
        for (let branch = 0; branch < 4; branch += 1) {
          const by = y + branch * 9;
          const path = Skia.Path.Make();
          path.moveTo(x, by - 9);
          path.lineTo(x + direction * (8 + branch * 2), by + 2);
          path.lineTo(x, by);
          path.close();
          canvas.drawPath(path, paint);
        }
      }
      paint.setColor(Skia.Color(withAlpha(palette.ink, 0.78)));
    }
    canvas.restore();
  }
};
