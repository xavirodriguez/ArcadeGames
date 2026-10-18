import type { World } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { getRacingSkin, type RacingSkin } from "./RacingSkin";
import type { RacingPalette } from "./RacingPalette";
import { buildTrackRibbon } from "./TrackRibbonGeometry";
import type { RacingParticlePool } from "../systems/RacingParticleSystem";

export interface TrackRibbonContext {
  skin: RacingSkin;
  palette: RacingPalette;
  trackSpec: TrackSpec;
  left: { x: number; y: number }[];
  right: { x: number; y: number }[];
}

export function resolveTrackRibbonContext(
  world: World<RacingComponentRegistry, any>
): TrackRibbonContext | null {
  const skin = getRacingSkin(world);
  const palette = skin.palette;
  const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
  if (!trackSpec || trackSpec.waypoints.length < 3) return null;

  const { left, right } = buildTrackRibbon(trackSpec.waypoints);
  if (left.length === 0 || right.length === 0) return null;

  return { skin, palette, trackSpec, left, right };
}

export interface RacingParticlePoolContext {
  skin: RacingSkin;
  palette: RacingPalette;
  pool: RacingParticlePool;
}

export function resolveRacingParticlePoolContext(
  world: World<RacingComponentRegistry, any>
): RacingParticlePoolContext | null {
  const skin = getRacingSkin(world);
  const palette = skin.palette;
  const pool = world.getResource<RacingParticlePool>("RacingParticles");
  if (!pool) return null;
  return { skin, palette, pool };
}

export interface TrackVisualDimensions {
  width: number;
  height: number;
  halfW: number;
  halfH: number;
  skin: RacingSkin;
  palette: RacingPalette;
  trackSpec: TrackSpec | undefined;
}

export function extractTrackDimensions(world: World<RacingComponentRegistry, any>): TrackVisualDimensions {
  const skin = getRacingSkin(world);
  const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
  const width = trackSpec?.width ?? 1600;
  const height = trackSpec?.height ?? 1000;
  return {
    width,
    height,
    halfW: width / 2,
    halfH: height / 2,
    skin,
    palette: skin.palette,
    trackSpec
  };
}

export interface CheckpointGridCell {
  x: number;
  y: number;
  w: number;
  h: number;
  colorIndex: number;
}

export function computeCheckpointGrid(
  width: number,
  height: number,
  cols: number = 8,
  rows: number = 2
): { cells: CheckpointGridCell[]; halfW: number; halfH: number } {
  const halfW = width / 2;
  const halfH = height / 2;
  const colW = width / cols;
  const rowH = height / rows;
  const cells: CheckpointGridCell[] = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        x: -halfW + c * colW,
        y: -halfH + r * rowH,
        w: colW,
        h: rowH,
        colorIndex: (r + c) % 2
      });
    }
  }

  return { cells, halfW, halfH };
}

export const DEFAULT_FINISH_CHECKERS: readonly [string, string] = ["#FFFFFF", "#5D4037"] as const;

export function resolveFinishCheckers(skin?: { finishCheckers?: string[] }): [string, string] {
  const checkers = skin?.finishCheckers;
  if (Array.isArray(checkers) && checkers.length >= 2) {
    return [checkers[0], checkers[1]];
  }
  return [DEFAULT_FINISH_CHECKERS[0], DEFAULT_FINISH_CHECKERS[1]];
}
