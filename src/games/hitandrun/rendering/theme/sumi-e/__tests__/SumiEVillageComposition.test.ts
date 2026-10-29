import { resolveVisualScene } from "../../../../shared/rendering/visual-composition";
import { getCanvasVisualPosition } from "../../../../shared/rendering/visual-composition/CanvasVisualSceneRenderer";
import { getCanvasSpriteLoadState } from "../../../../shared/sprites/SpriteDrawer";
import { createSumiEVillageCatalog, SUMI_E_VILLAGE_COMPOSITION } from "../SumiEVillageComposition";

describe("declarative Sumi-e village pilot", () => {
  it("resolves repeated house layers with stable IDs, variation lists, and layer order", () => {
    const catalog = createSumiEVillageCatalog();
    const first = resolveVisualScene(SUMI_E_VILLAGE_COMPOSITION, catalog);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.instances).toHaveLength(0);
    expect(first.value.repeaters?.map(repeater => repeater.layerId)).toEqual([
      "distant-village", "village", "foreground-village"
    ]);
    expect(first.value.repeaters?.map(repeater => repeater.spacing)).toEqual([500, 470, 410]);
    expect(first.value.repeaters?.every(repeater => repeater.assets.length >= 3)).toBe(true);
    expect(first.value.repeaters?.every(repeater => repeater.assets.every(asset => asset.id.startsWith("urban_")))).toBe(true);
    const repeatedAssetIds = new Set(first.value.repeaters?.flatMap(repeater => repeater.assets.map(asset => asset.id)) ?? []);
    expect([...repeatedAssetIds]).toEqual(expect.arrayContaining([
      "urban_casita_01", "urban_casita_02", "urban_casita_04", "urban_casita_05", "urban_casita_07"
    ]));
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
  it("applies parallax zoom and viewport offsets without double-subtracting the camera", () => {
    expect(getCanvasVisualPosition({
      position: { x: 100, y: 200 }, space: "parallax", parallaxFactor: 0.25
    }, { x: 10, y: 20, zoom: 2, visualOffsetX: 5, visualOffsetY: -3 }, { x: 7, y: 11 }))
      .toEqual({ x: 207, y: 398 });
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
    }, camera, { x: 7, y: 11 })).toEqual({ x: 207, y: 398 });
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
