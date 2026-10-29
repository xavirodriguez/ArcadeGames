import type { LevelVisualDefinition, VisualCompositionCatalog } from "../../../../shared/rendering/visual-composition";
import { SpriteRegistry } from "../../../../shared/sprites/SpriteRegistry";

/**
 * First fixed-composition pilot for the Sumi-e village.
 * Coordinates are world-space; the renderer applies camera/parallax transforms.
 * Gameplay and entity simulation never depend on this definition.
 */
export const SUMI_E_VILLAGE_COMPOSITION: LevelVisualDefinition = {
  schemaVersion: 1,
  id: "hitandrun.sumi-e.village-pilot",
  theme: "sumi-e",
  layers: [
    {
      id: "distant-village",
      role: "far-background",
      order: 10,
      space: "parallax",
      parallaxFactor: 0.18,
      items: [
        { kind: "instance", instance: { id: "distant-tower-left", asset: "tower_basic_art", position: { x: 90, y: 290 }, scale: { x: 0.46, y: 0.46 }, opacity: 0.34 } },
        { kind: "instance", instance: { id: "distant-tower-right", asset: "tower_basic_art", position: { x: 760, y: 270 }, scale: { x: 0.42, y: 0.42 }, opacity: 0.3 } }
      ]
    },
    {
      id: "village",
      role: "settlement",
      order: 20,
      space: "parallax",
      parallaxFactor: 0.36,
      items: [
        { kind: "instance", instance: { id: "village-tower-left", asset: "tower_basic_art", position: { x: 230, y: 390 }, scale: { x: 0.72, y: 0.72 }, opacity: 0.56 } },
        { kind: "instance", instance: { id: "village-tower-right", asset: "tower_basic_art", position: { x: 620, y: 410 }, scale: { x: 0.68, y: 0.68 }, opacity: 0.52 } }
      ]
    },
    {
      id: "foreground-village",
      role: "foreground",
      order: 30,
      space: "parallax",
      parallaxFactor: 0.58,
      items: [
        { kind: "instance", instance: { id: "foreground-tower-left", asset: "tower_basic_art", position: { x: -70, y: 500 }, scale: { x: 0.9, y: 0.9 }, opacity: 0.78 } },
        { kind: "instance", instance: { id: "foreground-tower-center", asset: "tower_basic_art", position: { x: 400, y: 510 }, scale: { x: 0.84, y: 0.84 }, opacity: 0.76 } },
        { kind: "instance", instance: { id: "foreground-tower-right", asset: "tower_basic_art", position: { x: 850, y: 505 }, scale: { x: 0.88, y: 0.88 }, opacity: 0.78 } }
      ]
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
        if (semanticAnchor) return { id: sheet.id, nominalSize: { width: sheet.frameWidth, height: sheet.frameHeight }, anchor: semanticAnchor };
        return anchor
          ? { id: sheet.id, nominalSize: { width: sheet.frameWidth, height: sheet.frameHeight }, anchor: "unsupported-registry-anchor" as never }
          : { id: sheet.id, nominalSize: { width: sheet.frameWidth, height: sheet.frameHeight } };
      }
    }
  };
}
