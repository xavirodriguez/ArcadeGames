/**
 * Theme asset keys and world-resource flags used by spawn blueprints.
 * Lives outside rendering/ so simulation (belt, waves, weapons, ai) never imports drawers.
 */
import {
  HIT_RUN_CHARACTER_ANCHOR,
  HIT_RUN_CHARACTER_CELL_SIZE,
  HIT_RUN_SUMI_E_SAMURAI_SHEET_ID,
  getHitRunFrameRect,
  type HitRunFrameRect
} from "./CharacterAtlasContract";

export const SUMI_E_THEME_RESOURCE = "HitRunSumiEThemeEnabled";
export const SUMI_E_PLAYER_ASSET_KEY = "hitrun_sumi_e_player";
export const SUMI_E_PLAYER_READY_RESOURCE = "HitRunSumiEPlayerSpriteReady";

export const SUMI_E_CELL_SIZE = HIT_RUN_CHARACTER_CELL_SIZE;
export const SUMI_E_PLAYER_ANCHOR = HIT_RUN_CHARACTER_ANCHOR;
export const getSumiEFrameRect = getHitRunFrameRect;
export type SumiEFrameRect = HitRunFrameRect;

export const SAMURAI_ASSET_KEY = "hitrun_samurai_enemy";
export const SAMURAI_SPRITE_READY_RESOURCE = "HitRunSamuraiSpriteReady";
export const SAMURAI_CELL_SIZE = HIT_RUN_CHARACTER_CELL_SIZE;
export const SAMURAI_SPRITE_ANCHOR = HIT_RUN_CHARACTER_ANCHOR;
export const getSamuraiFrameRect = getHitRunFrameRect;
export type SamuraiFrameRect = HitRunFrameRect;

export { HIT_RUN_SUMI_E_SAMURAI_SHEET_ID };
