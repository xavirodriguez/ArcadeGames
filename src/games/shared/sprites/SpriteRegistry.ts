// src/games/shared/sprites/SpriteRegistry.ts

import type { SpriteSheetDef, SpriteFrameRect, SpriteImageSource } from "./SpriteTypes";

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

let kuchisakeOnnaImageSource: SpriteImageSource = null;
try {
  kuchisakeOnnaImageSource = require("../../../../assets/sprites/enemies/kichisake-onna.png");
} catch {
  kuchisakeOnnaImageSource = null;
}

let urbanBigHouseImageSource: SpriteImageSource = null;
try { urbanBigHouseImageSource = require("../../../../assets/sprites/background/urban/big_house.png"); } catch { urbanBigHouseImageSource = null; }
let urbanCasa1ImageSource: SpriteImageSource = null;
try { urbanCasa1ImageSource = require("../../../../assets/sprites/background/urban/casa1.png"); } catch { urbanCasa1ImageSource = null; }
let urbanCasa3ImageSource: SpriteImageSource = null;
try { urbanCasa3ImageSource = require("../../../../assets/sprites/background/urban/casa3.png"); } catch { urbanCasa3ImageSource = null; }
let urbanCasa4ImageSource: SpriteImageSource = null;
try { urbanCasa4ImageSource = require("../../../../assets/sprites/background/urban/casa4.png"); } catch { urbanCasa4ImageSource = null; }
let urbanCasaGrandeImageSource: SpriteImageSource = null;
try { urbanCasaGrandeImageSource = require("../../../../assets/sprites/background/urban/casa_grande.png"); } catch { urbanCasaGrandeImageSource = null; }
let urbanSmallHousesImageSource: SpriteImageSource = null;
try { urbanSmallHousesImageSource = require("../../../../assets/sprites/background/urban/small_houses.png"); } catch { urbanSmallHousesImageSource = null; }
let urbanCasita1ImageSource: SpriteImageSource = null;
try { urbanCasita1ImageSource = require("../../../../assets/sprites/background/urban/casita1.png"); } catch { urbanCasita1ImageSource = null; }
let urbanCasita2ImageSource: SpriteImageSource = null;
try { urbanCasita2ImageSource = require("../../../../assets/sprites/background/urban/casita2.png"); } catch { urbanCasita2ImageSource = null; }
let urbanCasita4ImageSource: SpriteImageSource = null;
try { urbanCasita4ImageSource = require("../../../../assets/sprites/background/urban/casita4.png"); } catch { urbanCasita4ImageSource = null; }
let urbanCasita5ImageSource: SpriteImageSource = null;
try { urbanCasita5ImageSource = require("../../../../assets/sprites/background/urban/casita5.png"); } catch { urbanCasita5ImageSource = null; }
// The source file currently has a leading space in its repository filename.
let urbanCasita7ImageSource: SpriteImageSource = null;
try { urbanCasita7ImageSource = require("../../../../assets/sprites/background/urban/ casita7.png"); } catch { urbanCasita7ImageSource = null; }

function createStaticEnvironmentArt(
  id: string,
  assetPath: string,
  imageSource: SpriteImageSource
): SpriteSheetDef {
  return {
    id,
    assetPath,
    imageSource,
    // Fit the complete source image into this logical box while preserving aspect ratio.
    frameWidth: 260,
    frameHeight: 230,
    sourceMode: "full-image",
    anchor: { x: 0.5, y: 1 },
    animations: {
      idle: { name: "idle", frames: [], frameDuration: 1, loop: true }
    }
  };
}

