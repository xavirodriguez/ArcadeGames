import { resolveOutrunRoadsideArtworkStyle } from "../rendering/OutrunRoadsideArtwork";
import { createVisualPaletteResource, lerpColor } from "../utils/palette";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData, RoadSegmentSprite } from "../types/OutrunTypes";
import {
  smoothstep,
  fogIntensity,
  hexToRgb,
  resolveRoadFogColor,
  resolveSegmentFog
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

describe("resolveSegmentFog", () => {
  it("same inputs → identical decision (Canvas/Skia parity)", () => {
    const a = resolveSegmentFog(0.7, COAST_PALETTE);
    const b = resolveSegmentFog(0.7, COAST_PALETTE);
    expect(a.alpha).toBe(b.alpha);
    expect(a.rgba).toBe(b.rgba);
  });

  it("color tracks far sky-band token of the active palette", () => {
    const coast = resolveSegmentFog(1, COAST_PALETTE);
    const desert = resolveSegmentFog(1, DESERT_PALETTE);
    const mountain = resolveSegmentFog(1, MOUNTAIN_PALETTE);

    const coastFar = COAST_PALETTE.skyBands[COAST_PALETTE.skyBands.length - 1];
    const desertFar = DESERT_PALETTE.skyBands[DESERT_PALETTE.skyBands.length - 1];
    const mountainFar = MOUNTAIN_PALETTE.skyBands[MOUNTAIN_PALETTE.skyBands.length - 1];

    const [cr, cg, cb] = hexToRgb(coastFar);
    const [dr, dg, db] = hexToRgb(desertFar);
    const [mr, mg, mb] = hexToRgb(mountainFar);

    expect(coast.rgba).toContain(`${cr}, ${cg}, ${cb}`);
    expect(desert.rgba).toContain(`${dr}, ${dg}, ${db}`);
    expect(mountain.rgba).toContain(`${mr}, ${mg}, ${mb}`);
    expect(coast.rgba).not.toBe(desert.rgba);
  });

  it("near segment returns zero alpha (skip draw)", () => {
    const near = resolveSegmentFog(0, COAST_PALETTE);
    expect(near.alpha).toBe(0);
  });

  it("never uses the old hardcoded sky-blue outside palette tokens", () => {
    for (const pal of [COAST_PALETTE, DESERT_PALETTE, MOUNTAIN_PALETTE]) {
      const style = resolveSegmentFog(0.8, pal);
      expect(style.rgba.includes("135, 206, 235")).toBe(false);
    }
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

    expect(resolveSegmentFog(depth, COAST_PALETTE).alpha).toBeCloseTo(sharedAlpha, 3);
    expect(style.foliageColor).toBe(
      lerpColor(baseVisual.tokens.foliage, baseVisual.tokens.horizon, sharedAlpha)
    );
  });
});


describe("resolveRoadFogColor palette contract", () => {
  it("reads the far sky band from the active visual palette shape", () => {
    expect(resolveRoadFogColor({ skyBands: ["#102030", "#405060"] }, 0.4))
      .toBe("rgba(64, 80, 96, 0.4)");
  });
});
