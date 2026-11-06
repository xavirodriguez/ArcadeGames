import { resolveThemeColor, World, Entity } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig } from "../types/CentipedeConfigSchema";
import { CENTIPEDE_VISUAL_TOKENS } from "./CentipedeVisualTokens";

export type CentipedeWorld = World<CentipedeComponentRegistry, CentipedeEventRegistry>;

export interface CentipedePaletteResolved {
  isColorblind: boolean;
  soil: string;
  playerZone: string;
  hairline: string;
  mushroomA: string;
  mushroomB: string;
  centipedeHead: string;
  centipedeBody: string;
  centipedeLegs: string;
  centipedeShine: string;
  amber: string;
  toxin: string;
  lobeOff: string;
  stem: string;
  player: string;
  playerAccent: string;
  eyeHighlight: string;
  hudText: string;
}

export function getCentipedePalette(world: CentipedeWorld): CentipedePaletteResolved {
  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  return {
    isColorblind,
    soil: palette?.soil ?? resolveThemeColor(world, "soil", "soil") ?? CENTIPEDE_VISUAL_TOKENS.soil,
    playerZone: palette?.playerZone ?? resolveThemeColor(world, "playerZone", "playerZone") ?? CENTIPEDE_VISUAL_TOKENS.playerZone,
    hairline: palette?.hairline ?? resolveThemeColor(world, "hairline", "hairline") ?? CENTIPEDE_VISUAL_TOKENS.hairline,
    mushroomA: palette?.mushroomA ?? resolveThemeColor(world, "mushroomA", "mushroomA") ?? CENTIPEDE_VISUAL_TOKENS.mushroomA,
    mushroomB: palette?.mushroomB ?? resolveThemeColor(world, "mushroomB", "mushroomB") ?? CENTIPEDE_VISUAL_TOKENS.mushroomB,
    centipedeHead: palette?.centipedeHead ?? resolveThemeColor(world, "centipedeHead", "centipedeHead") ?? CENTIPEDE_VISUAL_TOKENS.centipedeHead,
    centipedeBody: palette?.centipedeBody ?? resolveThemeColor(world, "centipedeBody", "centipedeBody") ?? CENTIPEDE_VISUAL_TOKENS.centipedeBody,
    centipedeLegs: palette?.centipedeLegs ?? resolveThemeColor(world, "centipedeLegs", "centipedeLegs") ?? CENTIPEDE_VISUAL_TOKENS.centipedeLegs,
    centipedeShine: palette?.centipedeShine ?? resolveThemeColor(world, "centipedeShine", "centipedeShine") ?? CENTIPEDE_VISUAL_TOKENS.centipedeShine,
    amber: palette?.amber ?? resolveThemeColor(world, "amber", "amber") ?? CENTIPEDE_VISUAL_TOKENS.amber,
    toxin: palette?.toxin ?? resolveThemeColor(world, "toxin", "toxin") ?? CENTIPEDE_VISUAL_TOKENS.toxin,
    lobeOff: palette?.lobeOff ?? resolveThemeColor(world, "lobeOff", "lobeOff") ?? CENTIPEDE_VISUAL_TOKENS.lobeOff,
    stem: palette?.stem ?? resolveThemeColor(world, "stem", "stem") ?? CENTIPEDE_VISUAL_TOKENS.stem,
    player: palette?.player ?? resolveThemeColor(world, "centipedePlayer", "player") ?? CENTIPEDE_VISUAL_TOKENS.player,
    playerAccent: palette?.playerAccent ?? resolveThemeColor(world, "playerAccent", "playerAccent") ?? CENTIPEDE_VISUAL_TOKENS.playerAccent,
    eyeHighlight: CENTIPEDE_VISUAL_TOKENS.eyeHighlight,
    hudText: palette?.hudText ?? CENTIPEDE_VISUAL_TOKENS.hudText,
  };
}

export interface SegmentRenderOffset {
  offsetX: number;
  offsetY: number;
}

export function getSegmentRenderOffset(world: CentipedeWorld, entity: Entity): SegmentRenderOffset {
  const vis = world.getComponent(entity, "SegmentVisual");
  const transform = world.getComponent(entity, "Transform");
  if (vis && transform) {
    return {
      offsetX: vis.visualX - transform.x,
      offsetY: vis.visualY - transform.y,
    };
  }
  return { offsetX: 0, offsetY: 0 };
}

export interface CentipedeHeadVisualContext {
  palette: CentipedePaletteResolved;
  offsetX: number;
  offsetY: number;
  radius: number;
}

export function getCentipedeHeadVisualContext(world: CentipedeWorld, entity: Entity): CentipedeHeadVisualContext {
  const config = world.getResource<CentipedeConfig>("GameConfig");
  const palette = getCentipedePalette(world);
  const { offsetX, offsetY } = getSegmentRenderOffset(world, entity);

  const vis = world.getComponent(entity, "SegmentVisual");
  const popScale = vis && vis.popTimerMs > 0 ? 1.15 : 1.0;
  const baseRadius = (config?.CELL_SIZE ?? 10) * (config?.visual?.segmentRadiusHead ?? 0.55);
  const radius = baseRadius * popScale;

  return {
    palette,
    offsetX,
    offsetY,
    radius,
  };
}

export interface CentipedeBodyVisualContext {
  palette: CentipedePaletteResolved;
  offsetX: number;
  offsetY: number;
  radius: number;
  segmentIndex: number;
}

export function getCentipedeBodyVisualContext(world: CentipedeWorld, entity: Entity): CentipedeBodyVisualContext {
  const config = world.getResource<CentipedeConfig>("GameConfig");
  const palette = getCentipedePalette(world);
  const { offsetX, offsetY } = getSegmentRenderOffset(world, entity);

  const seg = world.getComponent(entity, "CentipedeSegment");
  const total = seg?.totalInChain ?? 12;
  const idx = seg?.segmentIndex ?? 1;

  const headR = (config?.CELL_SIZE ?? 10) * (config?.visual?.segmentRadiusHead ?? 0.55);
  const tailR = (config?.CELL_SIZE ?? 10) * (config?.visual?.segmentRadiusTail ?? 0.30);
  const t = total > 1 ? idx / (total - 1) : 0;
  const radius = headR - t * (headR - tailR);

  return {
    palette,
    offsetX,
    offsetY,
    radius,
    segmentIndex: idx,
  };
}

export interface MushroomVisualContext {
  palette: CentipedePaletteResolved;
  isPoisoned: boolean;
  hp: number;
  scale: number;
  baseCapColor: string;
  quality: string;
}

export function getMushroomVisualContext(world: CentipedeWorld, entity: Entity): MushroomVisualContext {
  const config = world.getResource<CentipedeConfig>("GameConfig");
  const palette = getCentipedePalette(world);

  const mushroom = world.getComponent(entity, "Mushroom");
  const vis = world.getComponent(entity, "MushroomVisual");

  const isPoisoned = mushroom?.isPoisoned ?? false;
  const hp = mushroom?.hp ?? 4;
  const hashSeed = mushroom?.hashSeed ?? 0;
  const scale = vis?.growProgress ?? 1.0;

  const baseCapColor = isPoisoned
    ? palette.toxin
    : (hashSeed % 2 === 0 ? palette.mushroomA : palette.mushroomB);

  return {
    palette,
    isPoisoned,
    hp,
    scale,
    baseCapColor,
    quality: config?.visual?.quality ?? "high",
  };
}