const URBAN_BIG_HOUSE = createStaticEnvironmentArt(
  "urban_big_house", "assets/sprites/background/urban/big_house.png", urbanBigHouseImageSource
);
const URBAN_HOUSE_01 = createStaticEnvironmentArt(
  "urban_house_01", "assets/sprites/background/urban/casa1.png", urbanCasa1ImageSource
);
const URBAN_HOUSE_03 = createStaticEnvironmentArt(
  "urban_house_03", "assets/sprites/background/urban/casa3.png", urbanCasa3ImageSource
);
const URBAN_HOUSE_04 = createStaticEnvironmentArt(
  "urban_house_04", "assets/sprites/background/urban/casa4.png", urbanCasa4ImageSource
);
const URBAN_LARGE_HOUSE = createStaticEnvironmentArt(
  "urban_large_house", "assets/sprites/background/urban/casa_grande.png", urbanCasaGrandeImageSource
);
const URBAN_SMALL_HOUSES = createStaticEnvironmentArt(
  "urban_small_houses", "assets/sprites/background/urban/small_houses.png", urbanSmallHousesImageSource
);
const URBAN_CASITA_01 = createStaticEnvironmentArt(
  "urban_casita_01", "assets/sprites/background/urban/casita1.png", urbanCasita1ImageSource
);
const URBAN_CASITA_02 = createStaticEnvironmentArt(
  "urban_casita_02", "assets/sprites/background/urban/casita2.png", urbanCasita2ImageSource
);
const URBAN_CASITA_04 = createStaticEnvironmentArt(
  "urban_casita_04", "assets/sprites/background/urban/casita4.png", urbanCasita4ImageSource
);
const URBAN_CASITA_05 = createStaticEnvironmentArt(
  "urban_casita_05", "assets/sprites/background/urban/casita5.png", urbanCasita5ImageSource
);
const URBAN_CASITA_07 = createStaticEnvironmentArt(
  "urban_casita_07", "assets/sprites/background/urban/ casita7.png", urbanCasita7ImageSource
);

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
  assetPath: "assets/sprites/enemies/enemy2.png",
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
  assetPath: "assets/sprites/enemies/sea_dragon.png",
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
  assetPath: "assets/sprites/enemies/ghost_galleon.png",
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
  assetPath: "assets/sprites/enemies/lancero.png",
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

/**
 * Cropped semantic regions from the original Kuchisake-onna contact sheet.
 * Rectangles exclude the sheet labels; the pale slash arc is intentional art.
 */
const KUCHISAKE_ONNA: SpriteSheetDef = {
  id: "echorunner_kuchisake_onna",
  assetPath: "assets/sprites/enemies/kichisake-onna.png",
  imageSource: kuchisakeOnnaImageSource,
  frameWidth: 160,
  frameHeight: 143,
  anchor: { x: 0.5, y: 1 },
  animations: {
    idle: {
      name: "idle",
      frames: [{ x: 360, y: 55, w: 145, h: 143 }],
      frameDuration: 1,
      loop: true
    },
    walk: {
      name: "walk",
      frames: [{ x: 695, y: 60, w: 160, h: 138 }],
      frameDuration: 0.12,
      loop: true
    },
    attack: {
      name: "attack",
      frames: [{ x: 680, y: 438, w: 180, h: 127 }],
      frameDuration: 0.12,
      loop: false
    },
    hurt: {
      name: "hurt",
      frames: [{ x: 850, y: 250, w: 165, h: 125 }],
      frameDuration: 0.1,
      loop: false
    },
    death: {
      name: "death",
      frames: [{ x: 325, y: 645, w: 185, h: 90 }],
      frameDuration: 0.12,
      loop: false
    }
  }
};

const TOWER_BASIC_ART: SpriteSheetDef = {
  id: "tower_basic_art",
  assetPath: "assets/sprites/towers/tower1.png",
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
  assetPath: "assets/sprites/towers/tower2.png",
  imageSource: towerSniperImageSource,
  frameWidth: 34,
  frameHeight: 34,
  sourceMode: "full-image",
  anchor: { x: 0.5, y: 0.5 },
  animations: {
    idle: { name: "idle", frames: [], frameDuration: 1, loop: true },
  },
};

/** All shared-pipeline sheets, kept declarative for runtime registration and CI validation. */
export const SPRITE_SHEET_CATALOG: readonly SpriteSheetDef[] = [
  ONI_RED,
  SEA_DRAGON,
  GHOST_GALLEON,
  LANCERO,
  KUCHISAKE_ONNA,
  URBAN_BIG_HOUSE,
  URBAN_HOUSE_01,
  URBAN_HOUSE_03,
  URBAN_HOUSE_04,
  URBAN_LARGE_HOUSE,
  URBAN_SMALL_HOUSES,
  URBAN_CASITA_01,
  URBAN_CASITA_02,
  URBAN_CASITA_04,
  URBAN_CASITA_05,
  URBAN_CASITA_07,
  TOWER_BASIC_ART,
  TOWER_SNIPER_ART
];

const registry = new Map<string, SpriteSheetDef>();

export const SpriteRegistry = {
  register(def: SpriteSheetDef): void {
    registry.set(def.id, def);
  },
  get(id: string): SpriteSheetDef | undefined {
    return registry.get(id);
  },
  has(id: string): boolean {
    return registry.has(id);
  },
  getAll(): readonly SpriteSheetDef[] {
    return [...registry.values()];
  },
  init(): void {
    for (const definition of SPRITE_SHEET_CATALOG) {
      this.register(definition);
    }
  },
};
