import { getSumiEVillageHousePlacements, type SumiEVillageHousePlacement } from "../SumiEVillageLayer";

describe("Sumi-e village background", () => {
  it("reuses a small set of house sizes across distinct depth layers", () => {
    const houses = getSumiEVillageHousePlacements(800, 600, 0);
    const scales = [...new Set(houses.map((house: SumiEVillageHousePlacement) => house.scale))].sort();

    expect(scales).toEqual([0.34, 0.52, 0.72]);
    expect(houses.length).toBeGreaterThan(8);
    expect(houses.every((house: SumiEVillageHousePlacement) => house.alpha > 0 && house.alpha < 1)).toBe(true);
  });

  it("keeps placements deterministic and moves each layer at its own parallax rate", () => {
    const first = getSumiEVillageHousePlacements(800, 600, 125);
    const second = getSumiEVillageHousePlacements(800, 600, 125);
    const moved = getSumiEVillageHousePlacements(800, 600, 225);

    expect(first).toEqual(second);
    expect(moved).not.toEqual(first);
    expect(new Set(first.map((house: SumiEVillageHousePlacement) => house.depth)).size).toBe(3);
  });
});
