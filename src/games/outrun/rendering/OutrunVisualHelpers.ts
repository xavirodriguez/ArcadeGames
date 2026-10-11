import type { World, Entity } from "@tiny-aster/core";
import type { RaceStateComponent, RacerComponent, RoadData, ProjectedSegment, RoadSegmentSprite, OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import { projectRoad, createProjectionBuffer } from "./RoadProjection";
import { ScenarioPalette, ModulatedPalette, getScenarioPaletteAtZ, applyDayPhase, scenarioHash } from "./OutrunPalettes";

export const PROJECTION_CAPACITY = 400;
export const projectionBuffer: ProjectedSegment[] = createProjectionBuffer(PROJECTION_CAPACITY);

export function rumbleColor(index: number, rumbleLength: number, dark: string, light: string): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? dark : light;
}

export function roadColor(index: number, rumbleLength: number, palette: ScenarioPalette): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? palette.roadDark : palette.roadLight;
}

export interface OutrunFrameData {
  state: RaceStateComponent;
  roadData: RoadData;
  config: OutrunConfig;
  screenW: number;
  screenH: number;
  rumbleLength: number;
  palette: ModulatedPalette;
}

export function resolveOutrunFrame(world: World<OutrunComponentRegistry>): OutrunFrameData | null {
  const state = world.getSingleton("RaceState");
  const roadData = world.getResource<RoadData>("RoadData");
  const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

  if (!state || !roadData || roadData.segments.length === 0) return null;

  const screenW = config.WIDTH;
  const screenH = config.HEIGHT;
  const rumbleLength = config.rumbleLength;

  const basePalette = getScenarioPaletteAtZ(state.playerZ, roadData);
  const progress = state.playerZ / roadData.trackLength;
  const palette = applyDayPhase(basePalette, progress);

  return { state, roadData, config, screenW, screenH, rumbleLength, palette };
}

export interface CloudGeometry {
  cloudX: number;
  cloudY: number;
  cloudW: number;
  cloudH: number;
}

export function computeOutrunCloudGeometry(
  c: number,
  screenW: number,
  screenH: number,
  playerZ: number,
  playerX: number
): CloudGeometry {
  const h1 = scenarioHash("cloud_x", c);
  const h2 = scenarioHash("cloud_y", c);
  const h3 = scenarioHash("cloud_w", c);
  const baseCloudX = h1 * screenW;
  const cloudY = screenH * 0.08 + h2 * (screenH * 0.2);
  const cloudW = 50 + h3 * 60;
  const cloudH = cloudW * 0.35;
  const cloudX = ((baseCloudX + playerZ * 0.00005 * (c + 1) + playerX * 15) % screenW + screenW) % screenW;
  return { cloudX, cloudY, cloudW, cloudH };
}

export interface HeatHazeLineGeometry {
  x: number;
  waveOffset: number;
}

export function computeOutrunHeatHazeGeometry(
  h: number,
  numLines: number,
  screenW: number,
  playerX: number,
  playerZ: number
): HeatHazeLineGeometry {
  const hRatio = h / numLines;
  const baseX = hRatio * screenW + playerX * 12;
  const waveOffset = Math.sin(playerZ * 0.02 + h * 0.8) * 4;
  const x = ((baseX + waveOffset) % screenW + screenW) % screenW;
  return { x, waveOffset };
}

export interface FacetedPeakGeometry {
  px: number;
  peakY: number;
  h2: number;
}

export function computeOutrunFacetedPeakGeometry(
  m: number,
  peakSpacing: number,
  mountainOffsetX: number,
  horizonY: number,
  scenarioId: string
): FacetedPeakGeometry {
  const h1 = scenarioHash(scenarioId, m);
  const h2 = scenarioHash(scenarioId, m + 100);
  const px = m * peakSpacing - mountainOffsetX;
  const peakY = horizonY - 40 - h1 * 60;
  return { px, peakY, h2 };
}

export interface CoastBuildingGeometry {
  bx: number;
  bw: number;
  bh: number;
}

