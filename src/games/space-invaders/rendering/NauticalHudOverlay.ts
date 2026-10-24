import { EffectDrawer, Theme, THEME_RESOURCE_KEY } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { AQUI_HAY_DRAGONES_PALETTE } from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import { isNauticalChartTheme } from "./NauticalChartBackground";
import {
  NAUTICAL_WIND_RESOURCE,
  NauticalWindState,
  ensureNauticalWind,
} from "../systems/NauticalWindSystem";

/**
 * Aquí hay dragones HUD — art bible §10.
 * Leguas (score), Viento + arrow, compass rose, Tripulación (mini galleons).
 */
export function drawNauticalHud(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  worldHeight: number,
  score: number,
  lives: number,
  wind: NauticalWindState | null
): void {
  const P = AQUI_HAY_DRAGONES_PALETTE;
  const sx = worldWidth / 206;
  const sy = worldHeight / 420;

  ctx.save();
  ctx.textBaseline = "alphabetic";

  // --- Leguas (score) top-left ---
  ctx.fillStyle = P.inkMuted;
  ctx.font = `italic ${Math.max(10, 12 * sx)}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "left";
  ctx.fillText("Leguas", 18 * sx, 26 * sy);

  ctx.fillStyle = P.ink;
  ctx.font = `${Math.max(12, 16 * sx)}px Georgia, "Times New Roman", serif`;
  const scoreStr = String(Math.max(0, Math.floor(score)))
    .padStart(5, "0")
    .replace(/(\d)(?=(\d{3})+$)/g, "$1 ");
  ctx.fillText(scoreStr.trim(), 18 * sx, 46 * sy);

  // --- Viento label + arrow ---
  ctx.fillStyle = P.inkMuted;
  ctx.font = `italic ${Math.max(10, 12 * sx)}px Georgia, "Times New Roman", serif`;
  ctx.fillText("Viento", 110 * sx, 22 * sy);

  const force = wind?.force ?? 0;
  const sign = wind?.sign ?? 1;
  const ax = 125 * sx;
  const ay = 38 * sy;
  const arrowLen = (8 + force * 4) * sx;

  ctx.strokeStyle = P.red;
  ctx.fillStyle = P.red;
  ctx.lineWidth = Math.max(1.2, 1.5 * sx);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (force === 0) {
    ctx.beginPath();
    ctx.moveTo(ax - 4 * sx, ay);
    ctx.lineTo(ax + 4 * sx, ay);
    ctx.moveTo(ax, ay - 4 * sx);
    ctx.lineTo(ax, ay + 4 * sx);
    ctx.stroke();
  } else {
    const dir = sign >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(ax - dir * arrowLen * 0.5, ay);
    ctx.lineTo(ax + dir * arrowLen * 0.5, ay);
    ctx.stroke();
    const tipX = ax + dir * arrowLen * 0.5;
    ctx.beginPath();
    ctx.moveTo(tipX, ay);
    ctx.lineTo(tipX - dir * 5 * sx, ay - 3.5 * sx);
    ctx.lineTo(tipX - dir * 5 * sx, ay + 3.5 * sx);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = P.inkMuted;
  ctx.font = `${Math.max(8, 9 * sx)}px Georgia, serif`;
  ctx.fillText(force === 0 ? "calma" : `${force}`, ax + 14 * sx, ay + 4 * sy);

  // --- Rosa de los vientos (8-point) ---
  const roseX = 170 * sx;
  const roseY = 36 * sy;
  const r = 10 * sx;
  ctx.strokeStyle = P.ink;
  ctx.fillStyle = P.ink;
  ctx.lineWidth = Math.max(0.8, 1 * sx);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 === 0 ? r : r * 0.55;
    ctx.beginPath();
    ctx.moveTo(roseX, roseY);
    ctx.lineTo(roseX + Math.cos(a) * len, roseY + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(roseX, roseY, 2 * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `bold ${Math.max(8, 9 * sx)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("N", roseX, roseY - r - 2 * sy);

  // --- Tripulación (lives) bottom-left — §10.2 ---
  const crewY = worldHeight - 12 * sy;
  const labelY = crewY - 14 * sy;
  ctx.fillStyle = P.inkMuted;
  ctx.font = `italic ${Math.max(10, 12 * sx)}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "left";
  ctx.fillText("Tripulación", 22 * sx, labelY);

  const nLives = Math.max(0, Math.min(5, Math.floor(lives)));
  for (let i = 0; i < nLives; i++) {
    const cx = (22 + i * 18) * sx;
    drawMiniGalleon(ctx, cx, crewY, 0.45 * sx, P.ink);
  }

  ctx.restore();
}

function drawMiniGalleon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(0.8, s * 1.2);
  ctx.beginPath();
  ctx.moveTo(-7 * s, 0);
  ctx.lineTo(7 * s, 0);
  ctx.lineTo(5 * s, 4 * s);
  ctx.lineTo(-5 * s, 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -10 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -2 * s);
  ctx.lineTo(0, -9 * s);
  ctx.lineTo(5 * s, -3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const drawNauticalHudEffect: EffectDrawer<
  CanvasRenderingContext2D,
  SpaceInvadersComponentRegistry
> = {
  draw(ctx, world) {
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    if (!isNauticalChartTheme(theme)) return;

    const config = world.getResource<{ worldWidth?: number; worldHeight?: number }>("GameConfig");
    const w = config?.worldWidth ?? GAME_CONFIG.worldWidth;
    const h = config?.worldHeight ?? GAME_CONFIG.worldHeight;

    const gameState = world.getSingleton("GameState");
    const score = gameState?.score ?? 0;
    const lives = gameState?.lives ?? 0;

    const wind =
      ensureNauticalWind(world) ??
      world.getResource<NauticalWindState>(NAUTICAL_WIND_RESOURCE) ??
      null;

    drawNauticalHud(ctx, w, h, score, lives, wind);
  },
};
