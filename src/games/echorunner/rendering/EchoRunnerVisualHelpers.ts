/**
 * Pure layout and procedural geometry helpers for Echo Runner rendering.
 *
 * Provides shared, deterministic layout calculations for background elements
 * (stars, perspective grid, skyline, pillars, ruins, flora, motes) and player
 * presentation details (motion streaks) across Canvas and Skia renderers.
 */

import type { EchoRunnerResolvedPalette } from "./EchoRunnerVisualUtils";

export interface EchoStarLayoutItem {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}

export interface EchoPerspectiveGrid {
  vanishingX: number;
  horizonY: number;
  radialLines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  horizontalLines: Array<{ y: number }>;
}

export interface EchoBuildingWindow {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EchoSkylineBuilding {
  x: number;
  y: number;
  width: number;
  height: number;
  fillAlpha: number;
  windows: EchoBuildingWindow[];
  hasAntenna: boolean;
  antennaX: number;
  antennaTopY: number;
}

export interface EchoPillarLayoutItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EchoRuinLayoutItem {
  x: number;
  y: number;
  width: number;
  height: number;
  hasRelicGlow: boolean;
  relicX: number;
  relicY: number;
  relicWidth: number;
  relicHeight: number;
}

export interface EchoFloraLayoutItem {
  x: number;
  baseY: number;
  stemHeight: number;
  color: string;
  hasBloom: boolean;
  bloomX: number;
  bloomY: number;
}

export interface EchoMoteLayoutItem {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface EchoPlayerRunTrail {
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  lineWidth: number;
  alphaFactor: number;
  color: string;
}

/**
 * Resolves deterministic star positions, sizes, and colors for the background.
 */
export function resolveEchoStarsLayout(
  width: number,
  horizonY: number,
  elapsed: number,
  palette: EchoRunnerResolvedPalette
): EchoStarLayoutItem[] {
  const stars: EchoStarLayoutItem[] = [];
  const maxY = Math.max(1, horizonY - 18);

  for (let i = 0; i < 22; i++) {
    const starX = (i * 127 + elapsed * (2 + (i % 3))) % width;
    const starY = (i * 59 + (i % 4) * 13) % maxY;
    const starSize = i % 5 === 0 ? 3 : 1.5;
    const alpha = 0.22 + (i % 3) * 0.07;
    const color = i % 4 === 0 ? palette.corruptionPurpleGlow : palette.restorationCyanGlow;

    stars.push({
      x: starX,
      y: starY,
      size: starSize,
      color,
      alpha,
    });
  }

  return stars;
}

/**
 * Resolves perspective grid lines for the archive background floor.
 */
export function resolveEchoPerspectiveGrid(
  width: number,
  height: number,
  horizonY: number,
  vanishingX: number
): EchoPerspectiveGrid {
  const radialLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i <= 14; i++) {
    radialLines.push({
      x1: vanishingX,
      y1: horizonY,
      x2: (i / 14) * width,
      y2: height,
    });
  }

  const horizontalLines: Array<{ y: number }> = [];
  const span = height - horizonY;
  for (let i = 1; i <= 8; i++) {
    const progress = i / 8;
    const gridY = horizonY + Math.pow(progress, 1.65) * span;
    horizontalLines.push({ y: gridY });
  }

  return {
    vanishingX,
    horizonY,
    radialLines,
    horizontalLines,
  };
}

/**
 * Resolves procedural skyline buildings, lit windows, and roof antennae.
 */
export function resolveEchoSkylineLayout(
  width: number,
  horizonY: number,
  elapsed: number
): EchoSkylineBuilding[] {
  const buildings: EchoSkylineBuilding[] = [];

  for (let i = 0; i < 20; i++) {
    const buildingWidth = 24 + ((i * 13) % 28);
    const buildingHeight = 36 + ((i * 29) % 100);
    const span = width + buildingWidth + 32;
    const wrappedX = (((i * 79 - elapsed * 7) % span) + span) % span;
    const buildingX = wrappedX - buildingWidth;
    const buildingY = horizonY - buildingHeight;
    const fillAlpha = 0.23 + (i % 3) * 0.035;

    const windows: EchoBuildingWindow[] = [];
    const rows = Math.floor((buildingHeight - 8) / 14);
    const columns = Math.max(1, Math.floor((buildingWidth - 8) / 10));
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if ((i + row * 2 + column) % 3 === 0) {
          windows.push({
            x: buildingX + 5 + column * 10,
            y: buildingY + 8 + row * 14,
            width: 3,
            height: 5,
          });
        }
      }
    }

    const hasAntenna = i % 4 === 1;
    const antennaX = buildingX + buildingWidth * 0.5;
    const antennaTopY = buildingY - 12 - (i % 3) * 4;

    buildings.push({
      x: buildingX,
      y: buildingY,
      width: buildingWidth,
      height: buildingHeight,
      fillAlpha,
      windows,
      hasAntenna,
      antennaX,
      antennaTopY,
    });
  }

  return buildings;
}

