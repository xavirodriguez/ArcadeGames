import { Theme } from "@tiny-aster/core";
import { ww2DogfightConceptPack } from "./ww2DogfightConceptPack";
import { zombieSurvivalConceptPack } from "./zombieSurvivalConceptPack";
import { siegeShieldWallConceptPack } from "./siegeShieldWallConceptPack";
import { paperDuskConceptPack } from "./paperDuskConceptPack";
import { aquiHayDragonesConceptPack } from "./aquiHayDragonesConceptPack";

export * from "./ww2DogfightConceptPack";
export * from "./zombieSurvivalConceptPack";
export * from "./siegeShieldWallConceptPack";
export * from "./paperDuskConceptPack";
export * from "./aquiHayDragonesConceptPack";

/**
 * Registry map of all available concept packs indexed by concept pack ID.
 */
export const availableConceptPacks: Record<string, Theme> = {
  siege_shield_wall: siegeShieldWallConceptPack,
  ww2_dogfight: ww2DogfightConceptPack,
  zombie_survival: zombieSurvivalConceptPack,
  paper_dusk: paperDuskConceptPack,
  aqui_hay_dragones: aquiHayDragonesConceptPack,
  /** Phase 0 Option A alias */
  "nautical-chart": aquiHayDragonesConceptPack,
};

/**
 * List of concept packs available for selection in UI screens.
 */
export const availableConceptPackList: Theme[] = [
  siegeShieldWallConceptPack,
  ww2DogfightConceptPack,
  zombieSurvivalConceptPack,
  paperDuskConceptPack,
  aquiHayDragonesConceptPack,
];
