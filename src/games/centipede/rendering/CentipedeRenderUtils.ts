import { World, resolveThemeColor } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_PALETTE, DEFAULT_PALETTE_COLORBLIND, CentipedePalette } from "../types/CentipedeConfigSchema";

type CentipedeWorld = World<CentipedeComponentRegistry, CentipedeEventRegistry>;

/**
 * Resolves active Centipede palette dynamically based on world theme, config, and colorblind mode settings.
 */
export function getCentipedePalette(world: CentipedeWorld): CentipedePalette {
  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const configPalette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;
  const defaultBase = isColorblind ? DEFAULT_PALETTE_COLORBLIND : DEFAULT_PALETTE;

  return {
    soil: configPalette?.soil ?? resolveThemeColor(world, "soil", "soil") ?? defaultBase.soil,
    playerZone: configPalette?.playerZone ?? resolveThemeColor(world, "playerZone", "playerZone") ?? defaultBase.playerZone,
    hairline: configPalette?.hairline ?? resolveThemeColor(world, "hairline", "hairline") ?? defaultBase.hairline,
    mushroomA: configPalette?.mushroomA ?? resolveThemeColor(world, "mushroomA", "mushroomA") ?? defaultBase.mushroomA,
    mushroomB: configPalette?.mushroomB ?? resolveThemeColor(world, "mushroomB", "mushroomB") ?? defaultBase.mushroomB,
    stem: configPalette?.stem ?? resolveThemeColor(world, "stem", "stem") ?? defaultBase.stem,
    lobeOff: configPalette?.lobeOff ?? resolveThemeColor(world, "lobeOff", "lobeOff") ?? defaultBase.lobeOff,
    centipedeHead: configPalette?.centipedeHead ?? resolveThemeColor(world, "centipedeHead", "centipedeHead") ?? defaultBase.centipedeHead,
    centipedeBody: configPalette?.centipedeBody ?? resolveThemeColor(world, "centipedeBody", "centipedeBody") ?? defaultBase.centipedeBody,
    centipedeShine: configPalette?.centipedeShine ?? resolveThemeColor(world, "centipedeShine", "centipedeShine") ?? defaultBase.centipedeShine,
    centipedeLegs: configPalette?.centipedeLegs ?? resolveThemeColor(world, "centipedeLegs", "centipedeLegs") ?? defaultBase.centipedeLegs,
    amber: configPalette?.amber ?? resolveThemeColor(world, "amber", "amber") ?? defaultBase.amber,
    toxin: configPalette?.toxin ?? resolveThemeColor(world, "toxin", "toxin") ?? defaultBase.toxin,
    player: configPalette?.player ?? resolveThemeColor(world, "centipedePlayer", "player") ?? defaultBase.player,
    playerAccent: configPalette?.playerAccent ?? resolveThemeColor(world, "playerAccent", "playerAccent") ?? defaultBase.playerAccent,
    hudText: configPalette?.hudText ?? resolveThemeColor(world, "hudText", "hudText") ?? defaultBase.hudText,
    hudMuted: configPalette?.hudMuted ?? resolveThemeColor(world, "hudMuted", "hudMuted") ?? defaultBase.hudMuted,
  };
}