/**
 * Resolves fast vertical data stream pillar positions and dimensions.
 */
export function resolveEchoPillarLayout(
  width: number,
  height: number,
  elapsed: number
): EchoPillarLayoutItem[] {
  const pillars: EchoPillarLayoutItem[] = [];

  for (let i = 0; i < 4; i++) {
    const pillarX = ((i * 210 + elapsed * 20) % (width + 24)) - 12;
    const pillarY = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
    const pillarWidth = 8 + (i % 2) * 5;
    const pillarHeight = 34 + (i % 3) * 22;

    pillars.push({
      x: pillarX,
      y: pillarY,
      width: pillarWidth,
      height: pillarHeight,
    });
  }

  return pillars;
}

/**
 * Resolves foreground Archive ruins positions, sizes, and glowing relics.
 */
export function resolveEchoRuinsLayout(
  width: number,
  height: number,
  elapsed: number
): EchoRuinLayoutItem[] {
  const ruins: EchoRuinLayoutItem[] = [];
  const ruinBaseY = height * 0.78;

  for (let i = 0; i < 7; i++) {
    const ruinWidth = 18 + (i % 3) * 8;
    const span = width + ruinWidth + 24;
    const ruinX = (((i * (width / 7 + 17) - elapsed * 2.2) % span) + span) % span - ruinWidth;
    const ruinHeight = 24 + (i % 4) * 13;
    const ruinY = ruinBaseY - ruinHeight;
    const hasRelicGlow = i % 2 === 0;

    ruins.push({
      x: ruinX,
      y: ruinY,
      width: ruinWidth,
      height: ruinHeight,
      hasRelicGlow,
      relicX: ruinX + ruinWidth * 0.5,
      relicY: ruinY + 9,
      relicWidth: 3,
      relicHeight: Math.max(6, ruinHeight * 0.35),
    });
  }

  return ruins;
}

/**
 * Resolves foreground procedural pixel flora positions, stems, and blossoms.
 */
export function resolveEchoFloraLayout(
  width: number,
  height: number,
  elapsed: number,
  palette: EchoRunnerResolvedPalette
): EchoFloraLayoutItem[] {
  const flora: EchoFloraLayoutItem[] = [];

  for (let i = 0; i < 9; i++) {
    const plantX = (i * 131 + elapsed * 4) % width;
    const baseY = height - 8 - (i % 3) * 5;
    const stemHeight = 14 + (i % 4) * 5;
    const color = i % 3 === 0 ? palette.restorationGoldGlow : palette.restorationCyanGlow;
    const hasBloom = i % 2 === 0;

    flora.push({
      x: plantX,
      baseY,
      stemHeight,
      color,
      hasBloom,
      bloomX: plantX - 1,
      bloomY: baseY - stemHeight - 2,
    });
  }

  return flora;
}

/**
 * Resolves ambient drifting motes.
 */
export function resolveEchoMotesLayout(
  width: number,
  height: number,
  elapsed: number,
  palette: EchoRunnerResolvedPalette
): EchoMoteLayoutItem[] {
  const motes: EchoMoteLayoutItem[] = [];

  for (let i = 0; i < 8; i++) {
    const moteX = (i * 143 + elapsed * (5 + (i % 3))) % width;
    const moteY = (i * 187 + elapsed * (i % 2 === 0 ? 4 : 7)) % height;
    const radius = 1.5 + (i % 3);
    const color = i % 2 === 0 ? palette.restorationCyanGlow : palette.corruptionPurpleGlow;

    motes.push({
      x: moteX,
      y: moteY,
      radius,
      color,
    });
  }

  return motes;
}

/**
 * Resolves running motion trail streaks for player rendering.
 */
export function resolveEchoPlayerRunTrails(
  size: number,
  vx: number,
  tick: number,
  pixelSize: number,
  palette: EchoRunnerResolvedPalette
): EchoPlayerRunTrail[] {
  const trails: EchoPlayerRunTrail[] = [];
  const trailStrength = Math.min(1, Math.abs(vx) / 180);

  for (let i = 0; i < 3; i++) {
    const alphaFactor = trailStrength * (0.12 + i * 0.04);
    const color = i === 1 ? palette.corruptionPurpleGlow : palette.restorationCyanGlow;
    const lineWidth = Math.max(1, pixelSize * (0.6 + i * 0.25));

    const startX = -size * 0.22;
    const startY = -size * 0.2 + i * size * 0.1;

    const midX = -size * (0.42 + i * 0.12);
    const midY = -size * 0.28 + i * size * 0.11 + Math.sin(tick * 0.22 + i) * size * 0.035;

    const endX = -size * (0.62 + i * 0.13);
    const endY = -size * 0.14 + i * size * 0.1;

    trails.push({
      startX,
      startY,
      midX,
      midY,
      endX,
      endY,
      lineWidth,
      alphaFactor,
      color,
    });
  }

  return trails;
}
