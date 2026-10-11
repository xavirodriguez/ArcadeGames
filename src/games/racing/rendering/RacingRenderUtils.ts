import { World } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { getRacingSkin, RacingSkin } from "./RacingSkin";
import { RacingPalette } from "./RacingPalette";
import type { RacingParticlePool } from "../systems/RacingParticleSystem";

export interface RacingTrackFrameData {
  skin: RacingSkin;
  palette: RacingPalette;
  trackSpec: TrackSpec | undefined;
  width: number;
  height: number;
  halfW: number;
  halfH: number;
}

export function resolveRacingTrackFrame(world: World<RacingComponentRegistry>): RacingTrackFrameData {
  const skin = getRacingSkin(world);
  const palette = skin.palette;
  const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
  const width = trackSpec?.width ?? 1600;
  const height = trackSpec?.height ?? 1000;
  const halfW = width / 2;
  const halfH = height / 2;
  return { skin, palette, trackSpec, width, height, halfW, halfH };
}

export interface RacingSkinAndParticlesData {
  skin: RacingSkin;
  palette: RacingPalette;
  pool: RacingParticlePool | undefined;
}

export function resolveRacingSkinAndParticles(world: World<RacingComponentRegistry>): RacingSkinAndParticlesData {
  const skin = getRacingSkin(world);
  const pool = world.getResource<RacingParticlePool>("RacingParticles");
  return { skin, palette: skin.palette, pool };
}

export interface CheckerCellData {
  x: number;
  y: number;
  colW: number;
  rowH: number;
  color: string;
}

export function computeCheckeredFinishGrid(
  width: number,
  height: number,
  cols: number,
  rows: number,
  color1: string,
  color2: string
): CheckerCellData[] {
  const halfW = width / 2;
  const halfH = height / 2;
  const colW = width / cols;
  const rowH = height / rows;
  const cells: CheckerCellData[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: -halfW + c * colW,
        y: -halfH + r * rowH,
        colW,
        rowH,
        color: (r + c) % 2 === 0 ? color1 : color2
      });
    }
  }

  return cells;
}
