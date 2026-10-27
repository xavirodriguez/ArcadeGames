import type { Asset } from "expo-asset";
import type { AnimationDefinition } from "@tiny-aster/core";

/** Resource flags and asset keys for the two Sumi-e atlases shipped in the repository. */
export const SUMI_E_THEME_RESOURCE = "HitRunSumiEThemeEnabled";
export const SUMI_E_PLAYER_ASSET_KEY = "hitrun_sumi_e_player";
export const SUMI_E_PLAYER_READY_RESOURCE = "HitRunSumiEPlayerSpriteReady";

export const SUMI_E_CELL_SIZE = 64;
export const SUMI_E_ATLAS_COLUMNS = 8;
export const SUMI_E_ATLAS_ROWS = 5;
export const SUMI_E_PLAYER_ANCHOR = { x: 0.5, y: 0.94 } as const;

const frameRange = (start: number, count: number): number[] =>
  Array.from({ length: count }, (_entry, index) => start + index);

/** Player and samurai pilot atlases use the same 8x5 frame layout. */
export const SUMI_E_PLAYER_ANIMATIONS: Record<string, AnimationDefinition> = {
  idle: { frames: frameRange(0, 8), frameRate: 8, loop: true },
  walk: { frames: frameRange(8, 8), frameRate: 10, loop: true },
  attack: { frames: frameRange(16, 8), frameRate: 14, loop: false },
  hurt: { frames: frameRange(24, 6), frameRate: 16, loop: false },
  death: { frames: frameRange(32, 8), frameRate: 10, loop: false }
};

export interface SumiEFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getSumiEFrameRect(atlasFrameIndex: number): SumiEFrameRect {
  const safeIndex = Math.max(
    0,
    Math.min(SUMI_E_ATLAS_COLUMNS * SUMI_E_ATLAS_ROWS - 1, Math.floor(atlasFrameIndex))
  );
  return {
    x: (safeIndex % SUMI_E_ATLAS_COLUMNS) * SUMI_E_CELL_SIZE,
    y: Math.floor(safeIndex / SUMI_E_ATLAS_COLUMNS) * SUMI_E_CELL_SIZE,
    w: SUMI_E_CELL_SIZE,
    h: SUMI_E_CELL_SIZE
  };
}

/** Static requires keep both bundled atlases discoverable by Metro. */
export function createSumiEPlayerSpritesheetAsset(): Asset {
  const { Asset: ExpoAsset } = require("expo-asset") as typeof import("expo-asset");
  return ExpoAsset.fromModule(
    require("../assets/themes/sumi-e/characters/player.png")
  );
}

export function createSumiESamuraiSpritesheetAsset(): Asset {
  const { Asset: ExpoAsset } = require("expo-asset") as typeof import("expo-asset");
  return ExpoAsset.fromModule(
    require("../assets/themes/sumi-e/enemies/samurai.png")
  );
}

export async function loadSumiEPlayerSpritesheetAsset(): Promise<Asset> {
  const asset = createSumiEPlayerSpritesheetAsset();
  await asset.downloadAsync();
  return asset;
}

export async function loadSumiESamuraiSpritesheetAsset(): Promise<Asset> {
  const asset = createSumiESamuraiSpritesheetAsset();
  await asset.downloadAsync();
  return asset;
}
