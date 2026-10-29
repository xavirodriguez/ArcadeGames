import { resolveVisualScene } from "../../../../shared/rendering/visual-composition";
import { getCanvasVisualPosition } from "../../../../shared/rendering/visual-composition/CanvasVisualSceneRenderer";
import { getCanvasSpriteLoadState } from "../../../../shared/sprites/SpriteDrawer";
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
  it("reports unregistered sprite assets without creating another cache", () => {
    expect(getCanvasSpriteLoadState("visual-composition-test-missing-asset")).toBe("unregistered");
  });

  it("composes zoom and viewport offsets after world/parallax translation", () => {
    const camera = { x: 10, y: 20, zoom: 2, visualOffsetX: 5, visualOffsetY: -3 };
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "world"
    }, camera)).toEqual({ x: 185, y: 357 });
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "parallax", parallaxFactor: 0.25
    }, camera, { x: 7, y: 11 })).toEqual({ x: 202, y: 398 });
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "screen"
    }, camera)).toEqual({ x: 105, y: 197 });
  });


  it("applies viewport centering after camera/parallax transforms", () => {
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "parallax", parallaxFactor: 0.25
    }, { x: 10, y: 20 }, { x: 40, y: -15 })).toEqual({ x: 137.5, y: 180 });
  });
});
