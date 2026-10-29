import type {
  AnimationDefinition,
  SpriteAnimationDefinition,
  SpriteSheetDefinition
} from "@tiny-aster/core";
import {
  HIT_RUN_CHARACTER_ANCHOR,
  HIT_RUN_CHARACTER_ATLAS_COLUMNS,
  HIT_RUN_CHARACTER_ATLAS_ROWS,
  HIT_RUN_CHARACTER_CELL_SIZE,
  HIT_RUN_SUMI_E_SAMURAI_SHEET_ID,
  getHitRunFrameRect,
  type HitRunFrameRect
} from "../presentation/CharacterAtlasContract";

export {
  HIT_RUN_CHARACTER_ANCHOR,
  HIT_RUN_CHARACTER_ATLAS_COLUMNS,
  HIT_RUN_CHARACTER_ATLAS_ROWS,
  HIT_RUN_CHARACTER_CELL_SIZE,
  HIT_RUN_SUMI_E_SAMURAI_SHEET_ID,
  getHitRunFrameRect,
  type HitRunFrameRect
};

interface HitRunAnimationLayout {
  name: string;
  startFrame: number;
  frameCount: number;
  frameDuration: number;
  loop: boolean;
}

/**
 * The single source of truth for Hit&Run character clips.
 *
 * Store explicit rectangles and seconds-per-frame here. The legacy ECS animator
 * still consumes frame indices and frames-per-second, so its definition is
 * generated below instead of keeping a second hand-maintained animation table.
 */
const HIT_RUN_CHARACTER_ANIMATION_LAYOUT: readonly HitRunAnimationLayout[] = [
  { name: "idle", startFrame: 0, frameCount: 8, frameDuration: 1 / 8, loop: true },
  { name: "walk", startFrame: 8, frameCount: 8, frameDuration: 1 / 10, loop: true },
  { name: "attack", startFrame: 16, frameCount: 8, frameDuration: 1 / 14, loop: false },
  { name: "hurt", startFrame: 24, frameCount: 6, frameDuration: 1 / 16, loop: false },
  { name: "death", startFrame: 32, frameCount: 8, frameDuration: 1 / 10, loop: false }
];

function createFrameSequence(startFrame: number, frameCount: number): import("@tiny-aster/core").SpriteFrameRect[] {
  return Array.from({ length: frameCount }, (_entry, index) =>
    getHitRunFrameRect(startFrame + index)
  );
}

/** Canonical clips used by sprite validation and any rectangle-based renderer. */
export const HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS: Record<string, SpriteAnimationDefinition> = {};

for (const layout of HIT_RUN_CHARACTER_ANIMATION_LAYOUT) {
  HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS[layout.name] = {
    name: layout.name,
    frames: createFrameSequence(layout.startFrame, layout.frameCount),
    frameDuration: layout.frameDuration,
    loop: layout.loop
  };
}

function getAtlasFrameIndex(frame: import("@tiny-aster/core").SpriteFrameRect): number {
  const column = frame.x / HIT_RUN_CHARACTER_CELL_SIZE;
  const row = frame.y / HIT_RUN_CHARACTER_CELL_SIZE;
  const isGridAligned = Number.isInteger(column) && Number.isInteger(row);
  const isCellSized =
    frame.w === HIT_RUN_CHARACTER_CELL_SIZE && frame.h === HIT_RUN_CHARACTER_CELL_SIZE;

  if (!isGridAligned || !isCellSized) {
    throw new Error(
      `Hit&Run's index-based animator requires ${HIT_RUN_CHARACTER_CELL_SIZE}px grid-aligned frames.`
    );
  }

  return row * HIT_RUN_CHARACTER_ATLAS_COLUMNS + column;
}

/**
 * Compatibility adapter for the existing ECS AnimationSystem.
 * Keep this projection until the runtime playback migration is completed.
 */
export const HIT_RUN_CHARACTER_ANIMATIONS: Record<string, AnimationDefinition> = {};

for (const [name, animation] of Object.entries(HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS)) {
  HIT_RUN_CHARACTER_ANIMATIONS[name] = {
    frames: animation.frames.map(getAtlasFrameIndex),
    frameRate: 1 / animation.frameDuration,
    loop: animation.loop
  };
}

const HIT_RUN_CHARACTER_SHEET_ASSETS = [
  {
    id: "hitrun_samurai_enemy",
    assetPath: "src/games/hitandrun/assets/samurai-enemy.png"
  },
  {
    id: "hitrun_sumi_e_player",
    assetPath: "src/games/hitandrun/assets/themes/sumi-e/characters/player.png"
  },
  {
    id: HIT_RUN_SUMI_E_SAMURAI_SHEET_ID,
    assetPath: "src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png"
  }
] as const;

/**
 * Validation metadata for the legacy ECS-index atlas and its Sumi-e variants.
 * Image loading remains game-owned; the shared contract describes the same
 * canonical clips which feed the compatibility adapter above.
 */
export const HIT_RUN_CHARACTER_SPRITE_SHEETS: readonly SpriteSheetDefinition[] =
  HIT_RUN_CHARACTER_SHEET_ASSETS.map(({ id, assetPath }) => {
    const animations: Record<string, SpriteAnimationDefinition> = {};

    for (const [name, animation] of Object.entries(HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS)) {
      animations[name] = {
        ...animation,
        frames: animation.frames.map((frame) => ({ ...frame }))
      };
    }

    return {
      id,
      assetPath,
      imageSource: null,
      frameWidth: HIT_RUN_CHARACTER_CELL_SIZE,
      frameHeight: HIT_RUN_CHARACTER_CELL_SIZE,
      anchor: { ...HIT_RUN_CHARACTER_ANCHOR },
      animations
    };
  });


/** Looks up the canonical metadata by sheet id without duplicating atlas tables. */
export function getHitRunCharacterSpriteSheet(
  sheetId: string
): SpriteSheetDefinition | undefined {
  return HIT_RUN_CHARACTER_SPRITE_SHEETS.find((sheet) => sheet.id === sheetId);
}
