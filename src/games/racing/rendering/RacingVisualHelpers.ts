import type { World } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { getRacingSkin, type RacingSkin } from "./RacingSkin";
import type { RacingPalette } from "./RacingPalette";

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
