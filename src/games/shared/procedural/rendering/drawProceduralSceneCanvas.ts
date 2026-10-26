/**
 * Canvas2D renderer for procedural vector primitives.
 */
import type { ScenePrimitive, ProceduralScene } from "../types/ProceduralTypes";

export function drawProceduralPrimitivesCanvas(
  ctx: CanvasRenderingContext2D,
  primitives: readonly ScenePrimitive[]
): void {
  for (let i = 0; i < primitives.length; i++) {
    const prim = primitives[i];
    const alpha = prim.alpha ?? 1;

    ctx.save();
    if (alpha !== 1) {
      ctx.globalAlpha *= alpha;
    }

    switch (prim.type) {
      case "polygon": {
        if (prim.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(prim.points[0].x, prim.points[0].y);
          for (let j = 1; j < prim.points.length; j++) {
            ctx.lineTo(prim.points[j].x, prim.points[j].y);
          }
          ctx.closePath();
          if (prim.fill && prim.fill !== "none" && prim.fill !== "rgba(0,0,0,0)") {
            ctx.fillStyle = prim.fill;
            ctx.fill();
          }
          if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
            ctx.strokeStyle = prim.stroke;
            ctx.lineWidth = prim.strokeWidth;
            ctx.stroke();
          }
        }
        break;
      }
      case "polyline": {
        if (prim.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(prim.points[0].x, prim.points[0].y);
          for (let j = 1; j < prim.points.length; j++) {
            ctx.lineTo(prim.points[j].x, prim.points[j].y);
          }
          if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
            ctx.strokeStyle = prim.stroke;
            ctx.lineWidth = prim.strokeWidth;
            ctx.stroke();
          }
        }
        break;
      }
      case "ellipse": {
        ctx.beginPath();
        ctx.ellipse(prim.cx, prim.cy, prim.rx, prim.ry, 0, 0, Math.PI * 2);
        if (prim.fill && prim.fill !== "none") {
          ctx.fillStyle = prim.fill;
          ctx.fill();
        }
        if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
          ctx.strokeStyle = prim.stroke;
          ctx.lineWidth = prim.strokeWidth;
          ctx.stroke();
        }
        break;
      }
      case "line": {
        ctx.beginPath();
        ctx.moveTo(prim.x1, prim.y1);
        ctx.lineTo(prim.x2, prim.y2);
        ctx.strokeStyle = prim.stroke;
        ctx.lineWidth = prim.strokeWidth ?? 1;
        ctx.stroke();
        break;
      }
      case "path": {
        if (typeof Path2D !== "undefined") {
          const path2d = new Path2D(prim.d);
          if (prim.fill && prim.fill !== "none") {
            ctx.fillStyle = prim.fill;
            ctx.fill(path2d);
          }
          if (prim.stroke && prim.strokeWidth && prim.strokeWidth > 0) {
            ctx.strokeStyle = prim.stroke;
            ctx.lineWidth = prim.strokeWidth;
            ctx.stroke(path2d);
          }
        }
        break;
      }
    }
    ctx.restore();
  }
}

export function drawProceduralSceneCanvas(
  ctx: CanvasRenderingContext2D,
  scene: ProceduralScene
): void {
  drawProceduralPrimitivesCanvas(ctx, scene.primitives);
}
