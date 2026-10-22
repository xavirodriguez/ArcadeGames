import type { World, RenderComponent } from "@tiny-aster/core";
import { resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { OutrunComponentRegistry, RoadData, ProjectedSegment, RaceStateComponent, RacerComponent } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import { createProjectionBuffer, projectRoad } from "./RoadProjection";
import { COAST_PALETTE, getScenarioPaletteAtZ, applyDayPhase, scenarioHash, type ScenarioPalette, type ModulatedPalette } from "./OutrunPalettes";
import {
  computePlayerCarGeometry,
  computeRacerProjection,
  computeCurvatureParallaxOffset,
  computeCloudParams,
  computeHeatHazeLines,
  type CloudParam,
  type HeatHazeLine
} from "./OutrunVisualHelpers";
import { colors } from "../../../theme/colors";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { createVisualPaletteResource } from "../utils/palette";
import { shouldDrawOutrunRoadsideSprite } from "./OutrunRoadsideArtwork";

/** Standard racer vehicle body color options. */
/** Capacity of module-level projection buffer. */
export const PROJECTION_CAPACITY = 400;

/** Module-level reusable buffer — avoids per-frame allocations. */
export const projectionBuffer: ProjectedSegment[] = createProjectionBuffer(PROJECTION_CAPACITY);

/** Calculates rumble strip color based on segment index and rumble length. */
export function rumbleColor(index: number, rumbleLength: number, dark: string, light: string): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? dark : light;
}

/** Calculates road surface color based on segment index and scenario palette. */
export function roadColor(index: number, rumbleLength: number, palette: ScenarioPalette): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? palette.roadDark : palette.roadLight;
}

/** Projects road segments into projectionBuffer using standard Outrun parameters. */
export function projectOutrunRoad(
  segments: import("../types/OutrunTypes").RoadSegment[],
  playerZ: number,
  playerX: number,
  config: OutrunConfig,
  screenW: number,
  screenH: number
): number {
  return projectRoad(
    segments,
    playerZ,
    playerX,
    config.cameraHeight,
    config.cameraDepth,
    config.roadWidth,
    Math.min(config.drawDistance, PROJECTION_CAPACITY),
    screenW,
    screenH,
    projectionBuffer
  );
}

export interface FacetedPeak {
  px: number;
  peakY: number;
  peakSpacing: number;
  horizonY: number;
  h1: number;
  h2: number;
}

/** Generates faceted peak mountain parameters for horizon pass. */
export function computeFacetedPeaks(
  screenW: number,
  horizonY: number,
  playerZ: number,
  playerX: number,
  paletteId: string,
  curveParallax = 0
): FacetedPeak[] {
  const numPeaks = 12;
  const peakSpacing = screenW / 4;
  const mountainOffsetX = ((playerZ * 0.00015) % peakSpacing) + playerX * 25 + curveParallax;
  const peaks: FacetedPeak[] = [];

  for (let m = -2; m < numPeaks + 2; m++) {
    const h1 = scenarioHash(paletteId, m);
    const h2 = scenarioHash(paletteId, m + 100);
    const px = m * peakSpacing - mountainOffsetX;
    const peakY = horizonY - 40 - h1 * 60;
    peaks.push({ px, peakY, peakSpacing, horizonY, h1, h2 });
  }
  return peaks;
}

/** Returns 2D polygon vertex coordinates for faceted peak base and facet triangles. */
export function getFacetedPeakPolygons(p: FacetedPeak): {
  base: [number, number][];
  facet: [number, number][];
} {
  return {
    base: [
      [p.px - p.peakSpacing * 0.6, p.horizonY],
      [p.px, p.peakY],
      [p.px + p.peakSpacing * 0.6, p.horizonY]
    ],
    facet: [
      [p.px, p.peakY],
      [p.px + p.peakSpacing * 0.6, p.horizonY],
      [p.px + (p.h2 - 0.5) * 20, p.horizonY]
    ]
  };
}

export interface CoastalBuilding {
  bx: number;
  bw: number;
  bh: number;
  bIndex: number;
}

