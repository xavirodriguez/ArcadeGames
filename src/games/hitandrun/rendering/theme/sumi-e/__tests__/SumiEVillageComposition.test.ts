import { resolveVisualScene } from "../../../../shared/rendering/visual-composition";
import { getCanvasVisualPosition } from "../../../../shared/rendering/visual-composition/CanvasVisualSceneRenderer";
import { createSumiEVillageCatalog, SUMI_E_VILLAGE_COMPOSITION } from "../SumiEVillageComposition";

describe("declarative Sumi-e village pilot", () => {
  it("resolves a fixed composition with stable IDs and layer order", () => {
    const catalog = createSumiEVillageCatalog();
    const first = resolveVisualScene(SUMI_E_VILLAGE_COMPOSITION, catalog);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.instances.map(instance => instance.layerId)).toEqual([
      "distant-village", "distant-village",
      "village", "village",
      "foreground-village", "foreground-village", "foreground-village"
    ]);
    expect(new Set(first.value.instances.map(instance => instance.id)).size).toBe(7);
    expect(first.value.instances.every(instance => instance.asset === "tower_basic_art")).toBe(true);
  });

  it("applies world, screen and parallax camera semantics in the Canvas adapter", () => {
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "world"
    }, { x: 10, y: 20 })).toEqual({ x: 90, y: 180 });
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "screen"
    }, { x: 10, y: 20 })).toEqual({ x: 100, y: 200 });
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "parallax", parallaxFactor: 0.25
    }, { x: 10, y: 20 })).toEqual({ x: 97.5, y: 195 });
  });
});
