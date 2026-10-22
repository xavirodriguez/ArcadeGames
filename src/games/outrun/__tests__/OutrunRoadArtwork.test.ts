import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { ProjectedSegment, RaceStateComponent, RoadData } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import {
  computeOutrunRoadSpeedLineSegments,
  resolveOutrunRoadSegmentArtwork
} from "../rendering/OutrunRoadArtwork";
import { lerpColor } from "../utils/palette";
import { createVisualPaletteResource } from "../utils/palette";

const roadData: RoadData = {
  trackLength: 600,
  segments: [
    { index: 0, length: 200, curve: 0, hill: 0 },
    { index: 1, length: 200, curve: 0, hill: 0 },
    { index: 2, length: 200, curve: 0, hill: 0 }
  ]
};

function makeState(overrides: Partial<RaceStateComponent> = {}): RaceStateComponent {
  return {
    type: "RaceState",
    playerZ: 0,
    playerX: 0,
    speed: 0,
    lapTime: 0,
    isGameOver: false,
    position: 1,
    currentSegment: 0,
    ...overrides
  };
}

function makeVisual(overrides: Partial<OutrunVisualPaletteResource> = {}): OutrunVisualPaletteResource {
  const base = createVisualPaletteResource(makeState(), roadData, DEFAULT_OUTRUN_CONFIG);
  return { ...base, ...overrides };
}

const projectedSegment: ProjectedSegment = {
  x1: 400,
  y1: 600,
  w1: 120,
  x2: 400,
  y2: 276,
  w2: 10,
  curve: 0,
  fog: 0.5,
  clip: 600,
  index: 0,
  p1z: 1,
  p2z: 201
};

describe("Out Run road artwork", () => {
  it("interpolates road and ground from near to far tokens", () => {
    const visual = makeVisual();
    const near = resolveOutrunRoadSegmentArtwork(0, 0, visual);
    const far = resolveOutrunRoadSegmentArtwork(0, 1, visual);

    expect(near.groundColor).toBe(visual.tokens.groundNear);
    expect(near.roadColor).toBe(visual.tokens.roadNear);
    expect(far.groundColor).toBe(visual.tokens.groundFar);
    expect(far.roadColor).toBe(visual.tokens.roadFar);
  });

  it("adds only the configured subtle white mix to odd road stripes", () => {
    const visual = makeVisual();
    const even = resolveOutrunRoadSegmentArtwork(0, 0.5, visual);
    const odd = resolveOutrunRoadSegmentArtwork(1, 0.5, visual);
    const depthGround = lerpColor(visual.tokens.groundNear, visual.tokens.groundFar, 0.5);
    const depthRoad = lerpColor(visual.tokens.roadNear, visual.tokens.roadFar, 0.5);

    expect(odd.groundColor).toBe(lerpColor(depthGround, "#FFFFFF", visual.tuning.road.stripeWhiteMix));
    expect(odd.roadColor).toBe(lerpColor(depthRoad, "#FFFFFF", visual.tuning.road.stripeWhiteMix));
    expect(even.kerbColor).toBe(visual.tokens.kerbB);
    expect(odd.kerbColor).toBe(visual.shared.cream);
    expect(even.drawLane).toBe(true);
    expect(odd.drawLane).toBe(false);
  });

  it("uses the sand blend for desert ground and sea colors only on the coast", () => {
    const base = makeVisual();
    const desert = resolveOutrunRoadSegmentArtwork(0, 0.4, { ...base, decor: "desert" });
    const coast = resolveOutrunRoadSegmentArtwork(0, 0.4, { ...base, decor: "coast" });
    const sierra = resolveOutrunRoadSegmentArtwork(0, 0.4, { ...base, decor: "sierra" });
    const normalGround = lerpColor(base.tokens.groundNear, base.tokens.groundFar, 0.4);

    expect(desert.groundColor).toBe(
      lerpColor(normalGround, base.tuning.decor.desertSandColor, base.tuning.decor.desertGroundMix)
    );
    expect(coast.waterColor).toBe(lerpColor(base.tokens.skyMid, base.tokens.skyLow, 0.4));
    expect(sierra.waterColor).toBeNull();
  });

  it("disables speed lines below the speed threshold and in low quality", () => {
    const high = makeVisual();
    const state = makeState({ speed: DEFAULT_OUTRUN_CONFIG.maxSpeed, lapTime: 4 });
    const args = {
      projectedSegments: [projectedSegment],
      count: 1,
      state,
      config: DEFAULT_OUTRUN_CONFIG,
      visualPalette: high,
      screenW: DEFAULT_OUTRUN_CONFIG.WIDTH,
      screenH: DEFAULT_OUTRUN_CONFIG.HEIGHT,
      horizonY: DEFAULT_OUTRUN_CONFIG.HEIGHT * high.tuning.horizonFraction
    };

    expect(computeOutrunRoadSpeedLineSegments({
      ...args, state: makeState({ speed: DEFAULT_OUTRUN_CONFIG.maxSpeed * 0.5, lapTime: 4 })
    })).toHaveLength(0);
    expect(computeOutrunRoadSpeedLineSegments({
      ...args, visualPalette: { ...high, quality: "low" }
    })).toHaveLength(0);
  });

  it("generates deterministic speed streaks outside the projected kerbs", () => {
    const visual = makeVisual();
    const state = makeState({ speed: DEFAULT_OUTRUN_CONFIG.maxSpeed, lapTime: 4 });
    const args = {
      projectedSegments: [projectedSegment],
      count: 1,
      state,
      config: DEFAULT_OUTRUN_CONFIG,
      visualPalette: visual,
      screenW: DEFAULT_OUTRUN_CONFIG.WIDTH,
      screenH: DEFAULT_OUTRUN_CONFIG.HEIGHT,
      horizonY: DEFAULT_OUTRUN_CONFIG.HEIGHT * visual.tuning.horizonFraction
    };
    const first = computeOutrunRoadSpeedLineSegments(args);
    const second = computeOutrunRoadSpeedLineSegments(args);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
    for (const line of first) {
      expect(line.y1).toBeGreaterThanOrEqual(args.horizonY);
      expect(line.y2).toBeLessThanOrEqual(args.screenH);
      const x = (line.x1 + line.x2) / 2;
      const y = (line.y1 + line.y2) / 2;
      const t = (y - projectedSegment.y2) / (projectedSegment.y1 - projectedSegment.y2);
      const leftEdge = projectedSegment.x2 - projectedSegment.w2 * (1 + visual.tuning.road.kerbWidthToRoadHalfWidth) +
        t * ((projectedSegment.x1 - projectedSegment.w1 * (1 + visual.tuning.road.kerbWidthToRoadHalfWidth)) -
          (projectedSegment.x2 - projectedSegment.w2 * (1 + visual.tuning.road.kerbWidthToRoadHalfWidth)));
      const rightEdge = projectedSegment.x2 + projectedSegment.w2 * (1 + visual.tuning.road.kerbWidthToRoadHalfWidth) +
        t * ((projectedSegment.x1 + projectedSegment.w1 * (1 + visual.tuning.road.kerbWidthToRoadHalfWidth)) -
          (projectedSegment.x2 + projectedSegment.w2 * (1 + visual.tuning.road.kerbWidthToRoadHalfWidth)));
      expect(x <= leftEdge + 0.01 || x >= rightEdge - 0.01).toBe(true);
    }
  });
});
