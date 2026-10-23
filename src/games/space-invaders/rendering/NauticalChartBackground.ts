import { EffectDrawer, Theme, THEME_RESOURCE_KEY, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import {
  AQUI_HAY_DRAGONES_ALPHAS,
  AQUI_HAY_DRAGONES_PALETTE,
} from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";

/** Concept pack ids that enable the parchment chart backdrop. */
export const NAUTICAL_CHART_THEME_IDS = new Set(["aqui_hay_dragones", "nautical-chart"]);

export function isNauticalChartTheme(theme: Theme | undefined | null): boolean {
  const id = theme?.conceptPack?.id;
  return typeof id === "string" && NAUTICAL_CHART_THEME_IDS.has(id);
}

/**
 * Draw parchment chart base: fill, double ink frame, faint grid, teal wave marks.
 * Coordinates use world space (same as gameplay). No blur / gradients.
 * Art bible §§5–8 (simplified Phase 2).
 */
export function drawNauticalChartBackdrop(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  worldHeight: number
): void {
  const P = AQUI_HAY_DRAGONES_PALETTE;
  const A = AQUI_HAY_DRAGONES_ALPHAS;

  // Scale frame margins from art-bible 206-wide board → current width
  const sx = worldWidth / 206;
  const marginOuter = 6 * sx;
  const marginInner = 10 * sx;
  const outerStroke = Math.max(1, 1.5 * sx);
  const innerStroke = Math.max(0.6, 0.6 * sx);

  ctx.save();

  // 1. Pergamino
  ctx.fillStyle = P.parchment;
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // 2. Marco exterior
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = outerStroke;
  ctx.strokeRect(
    marginOuter,
    marginOuter,
    worldWidth - marginOuter * 2,
    worldHeight - marginOuter * 2
  );

  // 3. Marco interior
  ctx.lineWidth = innerStroke;
  ctx.strokeRect(
    marginInner,
    marginInner,
    worldWidth - marginInner * 2,
    worldHeight - marginInner * 2
  );

  // 4. Cuadrícula (meridianos / paralelos) — alpha 0.12
  ctx.strokeStyle = P.ink;
  ctx.globalAlpha = A.grid;
  ctx.lineWidth = Math.max(0.8, 1 * sx);
  const gridX = [0.25, 0.5, 0.75].map((f) => worldWidth * f);
  const gridY = [0.26, 0.48, 0.69, 0.9].map((f) => worldHeight * f);
  for (const x of gridX) {
    ctx.beginPath();
    ctx.moveTo(x, marginInner);
    ctx.lineTo(x, worldHeight - marginInner);
    ctx.stroke();
  }
  for (const y of gridY) {
    ctx.beginPath();
    ctx.moveTo(marginInner, y);
    ctx.lineTo(worldWidth - marginInner, y);
    ctx.stroke();
  }

  // 5. Ondas del mar (teal, alpha 0.5) — fixed relative positions
  ctx.globalAlpha = A.waves;
  ctx.strokeStyle = P.teal;
  ctx.lineWidth = Math.max(1, 1.4 * sx);
  ctx.lineCap = "round";
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
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + waveW * 0.25, y - waveW * 0.25, x + waveW * 0.5, y);
    ctx.quadraticCurveTo(x + waveW * 0.75, y + waveW * 0.25, x + waveW, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Background effect: only paints when the active Theme is Aquí hay dragones.
 */
export const drawNauticalChartBackgroundEffect: EffectDrawer<
  CanvasRenderingContext2D,
  SpaceInvadersComponentRegistry
> = {
  draw(ctx, world) {
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    if (!isNauticalChartTheme(theme)) return;

    const config = world.getResource<{ worldWidth?: number; worldHeight?: number }>("GameConfig");
    const w = config?.worldWidth ?? GAME_CONFIG.worldWidth;
    const h = config?.worldHeight ?? GAME_CONFIG.worldHeight;
    drawNauticalChartBackdrop(ctx, w, h);
  },
};
