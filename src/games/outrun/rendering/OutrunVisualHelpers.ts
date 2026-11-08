import type { RaceStateComponent, RacerComponent, RoadData, ProjectedSegment } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { projectRoad } from "./RoadProjection";
import { scenarioHash } from "./OutrunPalettes";
import { OUTRUN_PLAYER_PIXEL_SPRITE } from "./OutrunPixelSprites";

/** Vehicle width as a fraction of the projected full road width. */
export const OUTRUN_CAR_ROAD_WIDTH_RATIO = 0.28;

/**
 * Resolve the player's sprite pixel size from the projected road width at the
 * player's baseline. This keeps the player and traffic sizing on one road-relative
 * scale instead of using a viewport-independent hard-coded pixel size.
 */
export function computeOutrunPlayerPixelSize(config: OutrunConfig): number {
  const halfScreenHeight = config.HEIGHT / 2;
  const baselineY = config.HEIGHT - 80;
  if (config.cameraHeight <= 0 || halfScreenHeight <= 0 || config.roadWidth <= 0) return 1;

  const perspectiveScale = Math.max(0, baselineY - halfScreenHeight) /
    (config.cameraHeight * halfScreenHeight);
  const projectedRoadWidth = perspectiveScale * config.roadWidth * config.WIDTH;
  const targetCarWidth = projectedRoadWidth * OUTRUN_CAR_ROAD_WIDTH_RATIO;
  return Math.max(1, targetCarWidth / OUTRUN_PLAYER_PIXEL_SPRITE.width);
}

/** Scale in reference-vehicle units so the procedural body matches road perspective. */
export function computeOutrunPlayerArtworkScale(config: OutrunConfig): number {
  const halfScreenHeight = config.HEIGHT / 2;
  const baselineY = config.HEIGHT - 80;
  const tuning = config.visual.tuning.playerCar;
  if (config.cameraHeight <= 0 || halfScreenHeight <= 0 || config.roadWidth <= 0) {
    return 1 / tuning.referenceWidthPx;
  }

  const perspectiveScale = Math.max(0, baselineY - halfScreenHeight) /
    (config.cameraHeight * halfScreenHeight);
  const projectedHalfRoadWidth = perspectiveScale * config.roadWidth * config.WIDTH * 0.5;
  const targetCarWidth = projectedHalfRoadWidth * tuning.widthToRoadHalfWidth;
  return Math.max(1 / tuning.referenceWidthPx, targetCarWidth / tuning.referenceWidthPx);
}

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
  const carW = sw * config.visual.tuning.traffic.widthToRoadHalfWidth;
  const carH = carW * config.visual.tuning.traffic.bodyHeightToWidth;

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

export type Point2D = { x: number; y: number };

export interface OutrunBitmapSpriteBounds {
  w: number;
  h: number;
  dx: number;
  dy: number;
}

/**
 * Computes destination rectangle bounds for custom bitmap sprites.
 */
export function resolveOutrunBitmapSpriteBounds(
  spec: import("../mods/types").OutrunBitmapSpriteSpec,
  sx: number,
  sy: number,
  sw: number,
  clipY: number
): OutrunBitmapSpriteBounds | null {
  const aspect = spec.aspectRatio ?? 1.0;
  const size = sw * 0.8;
  const w = size;
  const h = size * aspect;
  if (sy > clipY || w < 2) return null;

  const anchorX = spec.anchor?.x ?? 0.5;
  const anchorY = spec.anchor?.y ?? 1.0;

  const dx = sx - w * anchorX;
  const dy = sy - h * anchorY;

  return { w, h, dx, dy };
}

export interface PineTierGeometry {
  lightPolygon: [Point2D, Point2D, Point2D];
  darkPolygon: [Point2D, Point2D, Point2D];
}

/**
 * Computes polygon points for the 3 pine tiers (light and dark halves).
 */
