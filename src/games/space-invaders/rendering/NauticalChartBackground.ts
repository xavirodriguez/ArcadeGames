import { EffectDrawer, Theme, THEME_RESOURCE_KEY, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import {
  AQUI_HAY_DRAGONES_ALPHAS,
  AQUI_HAY_DRAGONES_PALETTE,
} from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import {
  NAUTICAL_WIND_RESOURCE,
  NauticalWindState,
  isNauticalChartTheme,
} from "../nautical/NauticalThemeShared";

export { isNauticalChartTheme, NAUTICAL_CHART_THEME_IDS } from "../nautical/NauticalThemeShared";

export interface NauticalBackdropOptions {
  wind?: NauticalWindState | null;
  /** Rose centre in world space (HUD region). Defaults to art-bible scaled coords. */
  roseX?: number;
  roseY?: number;
}

/**
 * Draw parchment chart base: fill, double ink frame, grid, rhumb lines, wind-tilted waves.
 * Art bible §§5–9.
 */
export function drawNauticalChartBackdrop(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  worldHeight: number,
  options: NauticalBackdropOptions = {}
): void {
  const P = AQUI_HAY_DRAGONES_PALETTE;
  const A = AQUI_HAY_DRAGONES_ALPHAS;
  const wind = options.wind;

  const sx = worldWidth / 206;
  const sy = worldHeight / 420;
  const marginOuter = 6 * sx;
  const marginInner = 10 * sx;
  const outerStroke = Math.max(1, 1.5 * sx);
  const innerStroke = Math.max(0.6, 0.6 * sx);

  const roseX = options.roseX ?? 170 * sx;
  const roseY = options.roseY ?? 36 * sy;

  ctx.save();

  ctx.fillStyle = P.parchment;
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  ctx.strokeStyle = P.ink;
  ctx.lineWidth = outerStroke;
  ctx.strokeRect(marginOuter, marginOuter, worldWidth - marginOuter * 2, worldHeight - marginOuter * 2);
  ctx.lineWidth = innerStroke;
  ctx.strokeRect(marginInner, marginInner, worldWidth - marginInner * 2, worldHeight - marginInner * 2);

  ctx.strokeStyle = P.ink;
  ctx.globalAlpha = A.grid;
  ctx.lineWidth = Math.max(0.8, 1 * sx);
  for (const f of [0.25, 0.5, 0.75]) {
    const x = worldWidth * f;
    ctx.beginPath();
    ctx.moveTo(x, marginInner);
    ctx.lineTo(x, worldHeight - marginInner);
    ctx.stroke();
  }
  for (const f of [0.26, 0.48, 0.69, 0.9]) {
    const y = worldHeight * f;
    ctx.beginPath();
    ctx.moveTo(marginInner, y);
    ctx.lineTo(worldWidth - marginInner, y);
    ctx.stroke();
  }

  const activeAngle = wind ? (wind.sign < 0 ? Math.PI : 0) : null;
  const nRhumb = 16;
  for (let i = 0; i < nRhumb; i++) {
    const angle = (i / nRhumb) * Math.PI * 2;
    const isActive =
      activeAngle !== null &&
      wind &&
      wind.force > 0 &&
      Math.abs(Math.cos(angle - activeAngle)) > 0.92;

    ctx.globalAlpha = isActive ? A.rhumbActive : A.rhumbLines;
    ctx.strokeStyle = isActive ? P.teal : P.ink;
    ctx.lineWidth = Math.max(0.5, 0.8 * sx);
    const len = Math.max(worldWidth, worldHeight);
    ctx.beginPath();
    ctx.moveTo(roseX - Math.cos(angle) * len, roseY - Math.sin(angle) * len);
    ctx.lineTo(roseX + Math.cos(angle) * len, roseY + Math.sin(angle) * len);
    ctx.stroke();
  }

  const force = wind?.force ?? 0;
  const sign = wind?.sign ?? 1;
  const tiltRad = (force / 3) * ((8 * Math.PI) / 180) * sign;
  const stretch = 1 + (force / 3) * 0.25;

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
  const waveW = 16 * sx * stretch;
  for (const [fx, fy] of waveMarks) {
    const x = fx * worldWidth;
    const y = fy * worldHeight;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tiltRad);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(waveW * 0.25, -waveW * 0.25, waveW * 0.5, 0);
    ctx.quadraticCurveTo(waveW * 0.75, waveW * 0.25, waveW, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

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
    const wind = world.getResource<NauticalWindState>(NAUTICAL_WIND_RESOURCE) ?? null;
    drawNauticalChartBackdrop(ctx, w, h, { wind });
  },
};
