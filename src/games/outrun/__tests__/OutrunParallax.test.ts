import { OutrunGame } from "../OutrunGame";
import {
  computeCurvatureParallaxOffset,
  computeOutrunCurvatureParallaxPx
} from "../rendering/OutrunVisualHelpers";
import { resolveOutrunHorizonContext } from "../rendering/OutrunRenderShared";
import { applyDayPhase, getScenarioPaletteAtZ } from "../rendering/OutrunPalettes";
import { createVisualPaletteResource } from "../utils/palette";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData } from "../types/OutrunTypes";

describe("computeCurvatureParallaxOffset (T3.3)", () => {
  const segLen = 200;
  const trackLength = 2000;

  it("straight road produces 0 parallax offset", () => {
    const straights = Array.from({ length: 10 }, (_, i) => ({
      length: segLen,
      curve: 0
    }));
    const offset = computeCurvatureParallaxOffset(straights, 500, trackLength);
    expect(offset).toBe(0);
    expect(Object.is(offset, 0)).toBe(true);
    expect(Object.is(offset, -0)).toBe(false);
  });

  it("left vs right curve shows exact left/right sign and magnitude symmetry", () => {
    // The offset is measured against the average curvature of the lap, so the
    // fixture mixes straights and curves: a uniformly curved lap has no
    // deviation from its own average.
    const leftCurve = [
      { length: segLen, curve: 0 },
      { length: segLen, curve: -4 },
      { length: segLen, curve: -4 },
      { length: segLen, curve: 0 }
    ];
    const rightCurve = leftCurve.map((segment) => ({ ...segment, curve: -segment.curve }));
    const lapLength = segLen * leftCurve.length;

    const offsetLeft = computeCurvatureParallaxOffset(leftCurve, 600, lapLength, 0.05);
    const offsetRight = computeCurvatureParallaxOffset(rightCurve, 600, lapLength, 0.05);

    expect(offsetLeft).toBeLessThan(0);
    expect(offsetRight).toBeGreaterThan(0);
    expect(Math.abs(offsetLeft)).toBeCloseTo(Math.abs(offsetRight), 8);
  });

  it("is deterministic for identical inputs", () => {
    const segments = [
      { length: 200, curve: 2 },
      { length: 200, curve: 4 },
      { length: 200, curve: -1 },
      { length: 200, curve: 0 }
    ];
    const o1 = computeCurvatureParallaxOffset(segments, 350, 800, 0.05);
    const o2 = computeCurvatureParallaxOffset(segments, 350, 800, 0.05);
    expect(o1).toBe(o2);
  });

  it("wraps cleanly at trackLength boundaries", () => {
    const segments = [
      { length: 200, curve: 3 },
      { length: 200, curve: 1 }
    ];
    const oNearEnd = computeCurvatureParallaxOffset(segments, 390, 400, 0.05);
    const oWrapped = computeCurvatureParallaxOffset(segments, 790, 400, 0.05);
    expect(oNearEnd).toBeCloseTo(oWrapped, 8);
  });

  it("is periodic: the lap start and the lap end share the same offset", () => {
    const segments = [
      { length: 200, curve: 2 },
      { length: 200, curve: -3 },
      { length: 200, curve: 4 },
      { length: 200, curve: 0 }
    ];
    const lapLength = 800;

    expect(computeCurvatureParallaxOffset(segments, 0, lapLength, 0.05)).toBe(0);
    expect(computeCurvatureParallaxOffset(segments, lapLength, lapLength, 0.05)).toBe(0);

    const justBeforeWrap = computeCurvatureParallaxOffset(
      segments,
      lapLength - 1,
      lapLength,
      0.05
    );
    expect(Math.abs(justBeforeWrap)).toBeLessThan(0.05);
  });
});

describe("curvature parallax continuity across the lap close (T3.3)", () => {
  const scale = DEFAULT_OUTRUN_CONFIG.visual.tuning.mountains.parallax.curvatureScale;
  const screenWidth = DEFAULT_OUTRUN_CONFIG.WIDTH;

  it("does not jump by more than 1 px when playerZ wraps around the track", async () => {
    for (let seed = 1; seed <= 10; seed++) {
      const game = new OutrunGame({ seed, headless: true });
      await game.init();
      const road = game.getWorld().getResource<RoadData>("RoadData");
      expect(road).toBeDefined();

      const beforeWrapPx =
        computeCurvatureParallaxOffset(
          road!.segments,
          road!.trackLength - 1,
          road!.trackLength,
          scale
        ) * screenWidth;
      const afterWrapPx =
        computeCurvatureParallaxOffset(road!.segments, 0, road!.trackLength, scale) *
        screenWidth;

      expect(Math.abs(beforeWrapPx - afterWrapPx)).toBeLessThan(1);
    }
  });

  it("derives the pixel offset from the configured curvature scale", () => {
    const roadData: RoadData = {
      trackLength: 800,
      segments: [
        { index: 0, length: 200, curve: 0, hill: 0 },
        { index: 1, length: 200, curve: -4, hill: 0 },
        { index: 2, length: 200, curve: -4, hill: 0 },
        { index: 3, length: 200, curve: 0, hill: 0 }
      ]
    };

    const expected =
      computeCurvatureParallaxOffset(roadData.segments, 600, roadData.trackLength, scale) *
      screenWidth;

    expect(computeOutrunCurvatureParallaxPx(roadData, 600, DEFAULT_OUTRUN_CONFIG)).toBeCloseTo(
      expected,
      10
    );
  });

  it("shares one scale between the scenery parallax and the horizon context", async () => {
    const game = new OutrunGame({ seed: 3, headless: true });
    await game.init();
    const world = game.getWorld();
    const roadData = world.getResource<RoadData>("RoadData")!;
    const config = world.getResource<OutrunConfig>("GameConfig")!;
    const state: RaceStateComponent = { ...game.getGameState(), playerZ: 1200 };
    const visualPalette = createVisualPaletteResource(state, roadData, config);
    const palette = applyDayPhase(
      getScenarioPaletteAtZ(state.playerZ, roadData),
      state.playerZ / roadData.trackLength
    );

    const horizon = resolveOutrunHorizonContext({
      state,
      roadData,
      config,
      screenW: config.WIDTH,
      screenH: config.HEIGHT,
      rumbleLength: config.rumbleLength,
      palette,
      visualPalette
    });

    expect(horizon.curveParallax).toBeCloseTo(
      computeOutrunCurvatureParallaxPx(roadData, state.playerZ, config),
      10
    );
  });
});
