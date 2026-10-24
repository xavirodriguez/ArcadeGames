/**
 * Skia-side parchment chart backdrop for Aquí hay dragones.
 * Mirrors NauticalChartBackground.ts without depending on Canvas types at call sites.
 */
import { Theme, THEME_RESOURCE_KEY, World } from "@tiny-aster/core";
import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import {
  AQUI_HAY_DRAGONES_ALPHAS,
  AQUI_HAY_DRAGONES_PALETTE,
} from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import { isNauticalChartTheme } from "../nautical/NauticalThemeShared";

/** Minimal Skia paint factory injected by the Skia visuals module to avoid tight coupling. */
export type SkiaPaintFactory = {
  makePaint: () => SkPaint;
  setColor: (paint: SkPaint, color: string, alpha?: number) => void;
  setStroke: (paint: SkPaint, width: number) => void;
  setStyleFill: (paint: SkPaint) => void;
  setStyleStroke: (paint: SkPaint) => void;
};

/**
 * Draw parchment chart using Skia canvas + caller-provided paint helpers.
 * If paintFactory is omitted, this is a no-op (keeps module safe when Skia runtime differs).
 */
export function drawNauticalChartBackdropSkia(
  canvas: SkCanvas,
  worldWidth: number,
  worldHeight: number,
  paintFactory?: SkiaPaintFactory
): void {
  if (!paintFactory) return;

  const P = AQUI_HAY_DRAGONES_PALETTE;
  const A = AQUI_HAY_DRAGONES_ALPHAS;
  const sx = worldWidth / 206;
  const marginOuter = 6 * sx;
  const marginInner = 10 * sx;
  const outerStroke = Math.max(1, 1.5 * sx);
  const innerStroke = Math.max(0.6, 0.6 * sx);

  const fill = paintFactory.makePaint();
  paintFactory.setStyleFill(fill);
  paintFactory.setColor(fill, P.parchment);
  canvas.drawRect({ x: 0, y: 0, width: worldWidth, height: worldHeight } as any, fill);

  const stroke = paintFactory.makePaint();
  paintFactory.setStyleStroke(stroke);
  paintFactory.setColor(stroke, P.ink);
  paintFactory.setStroke(stroke, outerStroke);
  canvas.drawRect(
    {
      x: marginOuter,
      y: marginOuter,
      width: worldWidth - marginOuter * 2,
      height: worldHeight - marginOuter * 2,
    } as any,
    stroke
  );
  paintFactory.setStroke(stroke, innerStroke);
  canvas.drawRect(
    {
      x: marginInner,
      y: marginInner,
      width: worldWidth - marginInner * 2,
      height: worldHeight - marginInner * 2,
    } as any,
    stroke
  );

  paintFactory.setColor(stroke, P.ink, A.grid);
  paintFactory.setStroke(stroke, Math.max(0.8, 1 * sx));
  const gridX = [0.25, 0.5, 0.75].map((f) => worldWidth * f);
  const gridY = [0.26, 0.48, 0.69, 0.9].map((f) => worldHeight * f);
  for (const x of gridX) {
    canvas.drawLine(x, marginInner, x, worldHeight - marginInner, stroke);
  }
  for (const y of gridY) {
    canvas.drawLine(marginInner, y, worldWidth - marginInner, y, stroke);
  }

  paintFactory.setColor(stroke, P.teal, A.waves);
  paintFactory.setStroke(stroke, Math.max(1, 1.4 * sx));
  const waveMarks: Array<[number, number]> = [
    [0.11, 0.33],
    [0.73, 0.45],
    [0.15, 0.6],
    [0.58, 0.62],
    [0.34, 0.82],
    [0.78, 0.85],
  ];
  const waveW = 16 * sx;
  for (const [fx, fy] of waveMarks) {
    const x = fx * worldWidth;
    const y = fy * worldHeight;
    canvas.drawLine(x, y, x + waveW * 0.5, y - waveW * 0.15, stroke);
    canvas.drawLine(x + waveW * 0.5, y - waveW * 0.15, x + waveW, y, stroke);
  }
}

export function createDrawSkiaNauticalChartBackgroundEffect(paintFactory?: SkiaPaintFactory) {
  return {
    draw(canvas: SkCanvas, world: World<SpaceInvadersComponentRegistry>) {
      const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
      if (!isNauticalChartTheme(theme)) return;
      const config = world.getResource<{ worldWidth?: number; worldHeight?: number }>("GameConfig");
      const w = config?.worldWidth ?? GAME_CONFIG.worldWidth;
      const h = config?.worldHeight ?? GAME_CONFIG.worldHeight;
      drawNauticalChartBackdropSkia(canvas, w, h, paintFactory);
    },
  };
}
