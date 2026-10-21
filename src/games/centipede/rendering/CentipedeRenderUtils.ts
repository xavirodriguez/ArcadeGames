import { resolveThemeColor, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig } from "../types/CentipedeConfigSchema";

type CentipedeWorld = World<CentipedeComponentRegistry, CentipedeEventRegistry>;

export interface CentipedePalette {
  soil: string;
  playerZone: string;
  hairline: string;
  mushroomA: string;
  mushroomB: string;
  centipedeHead: string;
  centipedeBody: string;
  centipedeShine: string;
  centipedeLegs: string;
  amber: string;
  toxin: string;
  lobeOff: string;
  stem: string;
  player: string;
  playerAccent: string;
  hudText: string;
}

export function getCentipedePalette(world: CentipedeWorld): CentipedePalette {
  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  return {
    soil: palette?.soil ?? resolveThemeColor(world, "soil", "soil") ?? "soil",
    playerZone: palette?.playerZone ?? resolveThemeColor(world, "playerZone", "playerZone") ?? "playerZone",
    hairline: palette?.hairline ?? resolveThemeColor(world, "hairline", "hairline") ?? "hairline",
    mushroomA: palette?.mushroomA ?? resolveThemeColor(world, "mushroomA", "mushroomA") ?? "mushroomA",
    mushroomB: palette?.mushroomB ?? resolveThemeColor(world, "mushroomB", "mushroomB") ?? "mushroomB",
    centipedeHead: palette?.centipedeHead ?? resolveThemeColor(world, "centipedeHead", "centipedeHead") ?? "centipedeHead",
    centipedeBody: palette?.centipedeBody ?? resolveThemeColor(world, "centipedeBody", "centipedeBody") ?? "centipedeBody",
    centipedeShine: palette?.centipedeShine ?? resolveThemeColor(world, "centipedeShine", "centipedeShine") ?? "centipedeShine",
    centipedeLegs: palette?.centipedeLegs ?? resolveThemeColor(world, "centipedeLegs", "centipedeLegs") ?? "centipedeLegs",
    amber: palette?.amber ?? resolveThemeColor(world, "amber", "amber") ?? "amber",
    toxin: palette?.toxin ?? resolveThemeColor(world, "toxin", "toxin") ?? "toxin",
    lobeOff: palette?.lobeOff ?? resolveThemeColor(world, "lobeOff", "lobeOff") ?? "lobeOff",
    stem: palette?.stem ?? resolveThemeColor(world, "stem", "stem") ?? "stem",
    player: palette?.player ?? resolveThemeColor(world, "centipedePlayer", "player") ?? "player",
    playerAccent: palette?.playerAccent ?? resolveThemeColor(world, "playerAccent", "playerAccent") ?? "playerAccent",
    hudText: palette?.hudText ?? resolveThemeColor(world, "hudText", "hudText") ?? "hudText",
  };
}

export function getCentipedeIsColorblind(world: CentipedeWorld): boolean {
  const config = world.getResource<CentipedeConfig>("GameConfig");
  return config?.visual?.colorblindMode ?? false;
}