export function computeOutrunCoastBuildingGeometry(
  b: number,
  spacing: number,
  horizonOffset: number
): CoastBuildingGeometry {
  const bx = b * spacing - horizonOffset;
  const bw = 18 + scenarioHash("coast_b", b) * 20;
  const bh = 15 + scenarioHash("coast_bh", b) * 35;
  return { bx, bw, bh };
}

export interface DesertHillGeometry {
  hx: number;
  hHeight: number;
}

export function computeOutrunDesertHillGeometry(
  h: number,
  hillSpacing: number,
  hillOffset: number
): DesertHillGeometry {
  const hx = h * hillSpacing - hillOffset;
  const hHeight = 30 + scenarioHash("desert_h", h) * 45;
  return { hx, hHeight };
}

export interface MountainCliffGeometry {
  mx: number;
  mh: number;
  mw: number;
}

export function computeOutrunMountainCliffGeometry(
  m: number,
  spacing: number,
  offset: number
): MountainCliffGeometry {
  const mx = m * spacing - offset;
  const mh = 35 + scenarioHash("mtn_h", m) * 55;
  const mw = 30 + scenarioHash("mtn_w", m) * 25;
  return { mx, mh, mw };
}

export interface PalmFrondGeometry {
  angle: number;
  fx: number;
  fy: number;
}

export function computeOutrunPalmFrondGeometry(
  f: number,
  totalFronds: number,
  topX: number,
  topY: number
): PalmFrondGeometry {
  const angle = (f / totalFronds) * Math.PI * 2;
  const fx = topX + Math.cos(angle) * 35;
  const fy = topY + Math.sin(angle) * 20;
  return { angle, fx, fy };
}

export interface SegmentBandsScratch {
  grassColor: string;
  rumbleW1: number;
  rumbleW2: number;
  rumbleColorVal: string;
  roadColorVal: string;
  reflW1: number;
  reflW2: number;
  reflColorVal: string;
  hasReflection: boolean;
  innerDarkAlpha: number;
  innerSide: number;
  hasInnerDarkening: boolean;
  hasLaneMarking: boolean;
  laneW1: number;
  laneW2: number;
  fogAlpha: number;
  hasFog: boolean;
  y2Clipped: number;
}

export const segmentBandsScratch: SegmentBandsScratch = {
  grassColor: "",
  rumbleW1: 0,
  rumbleW2: 0,
  rumbleColorVal: "",
  roadColorVal: "",
  reflW1: 0,
  reflW2: 0,
  reflColorVal: "",
  hasReflection: false,
  innerDarkAlpha: 0,
  innerSide: 1,
  hasInnerDarkening: false,
  hasLaneMarking: false,
  laneW1: 0,
  laneW2: 0,
  fogAlpha: 0,
  hasFog: false,
  y2Clipped: 0
};

export function computeSegmentBands(
  p: ProjectedSegment,
  palette: ModulatedPalette,
  rumbleLength: number,
  maxy: number,
  out: SegmentBandsScratch = segmentBandsScratch
): SegmentBandsScratch {
  out.y2Clipped = Math.min(p.y2, maxy);
  out.grassColor = rumbleColor(p.index, rumbleLength, palette.groundDark, palette.groundLight);

  out.rumbleW1 = p.w1 * 1.15;
  out.rumbleW2 = p.w2 * 1.15;
  out.rumbleColorVal = rumbleColor(p.index, rumbleLength, palette.rumbleDark, palette.rumbleLight);

  out.roadColorVal = roadColor(p.index, rumbleLength, palette);

  if (palette.reflectionAlpha > 0) {
    out.hasReflection = true;
    out.reflW1 = p.w1 * 0.35;
    out.reflW2 = p.w2 * 0.35;
    out.reflColorVal = `rgba(255, 255, 255, ${palette.reflectionAlpha.toFixed(3)})`;
  } else {
    out.hasReflection = false;
  }

  if (Math.abs(p.curve) > 1.5) {
    out.hasInnerDarkening = true;
    out.innerSide = p.curve > 0 ? 1 : -1;
    out.innerDarkAlpha = Math.min(0.25, (Math.abs(p.curve) - 1.5) * 0.08);
  } else {
    out.hasInnerDarkening = false;
  }

  if (Math.floor(p.index / rumbleLength) % 2 === 0) {
    out.hasLaneMarking = true;
    out.laneW1 = p.w1 * 0.04;
    out.laneW2 = p.w2 * 0.04;
  } else {
    out.hasLaneMarking = false;
  }

  if (p.fog > 0.4) {
    out.hasFog = true;
    out.fogAlpha = Math.min(0.8, (p.fog - 0.4) * 1.33);
  } else {
    out.hasFog = false;
  }

  return out;
}

