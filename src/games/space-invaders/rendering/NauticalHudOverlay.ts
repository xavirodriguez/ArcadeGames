import { EffectDrawer, Theme, THEME_RESOURCE_KEY, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import {
  AQUI_HAY_DRAGONES_PALETTE,
} from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import { isNauticalChartTheme } from "./NauticalChartBackground";
import {
  NAUTICAL_WIND_RESOURCE,
  NauticalWindState,
} from "../systems/NauticalWindSystem";

const P = AQUI_HAY_DRAGONES_PALETTE;

/**
 * Nautical HUD overlay (art bible §10).
 * Leguas (score), Viento + arrow, compass rose, Tripulación (mini galleons).
 */
function drawMiniGalleon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.8, 1 * s);
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y);
  ctx.lineTo(x + 6 * s, y);
  ctx.lineTo(x + 4 * s, y + 3 * s);
  ctx.lineTo(x - 4 * s, y + 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 8 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 8 * s);
  ctx.lineTo(x + 5 * s, y - 3 * s);
  ctx.lineTo(x, y - 2 * s);
  ctx.closePath();
  ctx.fill();
}

function drawNauticalHud(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  worldHeight: number,
  score: number,
  lives: number,
  wind: NauticalWindState | null
): void {
  const sx = worldWidth / 206;
  const sy = worldHeight / 420;

  ctx.save();
  ctx.textBaseline = "alphabetic";

  // --- Leguas (score) ---
  ctx.fillStyle = P.inkMuted;
  ctx.font = `italic ${Math.max(10, 12 * sx)}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "left";
  ctx.fillText("Leguas", 22 * sx, 22 * sy);
  ctx.fillStyle = P.ink;
  ctx.font = `bold ${Math.max(14, 18 * sx)}px Georgia, "Times New Roman", serif`;
  ctx.fillText(String(Math.floor(score)), 22 * sx, 42 * sy);

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
  // Active wind ray: force>0 → east (sign+) or west (sign−)
  const windAngle = force > 0 ? (sign >= 0 ? 0 : Math.PI) : null;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 === 0 ? r : r * 0.55;
    const isWindRay =
      windAngle != null &&
      Math.abs(Math.atan2(Math.sin(a - windAngle), Math.cos(a - windAngle))) < 0.2;
    ctx.strokeStyle = isWindRay ? P.teal : P.ink;
    ctx.lineWidth = isWindRay
      ? Math.max(1.4, 1.8 * sx)
      : Math.max(0.8, 1 * sx);
    ctx.globalAlpha = isWindRay ? 1 : 0.85;
    ctx.beginPath();
    ctx.moveTo(roseX, roseY);
    ctx.lineTo(roseX + Math.cos(a) * len, roseY + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = Math.max(0.8, 1 * sx);
  ctx.beginPath();
  ctx.arc(roseX, roseY, 2 * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `bold ${Math.max(8, 9 * sx)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("N", roseX, roseY - r - 2 * sy);

  // --- Tripulación (lives) bottom-left ---
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

export const drawNauticalHudEffect: EffectDrawer<
  CanvasRenderingContext2D,
  SpaceInvadersComponentRegistry
> = {
  draw(ctx, world) {
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    if (!isNauticalChartTheme(theme)) return;

    const w = GAME_CONFIG.worldWidth;
    const h = GAME_CONFIG.worldHeight;
    const gameState = world.getSingleton("GameState") as
      | { score?: number; lives?: number }
      | undefined;
    const score = gameState?.score ?? 0;
    const lives = gameState?.lives ?? 3;
    const wind =
      (world.getResource(NAUTICAL_WIND_RESOURCE) as NauticalWindState | undefined) ??
      null;

    drawNauticalHud(ctx, w, h, score, lives, wind);
  },
};