/** Computes coastal building rectangle parameters along the horizon. */
export function computeCoastalBuildings(
  screenW: number,
  horizonY: number,
  playerZ: number,
  playerX: number,
  curveParallax = 0
): { spacing: number; horizonOffset: number; buildings: CoastalBuilding[] } {
  const spacing = screenW / 6;
  const horizonOffset = ((playerZ * 0.0001) % spacing) + playerX * 20 + curveParallax;
  const buildings: CoastalBuilding[] = [];

  for (let b = -2; b < 8; b++) {
    const bx = b * spacing - horizonOffset;
    const bw = 18 + scenarioHash("coast_b", b) * 20;
    const bh = 15 + scenarioHash("coast_bh", b) * 35;
    buildings.push({ bx, bw, bh, bIndex: b });
  }

  return { spacing, horizonOffset, buildings };
}

export interface MountainCliff {
  mx: number;
  mw: number;
  mh: number;
  mIndex: number;
}

/** Computes mountain cliff silhouette parameters along the horizon. */
export function computeMountainCliffs(
  screenW: number,
  horizonY: number,
  playerZ: number,
  playerX: number
): { spacing: number; offset: number; cliffs: MountainCliff[] } {
  const spacing = screenW / 5;
  const offset = ((playerZ * 0.00015) % spacing) + playerX * 25;
  const cliffs: MountainCliff[] = [];

  for (let m = -2; m < 7; m++) {
    const mx = m * spacing - offset;
    const mh = 35 + scenarioHash("mtn_h", m) * 55;
    const mw = 30 + scenarioHash("mtn_w", m) * 25;
    cliffs.push({ mx, mw, mh, mIndex: m });
  }

  return { spacing, offset, cliffs };
}

export interface OffroadDustParticle {
  dx: number;
  dy: number;
  radius: number;
  isLeft: boolean;
  alpha: number;
}

/** Calculates offroad dust particle offsets and alpha opacity for vehicle wheels. */
export function computeOffroadDust(playerZ: number, speedRatio: number = 1.0): OffroadDustParticle[] {
  const particles: OffroadDustParticle[] = [];
  const baseZ = Math.floor(playerZ * 0.1);
  for (let d = 0; d < 12; d++) {
    const h1 = scenarioHash("dust_x", d + baseZ);
    const h2 = scenarioHash("dust_y", d + baseZ);
    const dx = (h1 - 0.5) * 45;
    const dy = h2 * 25 + 5;
    const alpha = (1 - h2) * 0.6 * Math.min(1, speedRatio * 1.5);
    particles.push({
      dx,
      dy,
      radius: 2 + h1 * 2,
      isLeft: d % 2 === 0,
      alpha
    });
  }
  return particles;
}

/** Resolves dust color and offroad particle list from active World and vehicle state. */
export function resolveOffroadDustParams(
  world: World<OutrunComponentRegistry>,
  playerZ: number,
  speedRatio: number
): { dustColor: string; particles: OffroadDustParticle[] } {
  const roadData = world.getResource<RoadData>("RoadData");
  const basePal = roadData ? getScenarioPaletteAtZ(playerZ, roadData) : COAST_PALETTE;
  const dustColor = basePal.id === "coast" ? colors.amber : basePal.id === "desert" ? colors.yellow : colors.slate;
  const particles = computeOffroadDust(playerZ, speedRatio);
  return { dustColor, particles };
}

/** Resolved Outrun road render context payload. */
export interface OutrunRoadRenderContext {
  state: RaceStateComponent;
  roadData: RoadData;
  config: OutrunConfig;
  screenW: number;
  screenH: number;
  rumbleLength: number;
  palette: ModulatedPalette;
  visualPalette: OutrunVisualPaletteResource;
}

export interface OutrunHorizonContext {
  horizonY: number;
  bands: string[];
  bandHeight: number;
  curveParallax: number;
  scenarioId: string;
  clouds: CloudParam[] | null;
  peaks: FacetedPeak[] | null;
  buildings: CoastalBuilding[] | null;
  hazeLines: HeatHazeLine[] | null;
}

