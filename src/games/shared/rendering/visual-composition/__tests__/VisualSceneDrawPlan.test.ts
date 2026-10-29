import type { ResolvedVisualScene } from "../VisualCompositionTypes";
import { forEachVisualSceneDrawItem, getVisualSceneAssetIds } from "../VisualSceneDrawPlan";

describe("renderer-neutral scene draw plan", () => {
  const scene: ResolvedVisualScene = {
    schemaVersion: 1,
    levelId: "test.village",
    themeId: "sumi-e",
    instances: [],
    repeaters: [{
      id: "village/houses",
      layerId: "village",
      layerRole: "settlement",
      layerOrder: 10,
      space: "parallax",
      parallaxFactor: 0.5,
      assets: [
        { id: "house-a", anchor: { x: 0.5, y: 1 } },
        { id: "house-b", anchor: { x: 0.5, y: 1 } }
      ],
      start: { x: 0, y: 300 },
      spacing: 100,
      scale: { x: 0.5, y: 0.5 },
      opacity: 0.7
    }]
  };

  it("emits visible repeat indices plus overscan in stable order", () => {
    const draw = () => {
      const items: Array<{ assetId: string; x: number; y: number; scaleX: number; opacity: number }> = [];
      const complete = forEachVisualSceneDrawItem(scene, { x: 150, y: 0 }, { x: 0, y: 0 }, 250, item => {
        items.push({
          assetId: item.assetId,
          x: item.position.x,
          y: item.position.y,
          scaleX: item.scaleX,
          opacity: item.opacity
        });
        return true;
      });
      expect(complete).toBe(true);
      return items;
    };
    const first = draw();
    expect(first.map(item => item.x)).toEqual([-75, 25, 125, 225, 325]);
    expect(first.map(item => item.assetId)).toEqual(draw().map(item => item.assetId));
    expect(first.every(item => item.y === 300 && item.scaleX === 0.5 && item.opacity === 0.7)).toBe(true);
  });

  it("deduplicates preloaded asset IDs across static and repeated items", () => {
    expect(getVisualSceneAssetIds({
      ...scene,
      instances: [{
        id: "static/house",
        asset: "house-a",
        layerId: "static",
        layerRole: "settlement",
        layerOrder: 0,
        instanceOrder: 0,
        space: "world",
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        opacity: 1,
        flipX: false,
        anchor: { x: 0.5, y: 1 }
      }]
    })).toEqual(["house-a", "house-b"]);
  });
});
