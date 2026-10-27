import type { AnimationDefinition } from "@tiny-aster/core";

/** Shared 8x5 character atlas contract used by the bundled samurai and Sumi-e player. */
export const HIT_RUN_CHARACTER_CELL_SIZE = 64;
export const HIT_RUN_CHARACTER_ATLAS_COLUMNS = 8;
export const HIT_RUN_CHARACTER_ATLAS_ROWS = 5;
export const HIT_RUN_CHARACTER_ANCHOR = { x: 0.5, y: 0.94 } as const;

const frameRange = (start: number, count: number): number[] =>
  Array.from({ length: count }, (_entry, index) => start + index);

export const HIT_RUN_CHARACTER_ANIMATIONS: Record<string, AnimationDefinition> = {
  idle: { frames: frameRange(0, 8), frameRate: 8, loop: true },
  walk: { frames: frameRange(8, 8), frameRate: 10, loop: true },
  attack: { frames: frameRange(16, 8), frameRate: 14, loop: false },
  hurt: { frames: frameRange(24, 6), frameRate: 16, loop: false },
  death: { frames: frameRange(32, 8), frameRate: 10, loop: false }
};

export interface HitRunFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
