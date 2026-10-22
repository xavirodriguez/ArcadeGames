import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { createVisualPaletteResource } from "../utils/palette";
import { buildOutrunSceneryLayout, computeParallaxState } from "../rendering/OutrunScenery";

const roadData: RoadData = {
  trackLength: 600,
  segments: [
    { index: 0, length: 200, curve: 1.5, hill: 0 },
    { index: 1, length: 200, curve: -2, hill: 0 },
    { index: 2, length: 200, curve: 0.5, hill: 0 }
  ]
};
function makeState(overrides: Partial<RaceStateComponent> = {}): RaceStateComponent {
  return {
    type: "RaceState", playerZ: 0, playerX: 0, speed: 0, lapTime: 0,
    isGameOver: false, position: 1, currentSegment: 0, ...overrides
  };
}
function makeVisual(overrides: Partial<OutrunVisualPaletteResource> = {}): OutrunVisualPaletteResource {
  const base = createVisualPaletteResource(makeState(), roadData, DEFAULT_OUTRUN_CONFIG);
  return { ...base, ...overrides };
}
describe("Out Run scenery layout", () => {
  it("uses seven flat sky bands at high quality", () => {
    const visual = makeVisual();
    const layout = buildOutrunSceneryLayout(makeState(), DEFAULT_OUTRUN_CONFIG, visual, {
      farOffsetX: 0, midOffsetX: 0, nearOffsetX: 0
    });
    expect(layout.skyBands).toHaveLength(7);
    expect(layout.skyBands[0]?.color).toBe(visual.skyBands[0]);
    expect(layout.skyBands.reduce((sum, band) => sum + band.height, 0)).toBeCloseTo(layout.horizonY);
  });
  it("reduces sky, cloud and star counts in low quality", () => {
    const parallax = { farOffsetX: 0, midOffsetX: 0, nearOffsetX: 0 };
    const high = buildOutrunSceneryLayout(
      makeState(), DEFAULT_OUTRUN_CONFIG, makeVisual({ hour: "night", quality: "high" }), parallax
    );
    const low = buildOutrunSceneryLayout(
      makeState(), DEFAULT_OUTRUN_CONFIG, makeVisual({ hour: "night", quality: "low" }), parallax
    );
    expect(high.skyBands).toHaveLength(7);
    expect(low.skyBands).toHaveLength(4);
    expect(high.clouds.length).toBeGreaterThanOrEqual(4);
    expect(high.clouds.length).toBeLessThanOrEqual(5);
    expect(low.clouds).toHaveLength(2);
    expect(high.stars.length).toBeGreaterThanOrEqual(10);
    expect(high.stars.length).toBeLessThanOrEqual(20);
    expect(low.stars).toHaveLength(5);
  });
  it("shows no stars outside night and keeps positions deterministic", () => {
    const parallax = { farOffsetX: 0, midOffsetX: 0, nearOffsetX: 0 };
    const day = buildOutrunSceneryLayout(
      makeState(), DEFAULT_OUTRUN_CONFIG, makeVisual({ hour: "afternoon" }), parallax
    );
    const nightA = buildOutrunSceneryLayout(
      makeState(), DEFAULT_OUTRUN_CONFIG, makeVisual({ hour: "night" }), parallax
    );
    const nightB = buildOutrunSceneryLayout(
      makeState(), DEFAULT_OUTRUN_CONFIG, makeVisual({ hour: "night" }), parallax
    );
    expect(day.stars).toHaveLength(0);
    expect(nightA.stars).toEqual(nightB.stars);
    expect(nightA.clouds).toEqual(nightB.clouds);
  });
  it("creates three decor-specific mountain layers with cacheable profiles", () => {
    for (const decor of ["sierra", "coast", "desert"] as const) {
      const layout = buildOutrunSceneryLayout(
        makeState(), DEFAULT_OUTRUN_CONFIG, makeVisual({ decor }),
        { farOffsetX: 1, midOffsetX: 2, nearOffsetX: 3 }
      );
      expect(layout.mountainLayers).toHaveLength(3);
      expect(layout.mountainLayers.map(layer => layer.layer)).toEqual(["far", "mid", "near"]);
      expect(layout.mountainLayers.every(layer => layer.profile.length >= 6 && layer.cacheKey.length > 0)).toBe(true);
    }
  });
  it("computes parallax deterministically from curvature and speed", () => {
    const state = makeState({ playerZ: 280, playerX: 0.25, speed: 8000, lapTime: 12 });
    const first = computeParallaxState(state, roadData, DEFAULT_OUTRUN_CONFIG);
    expect(computeParallaxState(state, roadData, DEFAULT_OUTRUN_CONFIG)).toEqual(first);
    expect(first.farOffsetX).not.toBe(first.nearOffsetX);
    expect(computeParallaxState({ ...state, speed: 100 }, roadData, DEFAULT_OUTRUN_CONFIG)).not.toEqual(first);
  });
});