export function resolveOutrunHorizonContext(
  roadCtx: OutrunRoadRenderContext
): OutrunHorizonContext {
  const { state, roadData, screenW, screenH, palette } = roadCtx;
  const horizonY = screenH * 0.45;
  const bands = palette.skyBands;
  const bandHeight = horizonY / Math.max(1, bands.length);
  const curveParallax = computeCurvatureParallaxOffset(
    roadData.segments,
    state.playerZ,
    roadData.trackLength
  );

  const clouds = palette.cloudColor
    ? computeCloudParams(screenW, screenH, state.playerZ, state.playerX, 8, curveParallax * 0.4)
    : null;

  const scenarioId = roadData.segments[0]?.scenarioId ?? palette.id;
  let peaks: FacetedPeak[] | null = null;
  let buildings: CoastalBuilding[] | null = null;
  let hazeLines: HeatHazeLine[] | null = null;

  if (scenarioId.includes("mountain")) {
    peaks = computeFacetedPeaks(screenW, horizonY, state.playerZ, state.playerX, palette.id, curveParallax);
  } else if (scenarioId.includes("coast")) {
    buildings = computeCoastalBuildings(screenW, horizonY, state.playerZ, state.playerX, curveParallax).buildings;
  } else if (scenarioId.includes("desert")) {
    hazeLines = computeHeatHazeLines(screenW, screenH, state.playerZ, state.playerX);
  }

  return { horizonY, bands, bandHeight, curveParallax, scenarioId, clouds, peaks, buildings, hazeLines };
}

export interface OutrunSegmentColors {
  grassCol: string;
  rumbleCol: string;
  roadCol: string;
}

/** Computes grass, rumble strip, and road colors for a projected segment. */
export function computeRoadSegmentColors(
  pIndex: number,
  rumbleLength: number,
  palette: ScenarioPalette & { groundDark: string; groundLight: string; rumbleDark: string; rumbleLight: string }
): OutrunSegmentColors {
  return {
    grassCol: rumbleColor(pIndex, rumbleLength, palette.groundDark, palette.groundLight),
    rumbleCol: rumbleColor(pIndex, rumbleLength, palette.rumbleDark, palette.rumbleLight),
    roadCol: roadColor(pIndex, rumbleLength, palette)
  };
}

/** Resolves race state, road data, and scenario palette context for road drawers. */
export function resolveOutrunRoadContext(
  world: World<OutrunComponentRegistry>
): OutrunRoadRenderContext | null {
  const state = world.getSingleton("RaceState");
  const roadData = world.getResource<RoadData>("RoadData");
  const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

  if (!state || !roadData || !roadData.segments || roadData.segments.length === 0) {
    if (!state) console.warn("[resolveOutrunRoadContext] Missing 'RaceState' singleton.");
    if (!roadData) console.warn("[resolveOutrunRoadContext] Missing 'RoadData' resource.");
    else if (!roadData.segments || roadData.segments.length === 0) console.warn("[resolveOutrunRoadContext] 'RoadData' contains zero segments.");
    return null;
  }

  const basePalette = getScenarioPaletteAtZ(state.playerZ, roadData);
  const progress = state.playerZ / roadData.trackLength;
  const palette = applyDayPhase(basePalette, progress);
  const visualPalette = world.getResource<OutrunVisualPaletteResource>("VisualPalette") ??
    createVisualPaletteResource(state, roadData, config);

  return {
    state,
    roadData,
    config,
    screenW: config.WIDTH,
    screenH: config.HEIGHT,
    rumbleLength: config.rumbleLength,
    palette,
    visualPalette
  };
}

/** Resolved Outrun racer entity render context payload. */
export interface OutrunRacerRenderContext {
  racer: RacerComponent;
  state: RaceStateComponent;
  roadData: RoadData;
  config: OutrunConfig;
}

/** Resolves racer component, race state, and road data for racer entity drawers. */
export interface OutrunCarRenderContext {
  render: RenderComponent;
  state: RaceStateComponent;
  config: OutrunConfig;
  carColor: string;
  geom: ReturnType<typeof computePlayerCarGeometry>;
}

export function resolveOutrunCarContext(
  world: World<OutrunComponentRegistry>,
  entity: number
): OutrunCarRenderContext | null {
  const render = world.getComponent(entity, "Render");
  if (!render || !render.visible) return null;

  const state = world.getSingleton("RaceState");
  if (!state) return null;

  const config =
    world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

  const carColor = resolveThemeColorWithFallback(
    world,
    render.color || colors.red,
    "outrun_car",
    "player",
    "primary"
  );

  const visualOffset = world.getComponent(entity, "VisualOffset");
  const geom = computePlayerCarGeometry(state, config, visualOffset);

  return { render, state, config, carColor, geom };
}

