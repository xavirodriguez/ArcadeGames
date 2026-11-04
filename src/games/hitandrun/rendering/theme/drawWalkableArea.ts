/**
 * Shared helpers to paint the walkable depth band from WalkableAreaGeometry.
 * Themes supply palette-driven colours; the geometry is never invented here.
 */

import type { SkCanvas } from "@shopify/react-native-skia";
import { Skia, getPaint } from "../../../shared/rendering/SkiaContext";
import type { WalkableAreaGeometry } from "../../belt/WalkableAreaGeometry";
import { DEFAULT_WALKABLE_AREA_GEOMETRY } from "../../belt/WalkableAreaGeometry";

export interface WalkableAreaPaintStyle {
  readonly floorColor: string;
  readonly floorAlpha?: number;
  readonly upperBorderColor: string;
  readonly lowerBorderColor: string;
  readonly borderWidth?: number;
  readonly upperCurbColor?: string;
  readonly upperCurbHeight?: number;
  readonly lowerCurbColor?: string;
  readonly lowerCurbHeight?: number;
}

export function drawWalkableAreaCanvas(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  geometry: WalkableAreaGeometry = DEFAULT_WALKABLE_AREA_GEOMETRY,
  style: WalkableAreaPaintStyle
): void {
  const { depthMin, depthMax, height } = geometry;
  if (height <= 0 || viewportWidth <= 0) return;

  const floorAlpha = style.floorAlpha ?? 1;
  const borderWidth = style.borderWidth ?? 2;
  const upperCurbH = style.upperCurbHeight ?? 0;
  const lowerCurbH = style.lowerCurbHeight ?? 0;

  ctx.save();

  if (style.upperCurbColor && upperCurbH > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.upperCurbColor;
    ctx.fillRect(0, depthMin - upperCurbH, viewportWidth, upperCurbH);
  }

  ctx.globalAlpha = floorAlpha;
  ctx.fillStyle = style.floorColor;
  ctx.fillRect(0, depthMin, viewportWidth, height);

  if (style.lowerCurbColor && lowerCurbH > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.lowerCurbColor;
    ctx.fillRect(0, depthMax, viewportWidth, lowerCurbH);
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = style.upperBorderColor;
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.moveTo(0, depthMin);
  ctx.lineTo(viewportWidth, depthMin);
  ctx.stroke();

  ctx.strokeStyle = style.lowerBorderColor;
  ctx.beginPath();
  ctx.moveTo(0, depthMax);
  ctx.lineTo(viewportWidth, depthMax);
  ctx.stroke();

  ctx.restore();
}

export function drawWalkableAreaSkia(
  canvas: SkCanvas,
  viewportWidth: number,
  geometry: WalkableAreaGeometry = DEFAULT_WALKABLE_AREA_GEOMETRY,
  style: WalkableAreaPaintStyle
): void {
  if (!Skia || !canvas) return;
  const paint = getPaint();
  if (!paint) return;

  const { depthMin, depthMax, height } = geometry;
  if (height <= 0 || viewportWidth <= 0) return;

  const floorAlpha = style.floorAlpha ?? 1;
  const borderWidth = style.borderWidth ?? 2;
  const upperCurbH = style.upperCurbHeight ?? 0;
  const lowerCurbH = style.lowerCurbHeight ?? 0;

  canvas.save();

  if (style.upperCurbColor && upperCurbH > 0) {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setAlphaf(1);
    paint.setColor(Skia.Color(style.upperCurbColor));
    canvas.drawRect(
      Skia.XYWHRect(0, depthMin - upperCurbH, viewportWidth, upperCurbH),
      paint
    );
  }

  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setAlphaf(floorAlpha);
  paint.setColor(Skia.Color(style.floorColor));
  canvas.drawRect(Skia.XYWHRect(0, depthMin, viewportWidth, height), paint);

  if (style.lowerCurbColor && lowerCurbH > 0) {
    paint.setAlphaf(1);
    paint.setColor(Skia.Color(style.lowerCurbColor));
    canvas.drawRect(Skia.XYWHRect(0, depthMax, viewportWidth, lowerCurbH), paint);
  }

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(borderWidth);
  paint.setAlphaf(1);

  paint.setColor(Skia.Color(style.upperBorderColor));
  canvas.drawLine(0, depthMin, viewportWidth, depthMin, paint);

  paint.setColor(Skia.Color(style.lowerBorderColor));
  canvas.drawLine(0, depthMax, viewportWidth, depthMax, paint);

  canvas.restore();
}
