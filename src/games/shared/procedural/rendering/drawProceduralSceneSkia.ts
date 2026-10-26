/**
 * Skia canvas renderer for procedural vector primitives.
 */
import type { ScenePrimitive, ProceduralScene } from "../types/ProceduralTypes";
import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { Skia } from "@shopify/react-native-skia";

export function drawProceduralPrimitivesSkia(
  skCanvas: SkCanvas,
  paint: SkPaint,
  primitives: readonly ScenePrimitive[]
): void {
  for (let i = 0; i < primitives.length; i++) {
    const prim = primitives[i];
    const alpha = prim.alpha ?? 1;

    skCanvas.save();
    if (alpha !== 1) {
      paint.setAlphaf(paint.getAlphaf() * alpha);
    }

    switch (prim.type) {
      case "polygon": {
        if (prim.points.length > 0) {
          const path = Skia.Path.Make();
          path.moveTo(prim.points[0].x, prim.points[0].y);
          for (let j = 1; j < prim.points.length; j++) {
            path.lineTo(prim.points[j].x, prim.points[j].y);
          }
          path.close();

          if (prim.fill && prim.fill !== "none" && prim.fill !== "rgba(0,0,0,0)") {
            paint.setStyle(0); // Fill
            paint.setColor(Skia.Color(prim.fill));
            skCanvas.drawPath(path, paint);
          }
          if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
            paint.setStyle(1); // Stroke
            paint.setStrokeWidth(prim.strokeWidth);
            paint.setColor(Skia.Color(prim.stroke));
            skCanvas.drawPath(path, paint);
          }
        }
        break;
      }
      case "polyline": {
        if (prim.points.length > 0) {
          const path = Skia.Path.Make();
          path.moveTo(prim.points[0].x, prim.points[0].y);
          for (let j = 1; j < prim.points.length; j++) {
            path.lineTo(prim.points[j].x, prim.points[j].y);
          }
          if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
            paint.setStyle(1);
            paint.setStrokeWidth(prim.strokeWidth);
            paint.setColor(Skia.Color(prim.stroke));
            skCanvas.drawPath(path, paint);
          }
        }
        break;
      }
      case "ellipse": {
        if (prim.fill && prim.fill !== "none") {
          paint.setStyle(0);
          paint.setColor(Skia.Color(prim.fill));
          skCanvas.drawOval(
            Skia.XYWHRect(prim.cx - prim.rx, prim.cy - prim.ry, prim.rx * 2, prim.ry * 2),
            paint
          );
        }
        if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
          paint.setStyle(1);
          paint.setStrokeWidth(prim.strokeWidth);
          paint.setColor(Skia.Color(prim.stroke));
          skCanvas.drawOval(
            Skia.XYWHRect(prim.cx - prim.rx, prim.cy - prim.ry, prim.rx * 2, prim.ry * 2),
            paint
          );
        }
        break;
      }
      case "line": {
        paint.setStyle(1);
        paint.setStrokeWidth(prim.strokeWidth ?? 1);
        paint.setColor(Skia.Color(prim.stroke));
        skCanvas.drawLine(prim.x1, prim.y1, prim.x2, prim.y2, paint);
        break;
      }
      case "path": {
        const path = Skia.Path.MakeFromSVGString(prim.d);
        if (path) {
          if (prim.fill && prim.fill !== "none") {
            paint.setStyle(0);
            paint.setColor(Skia.Color(prim.fill));
            skCanvas.drawPath(path, paint);
          }
          if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
            paint.setStyle(1);
            paint.setStrokeWidth(prim.strokeWidth);
            paint.setColor(Skia.Color(prim.stroke));
            skCanvas.drawPath(path, paint);
          }
        }
        break;
      }
    }
    skCanvas.restore();
  }
}

export function drawProceduralSceneSkia(
  skCanvas: SkCanvas,
  paint: SkPaint,
  scene: ProceduralScene
): void {
  drawProceduralPrimitivesSkia(skCanvas, paint, scene.primitives);
}
