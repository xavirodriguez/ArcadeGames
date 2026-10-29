import type { Asset } from "expo-asset";
import {
  HIT_RUN_CHARACTER_ANIMATIONS,
  HIT_RUN_CHARACTER_ATLAS_COLUMNS,
  HIT_RUN_CHARACTER_ATLAS_ROWS,
} from "./HitRunSpriteAtlas";

export {
  SUMI_E_THEME_RESOURCE,
  SUMI_E_PLAYER_ASSET_KEY,
  SUMI_E_PLAYER_READY_RESOURCE,
  SUMI_E_CELL_SIZE,
  SUMI_E_PLAYER_ANCHOR,
  getSumiEFrameRect,
  type SumiEFrameRect
} from "../presentation/ThemeAssetIds";

export const SUMI_E_ATLAS_COLUMNS = HIT_RUN_CHARACTER_ATLAS_COLUMNS;
export const SUMI_E_ATLAS_ROWS = HIT_RUN_CHARACTER_ATLAS_ROWS;
export const SUMI_E_PLAYER_ANIMATIONS = HIT_RUN_CHARACTER_ANIMATIONS;

/** Defer asset resolution until preload, while keeping literal paths for Metro. */
function createAssetFromModule(moduleId: number): Asset {
  const { Asset: ExpoAsset } = require("expo-asset") as typeof import("expo-asset");
  return ExpoAsset.fromModule(moduleId);
}

export function createSumiEPlayerSpritesheetAsset(): Asset {
  return createAssetFromModule(require("../assets/themes/sumi-e/characters/player.png"));
}

export function createSumiESamuraiSpritesheetAsset(): Asset {
  return createAssetFromModule(require("../assets/themes/sumi-e/enemies/samurai.png"));
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
