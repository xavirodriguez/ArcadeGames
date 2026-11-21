import { resolveOutrunRoadsideArtworkStyle } from "../rendering/OutrunRoadsideArtwork";
import { createVisualPaletteResource, lerpColor } from "../utils/palette";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData, RoadSegmentSprite } from "../types/OutrunTypes";
import {
  smoothstep,
  fogIntensity,
  hexToRgb,
  resolveRoadFogColor
} from "../rendering/OutrunFog";
import {
  COAST_PALETTE,
  DESERT_PALETTE,
  MOUNTAIN_PALETTE
} from "../rendering/OutrunPalettes";

describe("fogIntensity / smoothstep", () => {
  it("smoothstep endpoints and midpoint", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 8);
  });

  it("near camera intensity is ~0; far approaches maxAlpha", () => {
    expect(fogIntensity(0)).toBe(0);
    expect(fogIntensity(0, 0.55)).toBe(0);
    expect(fogIntensity(1, 0.55)).toBeCloseTo(0.55, 8);
    expect(fogIntensity(0.2, 0.55)).toBeLessThan(fogIntensity(0.5, 0.55));
    expect(fogIntensity(0.5, 0.55)).toBeLessThan(fogIntensity(0.9, 0.55));
  });

  it("no hard threshold discontinuity around 0.4", () => {
    const a = fogIntensity(0.39);
    const b = fogIntensity(0.41);
    expect(Math.abs(b - a)).toBeLessThan(0.05);
  });

  it("clamps out-of-range distanceFog", () => {
    expect(fogIntensity(-1)).toBe(0);
    expect(fogIntensity(2, 0.4)).toBeCloseTo(0.4, 8);
  });
});

describe("resolveRoadFogColor", () => {
  it("uses the far sky band and clamps the requested opacity", () => {
    const farBand = COAST_PALETTE.skyBands[COAST_PALETTE.skyBands.length - 1]!;
    const [red, green, blue] = hexToRgb(farBand);

    expect(resolveRoadFogColor(COAST_PALETTE, 0.25)).toBe(
      `rgba(${red}, ${green}, ${blue}, 0.25)`
    );
    expect(resolveRoadFogColor(COAST_PALETTE, -1)).toBe(
      `rgba(${red}, ${green}, ${blue}, 0)`
    );
    expect(resolveRoadFogColor(COAST_PALETTE, 2)).toBe(
      `rgba(${red}, ${green}, ${blue}, 1)`
    );
  });

  it("reads the far sky band from the active visual palette shape", () => {
    expect(resolveRoadFogColor({ skyBands: ["#102030", "#405060"] }, 0.4))
      .toBe("rgba(64, 80, 96, 0.4)");
  });
});

describe("roadside fog parity", () => {
  const roadData: RoadData = {
    trackLength: 100,
    segments: [{ index: 0, length: 100, curve: 0, hill: 0, scenarioId: "coast" }]
  };
  const state: RaceStateComponent = {
    type: "RaceState",
    playerZ: 0,
    playerX: 0,
    speed: 0,
    lapTime: 0,
    isGameOver: false,
    position: 1,
    currentSegment: 0
  };

  it("uses the same depth opacity as road-strip fog, not the old independent haze mix", () => {
    const baseVisual = createVisualPaletteResource(state, roadData, DEFAULT_OUTRUN_CONFIG);
    const visual = {
      ...baseVisual,
      tuning: {
        ...baseVisual.tuning,
        decor: { ...baseVisual.tuning.decor, distantObjectHazeMix: 0.05 }
      }
    };
    const depth = 0.63;
    const sprite: RoadSegmentSprite = { offset: 2, side: 1, kind: "tree" };
    const style = resolveOutrunRoadsideArtworkStyle(sprite, visual, depth, 80, false);
    const sharedAlpha = fogIntensity(depth);

    expect(style.foliageColor).toBe(
      lerpColor(baseVisual.tokens.foliage, baseVisual.tokens.horizon, sharedAlpha)
    );
  });

  it("derives the road fog gradient from the same shared intensity", () => {
    for (const palette of [COAST_PALETTE, DESERT_PALETTE, MOUNTAIN_PALETTE]) {
      const farStop = resolveRoadFogColor(palette, fogIntensity(1));
      const nearStop = resolveRoadFogColor(palette, fogIntensity(0));

      expect(farStop).not.toBe(nearStop);
      expect(farStop.endsWith(", 0.55)")).toBe(true);
      expect(nearStop.endsWith(", 0)")).toBe(true);
    }
  });
});
