import type { World, CoreComponentRegistry } from "@tiny-aster/core";
import type { OutrunComponentRegistry, RoadData, ProjectedSegment, RaceStateComponent, RacerComponent } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import { createProjectionBuffer, projectRoad } from "./RoadProjection";
import { getScenarioPaletteAtZ, applyDayPhase, scenarioHash, type ScenarioPalette, type ModulatedPalette } from "./OutrunPalettes";

/** Standard racer vehicle body color options. */
export const RACER_COLORS = ["#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"] as const;

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
  paletteId: string
): FacetedPeak[] {
  const numPeaks = 12;
  const peakSpacing = screenW / 4;
  const mountainOffsetX = ((playerZ * 0.00015) % peakSpacing) + playerX * 25;
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

/** Resolved Outrun road render context payload. */
export interface OutrunRoadRenderContext {
  state: RaceStateComponent;
  roadData: RoadData;
  config: OutrunConfig;
  screenW: number;
  screenH: number;
  rumbleLength: number;
  palette: ModulatedPalette;
}

/** Resolves race state, road data, and scenario palette context for road drawers. */
export function resolveOutrunRoadContext(
  world: World<OutrunComponentRegistry>
): OutrunRoadRenderContext | null {
  const state = world.getSingleton("RaceState");
  const roadData = world.getResource<RoadData>("RoadData");
  const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

  if (!state || !roadData || roadData.segments.length === 0) return null;

  const basePalette = getScenarioPaletteAtZ(state.playerZ, roadData);
  const progress = state.playerZ / roadData.trackLength;
  const palette = applyDayPhase(basePalette, progress);

  return {
    state,
    roadData,
    config,
    screenW: config.WIDTH,
    screenH: config.HEIGHT,
    rumbleLength: config.rumbleLength,
    palette
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
    clipY: number
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
      let sx = p.x1;
      if (sp.kind !== "arch" && sp.kind !== "banner") {
        sx = p.x1 + sp.side * (p.w1 * sp.offset);
      }
      const sy = p.y1;
      const sw = p.w1;

      if (sy >= p.clip || sw < 2) continue;

      visitor(ctx, sp, sx, sy, sw, config.roadWidth, lightsOn, p.clip);
    }
  }
}
