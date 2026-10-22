import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { createVisualPaletteResource } from "../utils/palette";
import { computeOutrunHeadlightBeams } from "../rendering/OutrunLighting";

const roadData: RoadData = {
  trackLength: 600,
  segments: [
    { index: 0, length: 200, curve: 0, hill: 0 },
    { index: 1, length: 200, curve: 0, hill: 0 },
    { index: 2, length: 200, curve: 0, hill: 0 }
  ]
};

const state: RaceStateComponent = {
  type: "RaceState", playerZ: 0, playerX: 0.1, speed: 6000, lapTime: 12,
  isGameOver: false, position: 1, currentSegment: 0
};

function makeVisual(hour: OutrunVisualPaletteResource["hour"]): OutrunVisualPaletteResource {
  return {
    ...createVisualPaletteResource(state, roadData, DEFAULT_OUTRUN_CONFIG),
    hour
  };
}

describe("Out Run night lighting", () => {
  it("keeps the headlight beams disabled outside night", () => {
    expect(computeOutrunHeadlightBeams(state, DEFAULT_OUTRUN_CONFIG, makeVisual("afternoon"))).toHaveLength(0);
  });

  it("returns two deterministic flat beams in cream at night", () => {
    const visual = makeVisual("night");
    const first = computeOutrunHeadlightBeams(state, DEFAULT_OUTRUN_CONFIG, visual);
    const second = computeOutrunHeadlightBeams(state, DEFAULT_OUTRUN_CONFIG, visual);

    expect(first).toHaveLength(2);
    expect(second).toEqual(first);
    for (const beam of first) {
      expect(beam.points).toHaveLength(3);
      expect(beam.color).toBe(visual.shared.cream);
      expect(beam.alpha).toBe(0.1);
      expect(beam.points.every(point =>
        Number.isFinite(point.x) && Number.isFinite(point.y) &&
        point.y >= visual.tuning.horizonFraction * DEFAULT_OUTRUN_CONFIG.HEIGHT &&
        point.y <= DEFAULT_OUTRUN_CONFIG.HEIGHT
      )).toBe(true);
    }
    expect(first[0]?.points[0]?.x).toBeLessThan(first[1]?.points[0]?.x ?? 0);
  });
});
