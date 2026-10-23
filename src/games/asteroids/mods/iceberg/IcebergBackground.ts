import type { EffectDrawer } from "@tiny-aster/core";
import type { CoreComponentRegistry } from "@tiny-aster/core";
import { Skia, getPaint, type SkCanvas } from "../../../shared/rendering/SkiaContext";
import { ICEBERG_PALETTE } from "./IcebergPalette";

function isIcebergTheme(world: { getResource: (k: string) => unknown }): boolean {
  const theme = world.getResource("Theme") as
    | { conceptPack?: { id?: string }; vfxProfile?: { backgroundLayers?: string[] } }
    | undefined;
  if (theme?.conceptPack?.id === "iceberg") return true;
  const layers = theme?.vfxProfile?.backgroundLayers;
  return !!(layers && (layers.includes("polar_ocean") || layers.includes("geometric_aurora")));
}

function layerEnabled(
  world: { getResource: (k: string) => unknown },
  name: string
): boolean {
  const theme = world.getResource("Theme") as
    | { vfxProfile?: { backgroundLayers?: string[] } }
    | undefined;
  const layers = theme?.vfxProfile?.backgroundLayers;
  if (!layers || layers.length === 0) return isIcebergTheme(world);
  return layers.includes(name);
}

/** Horizontal pack-ice strata bands (Out Run rhythm → polar drift). */
function drawStrataCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tick: number
): void {
  const bandH = Math.max(8, height / 18);
  const drift = (tick * 0.15) % bandH;
  ctx.save();
  for (let y = -bandH + drift; y < height + bandH; y += bandH * 2) {
    ctx.fillStyle = ICEBERG_PALETTE.icebergFar;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(0, y, width, bandH * 0.55);
  }
  ctx.restore();
}

/** 3–4 translucent polygonal aurora ribbons across the top. */
function drawAuroraCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tick: number
): void {
  const ribbons = 4;
  ctx.save();
  for (let i = 0; i < ribbons; i++) {
    const phase = tick * 0.008 + i * 1.2;
    const y0 = height * (0.08 + i * 0.05);
    const amp = height * 0.04;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = t * width;
      const y = y0 + Math.sin(phase + t * Math.PI * 2 + i) * amp;
      ctx.lineTo(x, y);
    }
    for (let s = steps; s >= 0; s--) {
      const t = s / steps;
      const x = t * width;
      const y = y0 + 14 + Math.sin(phase + t * Math.PI * 2 + i + 0.4) * amp * 0.6;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = ICEBERG_PALETTE.aurora;
    ctx.globalAlpha = 0.12 + i * 0.02;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Polar ocean base fill + subtle strata bands.
 *
 * @public
 */
export const PolarOceanBackgroundEffect: EffectDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world) {
    if (!layerEnabled(world, "polar_ocean")) return;
    const w = ctx.canvas?.width || 800;
    const h = ctx.canvas?.height || 600;
    const tick = (world as { tick?: number }).tick ?? 0;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = ICEBERG_PALETTE.oceanBase;
    ctx.fillRect(0, 0, w, h);
    drawStrataCanvas(ctx, w, h, tick);
    ctx.restore();
  }
};

/**
 * Geometric aurora borealis (faceted translucent bands).
 *
 * @public
 */
export const GeometricAuroraBackgroundEffect: EffectDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world) {
    if (!layerEnabled(world, "geometric_aurora")) return;
    const w = ctx.canvas?.width || 800;
    const h = ctx.canvas?.height || 600;
    const tick = (world as { tick?: number }).tick ?? 0;
    drawAuroraCanvas(ctx, w, h, tick);
  }
};

/**
 * Polar ocean (Skia).
 *
 * @public
 */
export const SkiaPolarOceanBackgroundEffect: EffectDrawer<
  SkCanvas,
  CoreComponentRegistry
> = {
  draw(canvas, world) {
    if (!Skia || !layerEnabled(world, "polar_ocean")) return;
    const screen = world.getResource("ScreenConfig") as
      | { width?: number; height?: number }
      | undefined;
    const w = screen?.width || 800;
    const h = screen?.height || 600;
    const tick = (world as { tick?: number }).tick ?? 0;

    canvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ICEBERG_PALETTE.oceanBase));
    canvas.drawRect({ x: 0, y: 0, width: w, height: h }, paint);

    const bandH = Math.max(8, h / 18);
    const drift = (tick * 0.15) % bandH;
    paint.setColor(Skia.Color(ICEBERG_PALETTE.icebergFar));
    paint.setAlphaf(0.22);
    for (let y = -bandH + drift; y < h + bandH; y += bandH * 2) {
      canvas.drawRect({ x: 0, y, width: w, height: bandH * 0.55 }, paint);
    }
    canvas.restore();
  }
};

/**
 * Geometric aurora (Skia).
 *
 * @public
 */
export const SkiaGeometricAuroraBackgroundEffect: EffectDrawer<
  SkCanvas,
  CoreComponentRegistry
> = {
  draw(canvas, world) {
    if (!Skia || !layerEnabled(world, "geometric_aurora")) return;
    const screen = world.getResource("ScreenConfig") as
      | { width?: number; height?: number }
      | undefined;
    const w = screen?.width || 800;
    const h = screen?.height || 600;
    const tick = (world as { tick?: number }).tick ?? 0;

    canvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    for (let i = 0; i < 4; i++) {
      const phase = tick * 0.008 + i * 1.2;
      const y0 = h * (0.08 + i * 0.05);
      const amp = h * 0.04;
      const path = Skia.Path.Make();
      path.moveTo(0, y0);
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        path.lineTo(t * w, y0 + Math.sin(phase + t * Math.PI * 2 + i) * amp);
      }
      for (let s = steps; s >= 0; s--) {
        const t = s / steps;
        path.lineTo(
          t * w,
          y0 + 14 + Math.sin(phase + t * Math.PI * 2 + i + 0.4) * amp * 0.6
        );
      }
      path.close();
      paint.setColor(Skia.Color(ICEBERG_PALETTE.aurora));
      paint.setAlphaf(0.12 + i * 0.02);
      canvas.drawPath(path, paint);
    }
    canvas.restore();
  }
};
