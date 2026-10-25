// src/games/shared/sprites/SpriteRegistry.ts

import { SpriteSheetDef, SpriteFrameRect, SpriteImageSource } from "./SpriteTypes";

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

let oniRedImageSource: SpriteImageSource = null;
try {
  oniRedImageSource = require("../../../../assets/sprites/enemies/oni_red.png");
} catch {
  oniRedImageSource = null;
}

let tower1ImageSource: SpriteImageSource = null;
try {
  tower1ImageSource = require("../../../../assets/sprites/towers/tower1.png");
} catch {
  tower1ImageSource = null;
}

let tower2ImageSource: SpriteImageSource = null;
try {
  tower2ImageSource = require("../../../../assets/sprites/towers/tower2.png");
} catch {
  tower2ImageSource = null;
}

/**
 * Red Oni / Ashigaru Infernal sprite sheet.
 * Measurements taken from the original 924×539 sheet.
 */
const ONI_RED: SpriteSheetDef = {
  id: "oni_red",
  // NOTE: place the file at assets/sprites/enemies/oni_red.png
  imageSource: oniRedImageSource,
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
 * Static tower artwork. Source dimensions are read from each image at runtime,
 * so these definitions do not assume a frame grid or bake source-pixel sizes.
 *
 * tower1 is assigned to the basic tower and tower2 to the sniper tower. Both
 * use center anchors because towers sit on cell centers rather than on feet.
 */
const TOWER_BASIC_ART: SpriteSheetDef = {
  id: "tower_basic_art",
  imageSource: tower1ImageSource,
  frameWidth: 34,
  frameHeight: 34,
  sourceMode: "full-image",
  anchor: { x: 0.5, y: 0.5 },
  animations: {
    idle: { name: "idle", frames: [], frameDuration: 1, loop: true },
  },
};

const TOWER_SNIPER_ART: SpriteSheetDef = {
  id: "tower_sniper_art",
  imageSource: tower2ImageSource,
  frameWidth: 34,
  frameHeight: 34,
  sourceMode: "full-image",
  anchor: { x: 0.5, y: 0.5 },
  animations: {
    idle: { name: "idle", frames: [], frameDuration: 1, loop: true },
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
    this.register(TOWER_BASIC_ART);
    this.register(TOWER_SNIPER_ART);
    // Future sprites go here
  },
};