export interface SpriteDrawPosition {
  sx: number;
  sy: number;
  sw: number;
  visible: boolean;
}

export function computeSpriteDrawPosition(
  sp: RoadSegmentSprite,
  p: ProjectedSegment
): SpriteDrawPosition {
  let sx = p.x1;
  if (sp.kind !== "arch" && sp.kind !== "banner") {
    sx = p.x1 + sp.side * (p.w1 * sp.offset);
  }
  const sy = p.y1;
  const sw = p.w1;

  const visible = sy < p.clip && sw >= 2;
  return { sx, sy, sw, visible };
}

export interface OffroadDustParticle {
  dx: number;
  dy: number;
  alpha: number;
  radius: number;
}

export function computeOffroadDustParticle(
  d: number,
  playerZ: number,
  speedRatio: number
): OffroadDustParticle {
  const h1 = scenarioHash("dust_x", d + Math.floor(playerZ * 0.1));
  const h2 = scenarioHash("dust_y", d + Math.floor(playerZ * 0.1));
  const dx = (h1 - 0.5) * 45;
  const dy = h2 * 25 + 5;
  const alpha = (1 - h2) * 0.6 * Math.min(1, speedRatio * 1.5);
  const radius = 2 + h1 * 2;
  return { dx, dy, alpha, radius };
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
  projBuffer: ProjectedSegment[],
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
    projBuffer
  );

  const trackLength = roadData.trackLength;
  let relZ = racer.z - state.playerZ;
  if (relZ > trackLength / 2) relZ -= trackLength;
  if (relZ < -trackLength / 2) relZ += trackLength;
  if (relZ <= 0 || relZ > config.drawDistance * config.segmentLength) return null;

  let best: ProjectedSegment | null = null;
  for (let i = 0; i < count; i++) {
    const p = projBuffer[i];
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

export interface OutrunCarFrameData {
  state: RaceStateComponent;
  config: OutrunConfig;
  geom: PlayerCarGeometry;
}

export function resolveOutrunCarFrame(world: World<OutrunComponentRegistry>, entity: Entity): OutrunCarFrameData | null {
  const render = world.getComponent(entity, "Render");
  if (!render || !render.visible) return null;

  const state = world.getSingleton("RaceState");
  if (!state) return null;

  const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
  const visualOffset = world.getComponent(entity, "VisualOffset");
  const geom = computePlayerCarGeometry(state, config, visualOffset);

  return { state, config, geom };
}

export interface OutrunRacerFrameData {
  proj: RacerProjectionResult;
  racer: RacerComponent;
}

export function resolveOutrunRacerFrame(world: World<OutrunComponentRegistry>, entity: Entity): OutrunRacerFrameData | null {
  const racer = world.getComponent(entity, "Racer");
  const render = world.getComponent(entity, "Render");
  if (!racer || !racer.active || !render || !render.visible) return null;

  const state = world.getSingleton("RaceState");
  const roadData = world.getResource<RoadData>("RoadData");
  const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
  if (!state || !roadData) return null;

  const proj = computeRacerProjection(
    racer,
    state,
    roadData,
    config,
    projectionBuffer,
    PROJECTION_CAPACITY
  );
  if (!proj) return null;

  return { proj, racer };
}

export interface OutrunHudFrameData {
  state: RaceStateComponent;
  config: OutrunConfig;
  speedKmh: number;
  timeStr: string;
  phase: string;
}

export function resolveOutrunHudFrame(world: World<OutrunComponentRegistry>): OutrunHudFrameData | null {
  const state = world.getSingleton("RaceState");
  if (!state) return null;

  const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
  const speedKmh = Math.round((state.speed / config.maxSpeed) * 280);
  const timeStr = state.lapTime.toFixed(1);
  const phase = state.racePhase ?? "racing";

  return { state, config, speedKmh, timeStr, phase };
}
