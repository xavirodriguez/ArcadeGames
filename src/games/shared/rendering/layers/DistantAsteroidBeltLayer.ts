import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import { COSMIC_ARCADE_PALETTE } from "../CosmicPalette";
import {
  createParallaxLayer,
  DistantAsteroid,
  initializeDistantAsteroids
} from "../SharedVFXInternal";

export function advanceDistantAsteroid(
  ast: DistantAsteroid,
  offsetX: number,
  wrapCoordinate: (val: number, margin?: number) => number
): { posX: number; y: number; rotation: number } {
  ast.x += ast.vx;
  ast.y += ast.vy;
  ast.rotation += ast.angularVelocity;
  const posX = wrapCoordinate(ast.x - offsetX * 0.1, ast.radius * 2);
  return { posX, y: ast.y, rotation: ast.rotation };
}

const distantAsteroidsLayer = createParallaxLayer<DistantAsteroid[]>({
  layerName: "layer4_distant_asteroids",
  isInitialized: (state) => state.distantAsteroidsInitialized,
  initialize: initializeDistantAsteroids,
  getState: (state) => state.distantAsteroids
});

export const DistantAsteroidBeltBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const layerCtx = distantAsteroidsLayer(world);
    if (!layerCtx) return;
    const { layerState: asteroids, offsetX, wrapCoordinate } = layerCtx;

    ctx.save();

    for (let i = 0; i < asteroids.length; i++) {
      const ast = asteroids[i];
      const { posX, y, rotation } = advanceDistantAsteroid(ast, offsetX, wrapCoordinate);

      ctx.save();
      ctx.translate(posX, y);
      ctx.rotate(rotation);

      ctx.fillStyle = ast.color;
      ctx.strokeStyle = COSMIC_ARCADE_PALETTE.mutedBlue;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (ast.points.length > 0) {
        ctx.moveTo(ast.points[0].x, ast.points[0].y);
        for (let p = 1; p < ast.points.length; p++) {
          ctx.lineTo(ast.points[p].x, ast.points[p].y);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
};

export const SkiaDistantAsteroidBeltBackgroundEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const layerCtx = distantAsteroidsLayer(world);
    if (!layerCtx) return;
    const { layerState: asteroids, offsetX, wrapCoordinate } = layerCtx;

    canvas.save();

    const fillPaint = Skia.Paint();
    fillPaint.setAlphaf(0.35);

    const strokePaint = Skia.Paint();
    strokePaint.setStyle(Skia.PaintStyle.Stroke);
    strokePaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.mutedBlue));
    strokePaint.setAlphaf(0.35);
    strokePaint.setStrokeWidth(1);

    for (let i = 0; i < asteroids.length; i++) {
      const ast = asteroids[i];
      const { posX, y, rotation } = advanceDistantAsteroid(ast, offsetX, wrapCoordinate);

      canvas.save();
      canvas.translate(posX, y);
      canvas.rotate((rotation * 180) / Math.PI, 0, 0);

      fillPaint.setColor(ast.skColor || Skia.Color(COSMIC_ARCADE_PALETTE.cosmicNavy));
      fillPaint.setAlphaf(0.35);

      if (ast.skPath) {
        canvas.drawPath(ast.skPath, fillPaint);
        canvas.drawPath(ast.skPath, strokePaint);
      }

      canvas.restore();
    }

    canvas.restore();
  }
};
