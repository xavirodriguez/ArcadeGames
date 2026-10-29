import type {
  SpriteFrameRect
} from "@tiny-aster/core";

/** Shared 8x5 character atlas contract used by samurai and Sumi-e player. Presentation-neutral. */
export const HIT_RUN_CHARACTER_CELL_SIZE = 64;
export const HIT_RUN_CHARACTER_ATLAS_COLUMNS = 8;
export const HIT_RUN_CHARACTER_ATLAS_ROWS = 5;
export const HIT_RUN_SUMI_E_SAMURAI_SHEET_ID = "hitrun_sumi_e_samurai";
export const HIT_RUN_CHARACTER_ANCHOR = { x: 0.5, y: 0.94 } as const;

export type HitRunFrameRect = SpriteFrameRect;

export function getHitRunFrameRect(atlasFrameIndex: number): HitRunFrameRect {
  const safeIndex = Math.max(
    0,
    Math.min(
      HIT_RUN_CHARACTER_ATLAS_COLUMNS * HIT_RUN_CHARACTER_ATLAS_ROWS - 1,
      Math.floor(atlasFrameIndex)
    )
  );
  return {
    x: (safeIndex % HIT_RUN_CHARACTER_ATLAS_COLUMNS) * HIT_RUN_CHARACTER_CELL_SIZE,
    y: Math.floor(safeIndex / HIT_RUN_CHARACTER_ATLAS_COLUMNS) * HIT_RUN_CHARACTER_CELL_SIZE,
    w: HIT_RUN_CHARACTER_CELL_SIZE,
    h: HIT_RUN_CHARACTER_CELL_SIZE
  };
}
