import type { Asset } from "expo-asset";
import type { IAssetProvider } from "@tiny-aster/core";
import {
  HIT_RUN_CHARACTER_ANIMATIONS,
  HIT_RUN_CHARACTER_ATLAS_COLUMNS,
  HIT_RUN_CHARACTER_ATLAS_ROWS,
} from "./HitRunSpriteAtlas";
import {
  SAMURAI_ASSET_KEY,
  SAMURAI_CELL_SIZE,
  SAMURAI_SPRITE_ANCHOR,
  SAMURAI_SPRITE_READY_RESOURCE,
  getSamuraiFrameRect,
  type SamuraiFrameRect
} from "../presentation/ThemeAssetIds";

/**
 * Runtime decision (2026-10-26 sprite audit):
 * `assets/sprites/samurai1.png` is alternate concept art and does NOT replace
 * this pipeline. Hit&Run keeps `samurai-enemy.png` + atlas JSON / AnimationSystem
 * frame mapping. Promote samurai1 only after measuring cells and migrating
 * SAMURAI_ANIMATIONS; until then both assets coexist (samurai1 unused at runtime).
 */
export {
  SAMURAI_ASSET_KEY,
  SAMURAI_SPRITE_READY_RESOURCE,
  SAMURAI_CELL_SIZE,
  SAMURAI_SPRITE_ANCHOR,
  getSamuraiFrameRect,
  type SamuraiFrameRect
};

export const SAMURAI_ATLAS_COLUMNS = HIT_RUN_CHARACTER_ATLAS_COLUMNS;
export const SAMURAI_ATLAS_ROWS = HIT_RUN_CHARACTER_ATLAS_ROWS;
export const SAMURAI_ANIMATIONS = HIT_RUN_CHARACTER_ANIMATIONS;

/** Static require keeps the PNG discoverable by Metro on web and native. */
export function createSamuraiSpritesheetAsset(): Asset {
  const { Asset: ExpoAsset } = require("expo-asset") as typeof import("expo-asset");
  return ExpoAsset.fromModule(require("../assets/samurai-enemy.png"));
}

export async function loadSamuraiSpritesheetAsset(): Promise<Asset> {
  const asset = createSamuraiSpritesheetAsset();
  await asset.downloadAsync();
  return asset;
}

/**
 * Provider for the bundled PNG. Keep the URI handle compatible with both
 * CanvasSpriteDrawer and SkiaSpriteDrawer instead of returning a backend-specific image.
 */
export function createSamuraiAssetProvider(): IAssetProvider {
  return {
    async loadImage(path: string): Promise<{ uri: string }> {
      return { uri: path };
    },
    async loadAudio(path: string): Promise<string> {
      return path;
    },
    async loadFont(path: string): Promise<string> {
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
