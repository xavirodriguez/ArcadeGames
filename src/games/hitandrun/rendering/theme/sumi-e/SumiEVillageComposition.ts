import type { LevelVisualDefinition, VisualCompositionCatalog } from "../../../../shared/rendering/visual-composition";
import { SpriteRegistry } from "../../../../shared/sprites/SpriteRegistry";

/**
 * Camera-aware settlement scenery.
 * Each layer cycles through static urban art at stable world-space positions.
 */
export const SUMI_E_VILLAGE_COMPOSITION: LevelVisualDefinition = {
  schemaVersion: 1,
  id: "hitandrun.sumi-e.village",
  theme: "sumi-e",
  layers: [
    {
      id: "distant-village",
      role: "far-background",
      order: 10,
      space: "parallax",
      parallaxFactor: 0.18,
      items: [],
      repeaters: [{
        id: "distant-houses",
        assets: ["urban_small_houses", "urban_house_01", "urban_house_03"],
        start: { x: -260, y: 350 },
        spacing: 500,
        scale: { x: 0.42, y: 0.42 },
        opacity: 0.34
      }]
    },
    {
      id: "village",
      role: "settlement",
      order: 20,
      space: "parallax",
      parallaxFactor: 0.36,
      items: [],
      repeaters: [{
        id: "village-houses",
        assets: ["urban_house_01", "urban_house_03", "urban_house_04", "urban_large_house"],
        start: { x: -180, y: 440 },
        spacing: 470,
        scale: { x: 0.68, y: 0.68 },
        opacity: 0.56
      }]
    },
    {
      id: "foreground-village",
      role: "foreground",
      order: 30,
      space: "parallax",
      parallaxFactor: 0.58,
      items: [],
      repeaters: [{
        id: "foreground-houses",
        assets: ["urban_big_house", "urban_large_house", "urban_house_04", "urban_house_03"],
        start: { x: -320, y: 535 },
        spacing: 410,
        scale: { x: 0.88, y: 0.88 },
        opacity: 0.78
      }]
    }
  ]
};

/** Adapter over the existing registry: no duplicate image cache or asset catalog. */
export function createSumiEVillageCatalog(): VisualCompositionCatalog {
  SpriteRegistry.init();
  return {
    themes: new Set(["sumi-e"]),
    assets: {
      getAsset(id) {
        const sheet = SpriteRegistry.get(id);
        if (!sheet) return undefined;
        const anchor = sheet.anchor;
        const semanticAnchor = !anchor || (anchor.x === 0.5 && anchor.y === 1)
          ? "bottom-center"
          : anchor.x === 0.5 && anchor.y === 0.5
            ? "center"
            : anchor.x === 0 && anchor.y === 0
              ? "top-left"
              : undefined;
        if (semanticAnchor) return { id: sheet.id, assetPath: sheet.assetPath, sourceMode: sheet.sourceMode, nominalSize: { width: sheet.frameWidth, height: sheet.frameHeight }, anchor: semanticAnchor };
        return anchor
          ? { id: sheet.id, assetPath: sheet.assetPath, sourceMode: sheet.sourceMode, nominalSize: { width: sheet.frameWidth, height: sheet.frameHeight }, anchor: "unsupported-registry-anchor" as never }
          : { id: sheet.id, assetPath: sheet.assetPath, sourceMode: sheet.sourceMode, nominalSize: { width: sheet.frameWidth, height: sheet.frameHeight } };
      }
    }
  };
}
