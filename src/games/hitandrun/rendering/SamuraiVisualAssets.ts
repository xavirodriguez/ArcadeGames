import { Asset } from "expo-asset";
import type { AnimationDefinition, IAssetProvider } from "@tiny-aster/core";

/** Shared AssetLoader key consumed by Canvas and Skia sprite drawers. */
export const SAMURAI_ASSET_KEY = "hitrun_samurai_enemy";
export const SAMURAI_SPRITE_READY_RESOURCE = "HitRunSamuraiSpriteReady";
export const SAMURAI_CELL_SIZE = 64;
export const SAMURAI_ATLAS_COLUMNS = 8;
export const SAMURAI_ATLAS_ROWS = 5;
/** Source cells include a small ground shadow; the origin remains at the feet. */
export const SAMURAI_SPRITE_ANCHOR = { x: 0.5, y: 0.94 } as const;

const frameRange = (start: number, count: number): number[] =>
  Array.from({ length: count }, (_entry, index) => start + index);

/**
 * AnimationSystem advances a clip-local frame index. SamuraiSpriteFrameSystem
 * maps the clip's frame value to the corresponding cell in the row-major atlas.
 */
export const SAMURAI_ANIMATIONS: Record<string, AnimationDefinition> = {
  idle: { frames: frameRange(0, 8), frameRate: 8, loop: true },
  walk: { frames: frameRange(8, 8), frameRate: 10, loop: true },
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
  const safeIndex = Math.max(0, Math.min(39, Math.floor(atlasFrameIndex)));
  return {
    x: (safeIndex % SAMURAI_ATLAS_COLUMNS) * SAMURAI_CELL_SIZE,
    y: Math.floor(safeIndex / SAMURAI_ATLAS_COLUMNS) * SAMURAI_CELL_SIZE,
    w: SAMURAI_CELL_SIZE,
    h: SAMURAI_CELL_SIZE
  };
}

/** Static require keeps the PNG discoverable by Metro on web and native. */
export function createSamuraiSpritesheetAsset(): Asset {
  return Asset.fromModule(require("../assets/samurai-enemy.png"));
}

export async function loadSamuraiSpritesheetAsset(): Promise<Asset> {
  const asset = createSamuraiSpritesheetAsset();
  await asset.downloadAsync();
  return asset;
}

/**
 * Fallback provider for this bundled image only. It preserves Expo Asset handles
 * so Canvas can load the URI and Skia can resolve localUri/uri on native.
 */
export function createSamuraiAssetProvider(): IAssetProvider {
  return {
    async loadImage(path: string): Promise<unknown> {
      const asset = path as unknown as { uri?: string; localUri?: string };
      if (
        typeof asset === "object" &&
        asset !== null &&
        (typeof asset.localUri === "string" || typeof asset.uri === "string")
      ) {
        return asset;
      }
      return { uri: path };
    },
    async loadAudio(path: string): Promise<unknown> {
      return path;
    },
    async loadFont(path: string): Promise<unknown> {
      return path;
    }
  };
}

export const SAMURAI_ATLAS_METADATA = {
  image: "samurai-enemy.png",
  format: "RGBA8888",
  size: {
    w: SAMURAI_CELL_SIZE * SAMURAI_ATLAS_COLUMNS,
    h: SAMURAI_CELL_SIZE * SAMURAI_ATLAS_ROWS
  },
  pivot: SAMURAI_SPRITE_ANCHOR,
  animations: SAMURAI_ANIMATIONS
} as const;
