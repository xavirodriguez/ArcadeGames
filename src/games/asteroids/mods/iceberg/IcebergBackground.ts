import type { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { ICEBERG_PALETTE } from "./IcebergPalette";

function getScreen(world: {
  getResource: (key: string) => { width: number; height: number } | undefined;
}): { width: number; height: number } {
  return world.getResource("ScreenConfig") || { width: 800, height: 600 };
}

function getTick(world: { tick?: number }): number {
  return typeof world.tick === "number" ? world.tick : 0;
}

/** Horizontal pack-ice strata band descriptors (normalized 0–1 height). */
const STRATA = [
  { y: 0.12, h: 0.04, alpha: 0.2 },
  { y: 0.28, h: 0.03, alpha: 0.14 },
  { y: 0.45, h: 0.05, alpha: 0.18 },
  { y: 0.62, h: 0.03, alpha: 0.12 },
  { y: 0.78, h: 0.04, alpha: 0.16 }
] as const;

/** Aurora band polygons in normalized screen space (top third). */
const AURORA_BANDS = [
  [
    { x: 0.0, y: 0.02 },
    { x: 0.35, y: 0.0 },
    { x: 0.55, y: 0.08 },
    { x: 0.2, y: 0.12 }
  ],
  [
    { x: 0.3, y: 0.0 },
    { x: 0.7, y: 0.03 },
    { x: 0.85, y: 0.1 },
    { x: 0.5, y: 0.14 },
    { x: 0.25, y: 0.08 }
  ],
  [
    { x: 0.55, y: 0.01 },
    { x: 1.0, y: 0.0 },
    { x: 1.0, y: 0.09 },
    { x: 0.7, y: 0.13 }
  ],
  [
    { x: 0.1, y: 0.1 },
    { x: 0.45, y: 0.12 },
    { x: 0.4, y: 0.2 },
    { x: 0.05, y: 0.16 }
  ]
] as const;

/**
 * Arctic ocean base + subtle horizontal strata (Out Run–style mass bands).
 *
 * @public
 */
export const PolarOceanBackgroundEffect: EffectDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world) {
    const { width, height } = getScreen(world);
    const tick = getTick(world);
    const drift = (tick * 0.15) % width;

    ctx.save();
    ctx.fillStyle = ICEBERG_PALETTE.oceanBase;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < STRATA.length; i++) {
      const s = STRATA[i];
      const y = s.y * height;
      const h = Math.max(2, s.h * height);
      // Slow horizontal drift of strata edges (parallax-ish)
      const xOff = ((drift * (0.3 + i * 0.08)) % (width * 0.2)) - width * 0.1;
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = ICEBERG_PALETTE.icebergFar;
      ctx.fillRect(xOff, y, width + width * 0.2, h);
    }

    // Deep water vignette bottom
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgba(5, 12, 28, 1)";
    ctx.fillRect(0, height * 0.85, width, height * 0.15);

    ctx.restore();
  }
};

/**
 * Skia polar ocean background.
 *
 * @public
 */
export const SkiaPolarOceanBackgroundEffect: EffectDrawer<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  CoreComponentRegistry
> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height } = getScreen(world);
    const tick = getTick(world);
    const drift = (tick * 0.15) % width;

    canvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    paint.setColor(Skia.Color(ICEBERG_PALETTE.oceanBase));
    canvas.drawRect({ x: 0, y: 0, width, height }, paint);

    paint.setColor(Skia.Color(ICEBERG_PALETTE.icebergFar));
    for (let i = 0; i < STRATA.length; i++) {
      const s = STRATA[i];
      const y = s.y * height;
      const h = Math.max(2, s.h * height);
      const xOff = ((drift * (0.3 + i * 0.08)) % (width * 0.2)) - width * 0.1;
      paint.setAlphaf(s.alpha);
      canvas.drawRect({ x: xOff, y, width: width + width * 0.2, height: h }, paint);
    }

    paint.setAlphaf(0.35);
    paint.setColor(Skia.Color("#050c1c"));
    canvas.drawRect({ x: 0, y: height * 0.85, width, height: height * 0.15 }, paint);

    canvas.restore();
  }
};

/**
 * Geometric aurora — translucent polygonal bands (no soft gradients).
 *
 * @public
 */
export const GeometricAuroraBackgroundEffect: EffectDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world) {
    const { width, height } = getScreen(world);
    const tick = getTick(world);
    // Gentle vertical shimmer of bands
    const shimmer = Math.sin(tick * 0.02) * height * 0.01;

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = ICEBERG_PALETTE.aurora;

    for (let b = 0; b < AURORA_BANDS.length; b++) {
      const band = AURORA_BANDS[b];
      const phase = Math.sin(tick * 0.015 + b * 0.7) * height * 0.008;
      ctx.beginPath();
      for (let i = 0; i < band.length; i++) {
        const p = band[i];
        const x = p.x * width;
        const y = p.y * height + shimmer + phase;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
};

/**
 * Skia geometric aurora.
 *
 * @public
 */
export const SkiaGeometricAuroraBackgroundEffect: EffectDrawer<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  CoreComponentRegistry
> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height } = getScreen(world);
    const tick = getTick(world);
    const shimmer = Math.sin(tick * 0.02) * height * 0.01;

    canvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ICEBERG_PALETTE.aurora));
    paint.setAlphaf(0.15);

    for (let b = 0; b < AURORA_BANDS.length; b++) {
      const band = AURORA_BANDS[b];
      const phase = Math.sin(tick * 0.015 + b * 0.7) * height * 0.008;
      const path = Skia.Path.Make();
      for (let i = 0; i < band.length; i++) {
        const p = band[i];
        const x = p.x * width;
        const y = p.y * height + shimmer + phase;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.close();
      canvas.drawPath(path, paint);
    }

    canvas.restore();
  }
};