export function resolveRacerRenderContext(
  world: World<OutrunComponentRegistry>,
  entity: number
): OutrunRacerRenderContext | null {
  const racer = world.getComponent(entity, "Racer");
  const render = world.getComponent(entity, "Render");
  if (!racer || !racer.active || !render || !render.visible) return null;

  const state = world.getSingleton("RaceState");
  const roadData = world.getResource<RoadData>("RoadData");
  const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
  if (!state || !roadData) return null;

  return { racer, state, roadData, config };
}

export interface OutrunHudContext {
  state: RaceStateComponent;
  config: OutrunConfig;
  speedKmh: number;
  timeStr: string;
  phase: string;
  progressFraction: number;
  visualPalette: OutrunVisualPaletteResource;
  hudBg: string;
  hudAccent: string;
}

export function resolveOutrunHudContext(
  world: World<OutrunComponentRegistry>
): OutrunHudContext | null {
  const state = world.getSingleton("RaceState");
  if (!state) return null;

  const config =
    world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
  const roadData = world.getResource<RoadData>("RoadData");
  if (!roadData || roadData.trackLength <= 0) return null;

  const visualPalette = world.getResource<OutrunVisualPaletteResource>("VisualPalette") ??
    createVisualPaletteResource(state, roadData, config);
  const progress = state.playerZ % roadData.trackLength;
  const progressFraction = ((progress < 0 ? progress + roadData.trackLength : progress) /
    roadData.trackLength);
  const speedKmh = Math.round((state.speed / config.maxSpeed) * 280);
  const timeStr = state.lapTime.toFixed(1);
  const phase = state.racePhase ?? "racing";

  return {
    state, config, speedKmh, timeStr, phase, progressFraction, visualPalette,
    hudBg: visualPalette.shared.branchPanel,
    hudAccent: visualPalette.shared.cream
  };
}

export interface OutrunRacerDrawContext {
  proj: NonNullable<ReturnType<typeof computeRacerProjection>>;
  vehicleStyleIndex: number;
}

export function resolveOutrunRacerDrawContext(
  world: World<OutrunComponentRegistry>,
  entity: number
): OutrunRacerDrawContext | null {
  const ctxPayload = resolveRacerRenderContext(world, entity);
  if (!ctxPayload) return null;

  const { racer, state, roadData, config } = ctxPayload;

  const proj = computeRacerProjection(
    racer,
    state,
    roadData,
    config,
    projectionBuffer,
    PROJECTION_CAPACITY
  );
  if (!proj) return null;

  const vehicleStyleIndex = Math.abs(Math.trunc(racer.colorIndex));

  return { proj, vehicleStyleIndex };
}

/** Visitor callback signature for back-to-front sprite passes. */
export interface SpritePassVisitor<TCtx> {
  (
    ctx: TCtx,
    sprite: import("../types/OutrunTypes").RoadSegmentSprite,
    sx: number,
    sy: number,
    sw: number,
    roadWidth: number,
    lightsOn: boolean,
    clipY: number,
    depth: number,
    segmentIndex: number
  ): void;
}

/** Iterates road segment roadside sprites back-to-front with ridge occlusion clipping. */
export function iterateOutrunSprites<TCtx>(
  ctx: TCtx,
  count: number,
  roadData: RoadData,
  config: OutrunConfig,
  lightsOn: boolean,
  visitor: SpritePassVisitor<TCtx>
): void {
  for (let i = count - 1; i >= 0; i--) {
    const p = projectionBuffer[i];
    const seg = roadData.segments[p.index];
    if (!seg || !seg.sprites || seg.sprites.length === 0) continue;

    for (const sp of seg.sprites) {
      if (!shouldDrawOutrunRoadsideSprite(sp.kind, p.index, config.visual.quality)) continue;
      let sx = p.x1;
      if (sp.kind !== "arch" && sp.kind !== "banner") {
        sx = p.x1 + sp.side * (p.w1 * sp.offset);
      }
      const sy = p.y1;
      const sw = p.w1;

      if (sy >= p.clip || sw < 2) continue;

      visitor(ctx, sp, sx, sy, sw, config.roadWidth, lightsOn, p.clip, p.fog, p.index);
    }
  }
}
