// src/games/shared/sprites/SpriteRegistry.ts

import { SpriteSheetDef, SpriteFrameRect, SpriteImageSource } from "./SpriteTypes";

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

// oni_red art shipped as enemy2.png (924×539). Keep id "oni_red" for callers.
let oniRedImageSource: SpriteImageSource = null;
try {
  oniRedImageSource = require("../../../../assets/sprites/enemies/enemy2.png");
} catch {
  try {
    oniRedImageSource = require("../../../../assets/sprites/enemies/oni_red.png");
  } catch {
    oniRedImageSource = null;
  }
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

let seaDragonImageSource: SpriteImageSource = null;
try {
  seaDragonImageSource = require("../../../../assets/sprites/enemies/sea_dragon.png");
} catch {
  seaDragonImageSource = null;
}

let ghostGalleonImageSource: SpriteImageSource = null;
try {
  ghostGalleonImageSource = require("../../../../assets/sprites/enemies/ghost_galleon.png");
} catch {
  ghostGalleonImageSource = null;
}

let lanceroImageSource: SpriteImageSource = null;
try {
  lanceroImageSource = require("../../../../assets/sprites/enemies/lancero.png");
} catch {
  lanceroImageSource = null;
}

let towerBasicImageSource: SpriteImageSource = null;
try {
  towerBasicImageSource = require("../../../../assets/sprites/towers/tower1.png");
} catch {
  towerBasicImageSource = null;
}

let towerSniperImageSource: SpriteImageSource = null;
try {
  towerSniperImageSource = require("../../../../assets/sprites/towers/tower2.png");
} catch {
  towerSniperImageSource = null;
}

const ONI_RED: SpriteSheetDef = {
  id: "oni_red",
  imageSource: oniRedImageSource,
  frameWidth: 56,
  frameHeight: 90,
  animations: {
    idle: { name: "idle", frames: makeRowFrames(128, 19, 54, 82, 8), frameDuration: 0.12, loop: true },
    walk: { name: "walk", frames: makeRowFrames(128, 124, 54, 86, 8), frameDuration: 0.09, loop: true },
    attack: { name: "attack", frames: makeRowFrames(128, 236, 54, 91, 8), frameDuration: 0.07, loop: false },
    hurt: { name: "hurt", frames: makeRowFrames(128, 352, 54, 83, 6), frameDuration: 0.1, loop: false },
    death: { name: "death", frames: makeRowFrames(128, 467, 54, 63, 8), frameDuration: 0.12, loop: false },
  },
};

const SEA_DRAGON: SpriteSheetDef = {
  id: "sea_dragon",
  imageSource: seaDragonImageSource,
  frameWidth: 40,
  frameHeight: 32,
  animations: {
    fly: { name: "fly", frames: makeRowFrames(0, 0, 40, 32, 6, 40), frameDuration: 0.16, loop: true },
    hit: { name: "hit", frames: makeRowFrames(0, 32, 40, 32, 3, 40), frameDuration: 0.09, loop: false },
    death: { name: "death", frames: makeRowFrames(0, 64, 40, 32, 6, 40), frameDuration: 0.12, loop: false },
  },
};

const GHOST_GALLEON: SpriteSheetDef = {
  id: "ghost_galleon",
  imageSource: ghostGalleonImageSource,
  frameWidth: 40,
  frameHeight: 32,
  animations: {
    sail: { name: "sail", frames: makeRowFrames(0, 0, 40, 32, 8, 40), frameDuration: 0.18, loop: true },
    hit: { name: "hit", frames: makeRowFrames(0, 32, 40, 32, 3, 40), frameDuration: 0.09, loop: false },
    death: { name: "death", frames: makeRowFrames(0, 64, 40, 32, 6, 40), frameDuration: 0.12, loop: false },
  },
};

const LANCERO_CELL_W = 172;
const LANCERO_CELL_H = 192;
const LANCERO: SpriteSheetDef = {
  id: "lancero",
  imageSource: lanceroImageSource,
  frameWidth: 48,
  frameHeight: 64,
  anchor: { x: 0.5, y: 1 },
  animations: {
    idle: { name: "idle", frames: makeRowFrames(0, 0, LANCERO_CELL_W, LANCERO_CELL_H, 8, LANCERO_CELL_W), frameDuration: 0.12, loop: true },
    walk: { name: "walk", frames: makeRowFrames(0, LANCERO_CELL_H, LANCERO_CELL_W, LANCERO_CELL_H, 8, LANCERO_CELL_W), frameDuration: 0.09, loop: true },
    attack: { name: "attack", frames: makeRowFrames(0, LANCERO_CELL_H * 2, LANCERO_CELL_W, LANCERO_CELL_H, 8, LANCERO_CELL_W), frameDuration: 0.07, loop: false },
    hurt: { name: "hurt", frames: makeRowFrames(0, LANCERO_CELL_H * 3, LANCERO_CELL_W, LANCERO_CELL_H, 6, LANCERO_CELL_W), frameDuration: 0.1, loop: false },
  },
};

const TOWER_BASIC_ART: SpriteSheetDef = {
  id: "tower_basic_art",
  imageSource: towerBasicImageSource,
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
  imageSource: towerSniperImageSource,
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
  init() {
    this.register(ONI_RED);
    this.register(SEA_DRAGON);
    this.register(GHOST_GALLEON);
    this.register(LANCERO);
    this.register(TOWER_BASIC_ART);
    this.register(TOWER_SNIPER_ART);
  },
};
