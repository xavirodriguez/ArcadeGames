import { EntityGeometryProfile, GeometrySubPath } from "@tiny-aster/core";
import { IDrawAdapter, CanvasDrawAdapter, SkiaDrawAdapter } from "./DrawAdapter";
import type { SkCanvas } from "@shopify/react-native-skia";

/**
 * Options for generic parametric geometry drawer.
 */
export interface GenericDrawerOptions {
  size?: number;
  baseColor?: string;
  isHitFlashing?: boolean;
  hitFlashColor?: string;
  hitFlashOpacity?: number;
  globalAlpha?: number;
  rotation?: number;
  isThrusting?: boolean;
  tick?: number;
}

/**
 * Executes canvas path drawing commands for a single GeometrySubPath using HTML5 CanvasRenderingContext2D.
 */
export function drawSubPathCanvas(
  ctx: CanvasRenderingContext2D,
  subPath: GeometrySubPath,
  scale: number,
  defaultColor: string,
  isHitFlashing: boolean,
  hitFlashColor: string
): void {
  ctx.save();

  if (subPath.alpha !== undefined) {
    ctx.globalAlpha *= subPath.alpha;
  }

  const fillColor = isHitFlashing ? hitFlashColor : subPath.fillColor || defaultColor;
  const strokeColor = isHitFlashing ? hitFlashColor : subPath.strokeColor || fillColor;
  const lineWidth = (subPath.lineWidth || 1) * scale;

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = Math.max(1, lineWidth);

  const subType = subPath.type || "polyline";

  if (subType === "ellipse") {
    const rx = (subPath.ellipseRadiusX ?? 1) * scale;
    const ry = (subPath.ellipseRadiusY ?? 1) * scale;
    const center = subPath.points[0] || { x: 0, y: 0 };
    ctx.beginPath();
    ctx.ellipse(center.x * scale, center.y * scale, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (subPath.fillColor) ctx.fill();
    ctx.stroke();
  } else if (subType === "arc") {
    const r = (subPath.arcRadius ?? 1) * scale;
    const start = subPath.startAngle ?? 0;
    const end = subPath.endAngle ?? Math.PI * 2;
    const center = subPath.points[0] || { x: 0, y: 0 };
    ctx.beginPath();
    ctx.arc(center.x * scale, center.y * scale, Math.max(0.1, r), start, end);
    if (subPath.fillColor) ctx.fill();
    ctx.stroke();
  } else {
    // polyline / polygon
    if (subPath.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(subPath.points[0].x * scale, subPath.points[0].y * scale);
      for (let i = 1; i < subPath.points.length; i++) {
        ctx.lineTo(subPath.points[i].x * scale, subPath.points[i].y * scale);
      }
      if (subPath.closed !== false) {
        ctx.closePath();
      }
      if (subPath.fillColor) {
        ctx.fill();
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Parametrically renders an entity profile onto an HTML5 Canvas 2D context.
 */
export interface GenericDrawerPreamble {
  size: number;
  scale: number;
  baseColor: string;
  isHitFlashing: boolean;
  hitFlashColor: string;
}

/**
 * Resolves drawing parameters for parametric geometry profile rendering.
 * @public
 */
export function resolveGenericDrawerPreamble(
  profile: EntityGeometryProfile,
  options: GenericDrawerOptions = {}
): GenericDrawerPreamble {
  const size = options.size || 20;
  const scale = (size / 2) * (profile.scaleMultiplier || 1.0);
  const baseColor = options.baseColor || "#00E5FF";
  const isHitFlashing = Boolean(options.isHitFlashing);
  const hitFlashColor = options.hitFlashColor || "#FFFFFF";
  return { size, scale, baseColor, isHitFlashing, hitFlashColor };
}

/**
 * Parametrically renders an entity profile onto an HTML5 Canvas 2D context.
 */
export function drawFromGeometryProfileCanvas(
  ctx: CanvasRenderingContext2D,
  profile: EntityGeometryProfile,
  options: GenericDrawerOptions = {}
): void {
  const { scale, baseColor, isHitFlashing, hitFlashColor } = resolveGenericDrawerPreamble(profile, options);

  ctx.save();

  if (options.globalAlpha !== undefined) {
    ctx.globalAlpha = options.globalAlpha;
  }

  if (options.rotation !== undefined && options.rotation !== 0) {
    ctx.rotate(options.rotation);
  }

  for (let i = 0; i < profile.subPaths.length; i++) {
    drawSubPathCanvas(ctx, profile.subPaths[i], scale, baseColor, isHitFlashing, hitFlashColor);
  }

  ctx.restore();
}

/**
 * Parametrically renders an entity profile using the IDrawAdapter abstraction (Canvas or Skia).
 */
export function drawFromGeometryProfileAdapter(
  adapter: IDrawAdapter,
  profile: EntityGeometryProfile,
  options: GenericDrawerOptions = {}
): void {
  const { scale, baseColor, isHitFlashing, hitFlashColor } = resolveGenericDrawerPreamble(profile, options);
  const alpha = options.globalAlpha ?? 1.0;

  adapter.save();

  for (let i = 0; i < profile.subPaths.length; i++) {
    const sub = profile.subPaths[i];
    const subAlpha = sub.alpha !== undefined ? alpha * sub.alpha : alpha;
    const fillColor = isHitFlashing ? hitFlashColor : sub.fillColor || baseColor;
    const strokeColor = isHitFlashing ? hitFlashColor : sub.strokeColor || fillColor;
    const lineWidth = (sub.lineWidth || 1) * scale;
    const subType = sub.type || "polyline";

    if (subType === "ellipse") {
      const rx = (sub.ellipseRadiusX ?? 1) * scale;
      const ry = (sub.ellipseRadiusY ?? 1) * scale;
      const center = sub.points[0] || { x: 0, y: 0 };
      if (sub.fillColor) {
        adapter.fillCircle(center.x * scale, center.y * scale, rx, fillColor, subAlpha);
      }
      adapter.strokeCircle(center.x * scale, center.y * scale, rx, strokeColor, Math.max(1, lineWidth), subAlpha);
    } else if (subType === "arc") {
      const r = (sub.arcRadius ?? 1) * scale;
      const start = sub.startAngle ?? 0;
      const sweep = (sub.endAngle ?? Math.PI * 2) - start;
      const center = sub.points[0] || { x: 0, y: 0 };
      adapter.drawArc(center.x * scale, center.y * scale, r, start, sweep, strokeColor, Math.max(1, lineWidth), subAlpha);
    } else {
      if (sub.points.length > 1) {
        for (let j = 0; j < sub.points.length - 1; j++) {
          const p1 = sub.points[j];
          const p2 = sub.points[j + 1];
          adapter.drawLine(p1.x * scale, p1.y * scale, p2.x * scale, p2.y * scale, strokeColor, Math.max(1, lineWidth), subAlpha);
        }
        if (sub.closed !== false && sub.points.length > 2) {
          const pFirst = sub.points[0];
          const pLast = sub.points[sub.points.length - 1];
          adapter.drawLine(pLast.x * scale, pLast.y * scale, pFirst.x * scale, pFirst.y * scale, strokeColor, Math.max(1, lineWidth), subAlpha);
        }
      }
    }
  }

  adapter.restore();
}
