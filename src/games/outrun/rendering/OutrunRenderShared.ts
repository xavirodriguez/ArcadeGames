import type { World, CoreComponentRegistry } from "@tiny-aster/core";
import type { OutrunComponentRegistry, RoadData, ProjectedSegment, RaceStateComponent, RacerComponent } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import { createProjectionBuffer } from "./RoadProjection";
import { getScenarioPaletteAtZ, applyDayPhase, type ScenarioPalette, type ModulatedPalette } from "./OutrunPalettes";

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
