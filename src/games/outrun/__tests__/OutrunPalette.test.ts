import {
  groundColorAtDepth,
  kerbColorForPalette,
  lerpColor,
  paletteAtProgress,
  paletteForHour,
  roadColorAtDepth,
  skyBandsForPalette,
  stageAtProgress
} from "../utils/palette";
import { DEFAULT_OUTRUN_VISUAL_CONFIG } from "../config/visualDefaults";
import type { OutrunPaletteTokens, OutrunTimedPaletteSet } from "../types/OutrunVisualTypes";

const visual = DEFAULT_OUTRUN_VISUAL_CONFIG;
const defaultTimedPalettes: OutrunTimedPaletteSet = {
  dawn: visual.palette.dawn,
  noon: visual.palette.noon,
  afternoon: visual.palette.afternoon,
  night: visual.palette.night
};

function stageContext(hour: "dawn" | "noon" | "afternoon" | "twilight" | "night" = "afternoon") {
  return {
    current: { hour, decor: "sierra" as const },
    next: { hour: "night" as const, decor: "coast" as const },
    palette: visual.palette,
    paletteColorblind: visual.paletteColorblind,
    paletteMode: "default" as const,
    transitionFraction: visual.transitionFraction
  };
}

function relativeLuminance(hex: string): number {
  const raw = hex.slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(raw.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(colorA: string, colorB: string): number {
  const [lighter, darker] = [relativeLuminance(colorA), relativeLuminance(colorB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Out Run visual palette", () => {
  it("derives twilight as an exact 50% afternoon/night mix", () => {
    const twilight = paletteForHour("twilight", defaultTimedPalettes);
    expect(twilight.skyHigh).toBe(lerpColor(visual.palette.afternoon.skyHigh, visual.palette.night.skyHigh, 0.5));
    expect(twilight.roadNear).toBe(lerpColor(visual.palette.afternoon.roadNear, visual.palette.night.roadNear, 0.5));
    expect(twilight.kerbB).toBe(lerpColor(visual.palette.afternoon.kerbB, visual.palette.night.kerbB, 0.5));
  });

  it("builds seven sky bands from the four anchor tokens", () => {
    const palette = visual.palette.afternoon;
    const bands = skyBandsForPalette(palette);
    expect(bands).toHaveLength(7);
    expect(bands[0]).toBe(palette.skyHigh);
    expect(bands[2]).toBe(palette.skyMid);
    expect(bands[4]).toBe(palette.skyLow);
    expect(bands[6]).toBe(palette.horizon);
    expect(bands[1]).toBe(lerpColor(bands[0], bands[2], 0.5));
    expect(bands[3]).toBe(lerpColor(bands[2], bands[4], 0.5));
    expect(bands[5]).toBe(lerpColor(bands[4], bands[6], 0.5));
  });

  it("uses linear near/far haze and lightens odd strips by 5%", () => {
    const palette = visual.palette.afternoon;
    expect(groundColorAtDepth(palette, 0, 0)).toBe(palette.groundNear);
    expect(groundColorAtDepth(palette, 1, 0)).toBe(palette.groundFar);
    expect(roadColorAtDepth(palette, 0, 0)).toBe(palette.roadNear);
    expect(roadColorAtDepth(palette, 1, 0)).toBe(palette.roadFar);
    expect(groundColorAtDepth(palette, 0, 1)).toBe(lerpColor(palette.groundNear, "#FFFFFF", 0.05));
    expect(roadColorAtDepth(palette, 0, 1)).toBe(lerpColor(palette.roadNear, "#FFFFFF", 0.05));
  });

  it("keeps a pure palette before the transition and blends smoothly in the last 15%", () => {
    const stage = stageContext("afternoon");
    expect(paletteAtProgress(stage, 0.84)).toEqual(visual.palette.afternoon);
    expect(paletteAtProgress(stage, 0.85)).toEqual(visual.palette.afternoon);
    expect(paletteAtProgress(stage, 0.925).skyHigh).toBe(
      lerpColor(visual.palette.afternoon.skyHigh, visual.palette.night.skyHigh, 0.5)
    );
    expect(paletteAtProgress(stage, 1)).toEqual(visual.palette.night);
    const before = paletteAtProgress(stage, 0.999);
    const atBoundary = paletteAtProgress(stage, 1);
    expect(Math.abs(Number.parseInt(before.roadNear.slice(1), 16) - Number.parseInt(atBoundary.roadNear.slice(1), 16))).toBeLessThan(0xFFFFFF);
  });

  it("keeps the noon dark kerb as a distinct navy token", () => {
    expect(kerbColorForPalette(visual.palette.noon)).toBe("#24408E");
    expect(kerbColorForPalette(visual.palette.noon)).not.toBe(kerbColorForPalette(visual.palette.afternoon));
  });

  it("maintains at least 3:1 player-car/road contrast in all five hours", () => {
    const hours = ["dawn", "noon", "afternoon", "twilight", "night"] as const;
    for (const hour of hours) {
      const palette = paletteForHour(hour, defaultTimedPalettes);
      expect(contrastRatio(visual.palette.shared.car, palette.roadNear)).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the same deterministic stage mapping for the same progress", () => {
    const stages = visual.stages;
    expect(stageAtProgress(stages, 0.4)).toEqual(stageAtProgress(stages, 0.4));
    expect(stageAtProgress(stages, 0).stageIndex).toBe(0);
    expect(stageAtProgress(stages, 0.999).stageIndex).toBe(stages.length - 1);
    expect(stageAtProgress(stages, 1).stageIndex).toBe(0);
  });

  it("offers a luminance-oriented colorblind palette with readable road contrast", () => {
    const hours = ["dawn", "noon", "afternoon", "twilight", "night"] as const;
    for (const hour of hours) {
      const palette = paletteForHour(hour, visual.paletteColorblind);
      expect(contrastRatio(visual.palette.shared.car, palette.roadNear)).toBeGreaterThanOrEqual(3);
    }
    expect(paletteForHour("afternoon", visual.paletteColorblind)).not.toEqual(visual.palette.afternoon);
  });
});
