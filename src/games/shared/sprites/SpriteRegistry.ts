// src/games/shared/sprites/SpriteRegistry.ts

import { SpriteSheetDef, SpriteFrameRect } from "./SpriteTypes";

/**
 * Helper to generate evenly spaced frames from a row in the sheet.
 */
function makeRowFrames(
  startX: number,
  startY: number,
  frameW: number,
  frameH: number,
  count: number,
  spacing = 96
): SpriteFrameRect[] {
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * spacing,
    y: startY,
    w: frameW,
    h: frameH,
  }));
}

/**
 * Red Oni / Ashigaru Infernal sprite sheet.
 * Measurements taken from the original 924×539 sheet.
 */
const ONI_RED: SpriteSheetDef = {
  id: "oni_red",
  // File currently lives as enemy2.png in the repo
  imageSource: require("../../../../assets/sprites/enemies/enemy2.png"),
  frameWidth: 56,
  frameHeight: 90,
  animations: {
    idle: {
      name: "idle",
      frames: makeRowFrames(128, 19, 54, 82, 8),
      frameDuration: 0.12,
      loop: true,
    },
    walk: {
      name: "walk",
      frames: makeRowFrames(128, 124, 54, 86, 8),
      frameDuration: 0.09,
      loop: true,
    },
    attack: {
      name: "attack",
      frames: makeRowFrames(128, 236, 54, 91, 8),
      frameDuration: 0.07,
      loop: false,
    },
    hurt: {
      name: "hurt",
      frames: makeRowFrames(128, 352, 54, 83, 6),
      frameDuration: 0.1,
      loop: false,
    },
    death: {
      name: "death",
      frames: makeRowFrames(128, 467, 54, 63, 8),
      frameDuration: 0.12,
      loop: false,
    },
  },
};

/**
 * Sea dragon ("dragón marino") sprite sheet from the "Aquí hay dragones" Space Invaders art bible.
 * Produced by scripts/sprites/build-sea-dragon-atlas.cjs: 640×192 PNG, uniform 80×64 px cells
 * (2 px nearest-neighbor scale of the 40×32 logical frame), rows top-down:
 *   row 0 fly (6 frames, loop), row 1 hit (3 frames, one-shot), row 2 death (6 frames, one-shot).
 * Logical frame 40×32 world units; the silhouette is ≈34 u long and vertically centered,
 * matching the bonus-ship lane scale documented in ARTWORK_theme_alternativo.md §12.2.
 */
const SEA_DRAGON: SpriteSheetDef = {
  id: "sea_dragon",
  imageSource: require("../../../../assets/sprites/enemies/sea_dragon.png"),
  frameWidth: 40,
  frameHeight: 32,
  animations: {
    fly: {
      name: "fly",
      frames: makeRowFrames(0, 0, 40, 32, 6, 40),
      frameDuration: 0.16,
      loop: true,
    },
    hit: {
      name: "hit",
      frames: makeRowFrames(0, 32, 40, 32, 3, 40),
      frameDuration: 0.09,
      loop: false,
    },
    death: {
      name: "death",
      frames: makeRowFrames(0, 64, 40, 32, 6, 40),
      frameDuration: 0.12,
      loop: false,
    },
  },
};

const registry = new Map<string, SpriteSheetDef>();

export const SpriteRegistry = {
  register(def: SpriteSheetDef) {
    registry.set(def.id, def);
  },

  get(id: string): SpriteSheetDef | undefined {
    return registry.get(id);
  },

  has(id: string): boolean {
    return registry.has(id);
  },

  /**
   * Call once at app / game boot.
   */
  init() {
    this.register(ONI_RED);
    this.register(SEA_DRAGON);
    // Future sprites go here
  },
};
