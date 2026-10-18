import { Theme } from "@tiny-aster/core";
import { ww2DogfightConceptPack } from "./ww2DogfightConceptPack";
import { zombieSurvivalConceptPack } from "./zombieSurvivalConceptPack";
import { siegeShieldWallConceptPack } from "./siegeShieldWallConceptPack";
import { paperDuskConceptPack } from "./paperDuskConceptPack";

export * from "./ww2DogfightConceptPack";
export * from "./zombieSurvivalConceptPack";
export * from "./siegeShieldWallConceptPack";
export * from "./paperDuskConceptPack";

/**
 * Registry map of all available concept packs indexed by concept pack ID.
 */
export const availableConceptPacks: Record<string, Theme> = {
  siege_shield_wall: siegeShieldWallConceptPack,
  ww2_dogfight: ww2DogfightConceptPack,
  zombie_survival: zombieSurvivalConceptPack,
  paper_dusk: paperDuskConceptPack,
};

/**
 * List of concept packs available for selection in UI screens.
 */
export const availableConceptPackList: Theme[] = [
  siegeShieldWallConceptPack,
  ww2DogfightConceptPack,
  zombieSurvivalConceptPack,
  paperDuskConceptPack,
];