export function resolvePineTierGeometry(sx: number, sy: number, h: number): PineTierGeometry[] {
  const tiers = [
    { top: h * 0.48, bottom: h * 0.16, halfWidth: h * 0.34 },
    { top: h * 0.73, bottom: h * 0.39, halfWidth: h * 0.26 },
    { top: h * 0.98, bottom: h * 0.65, halfWidth: h * 0.18 }
  ];
  return tiers.map((tier) => {
    const topY = sy - tier.top;
    const bottomY = sy - tier.bottom;
    return {
      lightPolygon: [
        { x: sx, y: topY },
        { x: sx, y: bottomY },
        { x: sx - tier.halfWidth, y: bottomY }
      ],
      darkPolygon: [
        { x: sx, y: topY },
        { x: sx + tier.halfWidth, y: bottomY },
        { x: sx, y: bottomY }
      ]
    };
  });
}

export interface RockGeometry {
  basePolygon: Point2D[];
  shadePolygon: Point2D[];
}

/**
 * Computes polygon points for roadside rocks (base rock and shade facet).
 */
export function resolveRockGeometry(sx: number, sy: number, w: number, h: number): RockGeometry {
  return {
    basePolygon: [
      { x: sx - w * 0.5, y: sy },
      { x: sx - w * 0.43, y: sy - h * 0.18 },
      { x: sx - w * 0.12, y: sy - h * 0.34 },
      { x: sx + w * 0.2, y: sy - h * 0.29 },
      { x: sx + w * 0.48, y: sy - h * 0.08 },
      { x: sx + w * 0.45, y: sy }
    ],
    shadePolygon: [
      { x: sx - w * 0.43, y: sy - h * 0.18 },
      { x: sx - w * 0.12, y: sy - h * 0.34 },
      { x: sx + w * 0.2, y: sy - h * 0.29 },
      { x: sx + w * 0.02, y: sy - h * 0.12 },
      { x: sx - w * 0.27, y: sy - h * 0.1 }
    ]
  };
}

export interface PalmFrondGeometry {
  crownTopX: number;
  crownTopY: number;
  trunkCtrlX: number;
  trunkCtrlY: number;
  fronds: Array<{
    polygon: [Point2D, Point2D, Point2D];
    isLight: boolean;
  }>;
}

/**
 * Computes trunk bezier and frond leaf polygons for palm roadside artwork.
 */
export function resolvePalmFrondGeometry(sx: number, sy: number, h: number): PalmFrondGeometry {
  const crownTopY = sy - h * 0.86;
  const crownTopX = sx + h * 0.06;
  const trunkCtrlX = sx - h * 0.04;
  const trunkCtrlY = sy - h * 0.45;

  const leafAngles = [-2.85, -2.35, -1.8, -1.25, -0.65];
  const fronds = leafAngles.map((angle, index) => {
    const length = h * (index === 2 ? 0.42 : 0.36);
    const tip = {
      x: crownTopX + Math.cos(angle) * length,
      y: crownTopY + Math.sin(angle) * length * 0.72
    };
    const side = {
      x: crownTopX + Math.cos(angle + Math.PI / 2) * h * 0.07,
      y: crownTopY + Math.sin(angle + Math.PI / 2) * h * 0.07
    };
    return {
      polygon: [{ x: crownTopX, y: crownTopY }, tip, side] as [Point2D, Point2D, Point2D],
      isLight: index % 2 === 0
    };
  });

  return { crownTopX, crownTopY, trunkCtrlX, trunkCtrlY, fronds };
}

export interface LighthouseGeometry {
  towerPolygon: Point2D[];
  bands: Point2D[][];
  topY: number;
  topW: number;
  bottomW: number;
}

/**
 * Computes polygon coordinates for lighthouse tower and dark accent bands.
 */
