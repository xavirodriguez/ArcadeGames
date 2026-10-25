import { Asset } from "expo-asset";
import type { AnimationDefinition } from "@tiny-aster/core";

/** Stable AssetLoader key shared by the pool and both renderer backends. */
export const SAMURAI_ASSET_KEY = "hitrun_samurai_enemy";
export const SAMURAI_SPRITE_READY_RESOURCE = "HitRunSamuraiSpriteReady";
export const SAMURAI_CELL_SIZE = 96;
export const SAMURAI_ATLAS_COLUMNS = 8;
export const SAMURAI_ATLAS_ROWS = 5;
export const SAMURAI_SPRITE_ANCHOR = { x: 0.5, y: 0.89 } as const;

const frameRange = (start: number, count: number): number[] =>
  Array.from({ length: count }, (_entry, index) => start + index);

/**
 * TexturePacker-compatible frame coordinates are represented in
 * src/games/hitandrun/assets/samurai-enemy.atlas.json. Animation frame values
 * here are row-major atlas indices, which AnimationSystem advances by index.
 */
export const SAMURAI_ANIMATIONS: Record<string, AnimationDefinition> = {
  idle: { frames: frameRange(0, 8), frameRate: 10, loop: true },
  walk: { frames: frameRange(8, 8), frameRate: 12, loop: true },
  attack: { frames: frameRange(16, 8), frameRate: 14, loop: false },
  hurt: { frames: frameRange(24, 6), frameRate: 16, loop: false },
  death: { frames: frameRange(32, 8), frameRate: 10, loop: false }
};

export interface SamuraiFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getSamuraiFrameRect(atlasFrameIndex: number): SamuraiFrameRect {
  const safeIndex = Math.max(0, Math.floor(atlasFrameIndex));
  return {
    x: (safeIndex % SAMURAI_ATLAS_COLUMNS) * SAMURAI_CELL_SIZE,
    y: Math.floor(safeIndex / SAMURAI_ATLAS_COLUMNS) * SAMURAI_CELL_SIZE,
    w: SAMURAI_CELL_SIZE,
    h: SAMURAI_CELL_SIZE
  };
}

/** Resolve a Metro/Expo-bundled PNG into an Asset object for web and native. */
export function createSamuraiSpritesheetAsset(): Asset {
  return Asset.fromModule(require("../assets/samurai-enemy.png"));
}

export const SAMURAI_ATLAS_METADATA = {
  image: "samurai-enemy.png",
  format: "RGBA8888",
  size: { w: SAMURAI_CELL_SIZE * SAMURAI_ATLAS_COLUMNS, h: SAMURAI_CELL_SIZE * SAMURAI_ATLAS_ROWS },
  pivot: SAMURAI_SPRITE_ANCHOR,
  animations: SAMURAI_ANIMATIONS
} as const;
