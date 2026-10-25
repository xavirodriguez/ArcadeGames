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
    // Future sprites go here
  },
};
