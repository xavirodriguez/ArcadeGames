import type { RaceStateComponent, RacerComponent, RoadData, ProjectedSegment } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { projectRoad } from "./RoadProjection";
import { scenarioHash } from "./OutrunPalettes";

export interface RacerProjectionResult {
  sx: number;
  sy: number;
  sw: number;
  lateral: number;
  carW: number;
  carH: number;
  bestClip: number;
}

export function computeRacerProjection(
  racer: RacerComponent,
  state: RaceStateComponent,
  roadData: RoadData,
  config: OutrunConfig,
  projectionBuffer: ProjectedSegment[],
  capacity: number
): RacerProjectionResult | null {
  const count = projectRoad(
    roadData.segments,
    state.playerZ,
    state.playerX,
    config.cameraHeight,
    config.cameraDepth,
    config.roadWidth,
    Math.min(config.drawDistance, capacity),
    config.WIDTH,
    config.HEIGHT,
    projectionBuffer
  );

  const trackLength = roadData.trackLength;
  let relZ = racer.z - state.playerZ;
  if (relZ > trackLength / 2) relZ -= trackLength;
  if (relZ < -trackLength / 2) relZ += trackLength;
  if (relZ <= 0 || relZ > config.drawDistance * config.segmentLength) return null;

  let best: ProjectedSegment | null = null;
  for (let i = 0; i < count; i++) {
    const p = projectionBuffer[i];
    if (p.p1z <= relZ && p.p2z >= relZ) {
      best = p;
      break;
    }
  }
  if (!best) return null;

  const t = (relZ - best.p1z) / Math.max(0.001, best.p2z - best.p1z);
  const sx = best.x1 + (best.x2 - best.x1) * t;
  const sy = best.y1 + (best.y2 - best.y1) * t;
  const sw = best.w1 + (best.w2 - best.w1) * t;

  const lateral = racer.lateralX * sw;
  const carW = sw * 0.35;
  const carH = carW * 0.6;

  if (sy > config.HEIGHT || sy >= best.clip || carW < 2) return null;

  return { sx, sy, sw, lateral, carW, carH, bestClip: best.clip };
}

export interface PlayerCarGeometry {
  baseX: number;
  baseY: number;
  carScale: number;
  tiltAngle: number;
  isOffroad: boolean;
  speedRatio: number;
}

export function computePlayerCarGeometry(
  state: RaceStateComponent,
  config: OutrunConfig,
  visualOffset?: { offsetX?: number; offsetY?: number }
): PlayerCarGeometry {
  const vX = visualOffset?.offsetX ?? 0;
  const vY = visualOffset?.offsetY ?? 0;

  const screenW = config.WIDTH;
  const screenH = config.HEIGHT;
  const speedRatio = state.speed / config.maxSpeed;
  const carScale = 1.0 + speedRatio * 0.08;

  const isOffroad = Math.abs(state.playerX) > 1.0;
  const bounceY = isOffroad
    ? Math.sin(state.playerZ * 0.2) * 3
    : Math.sin(state.playerZ * 0.05) * 1.2 * speedRatio;

  const tiltAngle = state.playerX * 0.08 * speedRatio;

  const baseY = screenH - 80 + bounceY + vY;
  const baseX = screenW / 2 + state.playerX * 40 + vX;

  return { baseX, baseY, carScale, tiltAngle, isOffroad, speedRatio };
}

/**
 * Pure curvature-driven background parallax offset (T3.3).
 *
 * Computes accumulated horizon parallax shift driven by track curvature up to `playerZ`.
 */
export function computeCurvatureParallaxOffset(
  segments: readonly { length: number; curve: number }[],
  playerZ: number,
  trackLength: number,
  layerFactor = 0.05
): number {
  const n = segments.length;
  if (n === 0 || trackLength <= 0 || layerFactor === 0) return 0;

  let z = playerZ % trackLength;
  if (z < 0) z += trackLength;

  let accumZ = 0;
  let accumCurve = 0;

  for (let i = 0; i < n; i++) {
    const segLen = segments[i].length;
    const curve = segments[i].curve;

    if (accumZ + segLen >= z) {
      const frac = segLen > 0 ? (z - accumZ) / segLen : 0;
      accumCurve += curve * frac;
      break;
    }

    accumCurve += curve;
    accumZ += segLen;
  }

  const offset = accumCurve * layerFactor;
  return offset === 0 ? 0 : offset;
}

export interface CloudParam {
  cloudX: number;
  cloudY: number;
  cloudW: number;
  cloudH: number;
}

export function computeCloudParams(
  screenW: number,
  screenH: number,
  playerZ: number,
  playerX: number,
  cloudCount = 8,
  curveParallax = 0
): CloudParam[] {
  const clouds: CloudParam[] = [];
  for (let c = 0; c < cloudCount; c++) {
    const h1 = scenarioHash("cloud_x", c);
    const h2 = scenarioHash("cloud_y", c);
    const h3 = scenarioHash("cloud_w", c);
    const baseCloudX = h1 * screenW;
    const cloudY = screenH * 0.08 + h2 * (screenH * 0.2);
    const cloudW = 50 + h3 * 60;
    const cloudH = cloudW * 0.35;
    const cloudX = ((baseCloudX + playerZ * 0.00005 * (c + 1) + playerX * 15 + curveParallax) % screenW + screenW) % screenW;
    clouds.push({ cloudX, cloudY, cloudW, cloudH });
  }
  return clouds;
}

export interface HeatHazeLine {
  x: number;
  waveOffset: number;
  hazeY: number;
}

export function computeHeatHazeLines(screenW: number, screenH: number, playerZ: number, playerX: number, numLines = 18): HeatHazeLine[] {
  const hazeY = screenH * 0.45;
  const lines: HeatHazeLine[] = [];
  for (let h = 0; h < numLines; h++) {
    const hRatio = h / numLines;
    const baseX = hRatio * screenW + playerX * 12;
    const waveOffset = Math.sin(playerZ * 0.02 + h * 0.8) * 4;
    const x = ((baseX + waveOffset) % screenW + screenW) % screenW;
    lines.push({ x, waveOffset, hazeY });
  }
  return lines;
}

export interface SpeedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

export function computeSpeedLines(screenW: number, screenH: number, horizonY: number, playerZ: number, speedRatio: number, lineCount = 12): SpeedLine[] | null {
  if (speedRatio <= 0.7) return null;
  const alpha = Math.min(0.6, (speedRatio - 0.7) * 2.5);
  const t = playerZ * 0.05;
  const lines: SpeedLine[] = [];

  for (let sl = 0; sl < lineCount; sl++) {
    const angle = (sl / lineCount) * Math.PI * 2 + (sl % 2 === 0 ? t : -t) * 0.1;
    const x1 = screenW / 2 + Math.cos(angle) * (screenW * 0.2);
    const y1 = horizonY + Math.sin(angle) * (screenH * 0.15);
    const x2 = screenW / 2 + Math.cos(angle) * (screenW * 0.55);
    const y2 = horizonY + Math.sin(angle) * (screenH * 0.45);
    lines.push({ x1, y1, x2, y2, alpha });
  }
  return lines;
}