export function resolveLighthouseGeometry(sx: number, sy: number, w: number, h: number): LighthouseGeometry {
  const topY = sy - h * 0.84;
  const topW = w * 0.34;
  const bottomW = w * 0.7;

  const towerPolygon: Point2D[] = [
    { x: sx - topW / 2, y: topY },
    { x: sx + topW / 2, y: topY },
    { x: sx + bottomW / 2, y: sy },
    { x: sx - bottomW / 2, y: sy }
  ];

  const bands: Point2D[][] = [0.28, 0.55, 0.79].map((band) => {
    const bandY = sy - h * band;
    const t = (sy - bandY) / Math.max(1, sy - topY);
    const bandW = topW + (bottomW - topW) * t;
    return [
      { x: sx - bandW / 2, y: bandY - h * 0.055 },
      { x: sx + bandW / 2, y: bandY - h * 0.055 },
      { x: sx + bandW / 2, y: bandY + h * 0.015 },
      { x: sx - bandW / 2, y: bandY + h * 0.015 }
    ];
  });

  return { towerPolygon, bands, topY, topW, bottomW };
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CactusGeometry {
  trunkSegments: LineSegment[];
  stripeSegment: LineSegment;
}

/**
 * Computes line segments for cactus main trunk, branches, and highlight stripe.
 */
export function resolveCactusLineSegments(sx: number, sy: number, h: number): CactusGeometry {
  return {
    trunkSegments: [
      { x1: sx, y1: sy, x2: sx, y2: sy - h * 0.82 },
      { x1: sx, y1: sy - h * 0.4, x2: sx - h * 0.21, y2: sy - h * 0.4 },
      { x1: sx - h * 0.21, y1: sy - h * 0.4, x2: sx - h * 0.21, y2: sy - h * 0.59 },
      { x1: sx, y1: sy - h * 0.58, x2: sx + h * 0.2, y2: sy - h * 0.58 },
      { x1: sx + h * 0.2, y1: sy - h * 0.58, x2: sx + h * 0.2, y2: sy - h * 0.74 }
    ],
    stripeSegment: {
      x1: sx + h * 0.04,
      y1: sy - h * 0.08,
      x2: sx + h * 0.04,
      y2: sy - h * 0.72
    }
  };
}

export interface DryShrubGeometry {
  mainBranches: Point2D[][];
  highlightBranches: Point2D[][];
}

/**
 * Computes branch polylines for dry shrub artwork.
 */
export function resolveDryShrubLineSegments(sx: number, sy: number, h: number): DryShrubGeometry {
  return {
    mainBranches: [
      [
        { x: sx, y: sy },
        { x: sx - h * 0.24, y: sy - h * 0.35 },
        { x: sx - h * 0.32, y: sy - h * 0.55 }
      ],
      [
        { x: sx - h * 0.15, y: sy - h * 0.22 },
        { x: sx + h * 0.07, y: sy - h * 0.42 },
        { x: sx + h * 0.2, y: sy - h * 0.52 }
      ],
      [
        { x: sx + h * 0.01, y: sy - h * 0.18 },
        { x: sx + h * 0.26, y: sy - h * 0.32 }
      ]
    ],
    highlightBranches: [
      [
        { x: sx - h * 0.2, y: sy - h * 0.31 },
        { x: sx - h * 0.3, y: sy - h * 0.46 }
      ],
      [
        { x: sx + h * 0.1, y: sy - h * 0.32 },
        { x: sx + h * 0.22, y: sy - h * 0.42 }
      ]
    ]
  };
}

export interface WindTowerGeometry {
  topY: number;
  rotorY: number;
  towerLines: Point2D[][];
  bladeAngles: [number, number, number];
  bladeRadius: number;
  hubRadius: number;
}

/**
 * Computes mast polylines, rotor hub center, and blade geometry for wind tower artwork.
 */
export function resolveWindTowerGeometry(sx: number, sy: number, h: number): WindTowerGeometry {
  const topY = sy - h * 0.82;
  const rotorY = topY - h * 0.13;
  return {
    topY,
    rotorY,
    towerLines: [
      [
        { x: sx - h * 0.15, y: sy },
        { x: sx, y: topY },
        { x: sx + h * 0.15, y: sy }
      ],
      [
        { x: sx, y: topY },
        { x: sx, y: rotorY }
      ]
    ],
    bladeAngles: [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3],
    bladeRadius: h * 0.2,
    hubRadius: Math.max(1, h * 0.045)
  };
}

/**
 * Computes triangle vertices for chevron warning road sign.
 */
export function resolveChevronGeometry(sx: number, sy: number, size: number): Point2D[] {
  const cw = size * 0.6;
  const ch = size * 0.8;
  return [
    { x: sx - cw / 2, y: sy },
    { x: sx + cw / 2, y: sy - ch / 2 },
    { x: sx - cw / 2, y: sy - ch }
  ];
}
