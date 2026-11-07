import { createVFXTimelineSampler, easeProgress, sampleVFXTimeline, resolveVFXPhase, type VFXTimelinePhase } from "../vfx-timeline";
import { sampleVFXRecoil } from "../vfx-motion";
import {
  DeterministicRandom, clamp, deriveSeed, finiteNumber, lerp, smoothstep
} from "../vfx-core";
import {
  ballistic, createContour, createFragments, radiusFromEnergy, sdfCircle, sdfRoundedBox, sminExp, sminPoly, starPoints
} from "../vfx-geometry";
import {
  bayerThreshold, createPerceptualRamp, ditherIndex, hexToRgb, mixOklab, oklabToOklch, oklchToOklab,
  posterize, rasterizeSdf, remapPalette, rgbToHex, rgbToOklab, oklabToRgb, sdfCoverage, upscaleNearest
} from "../vfx-pixel-color";

describe("vfx-core", () => {
  it("rejects non-finite values and invalid intervals", () => {
    expect(() => finiteNumber(Number.NaN, "x")).toThrow(RangeError);
    expect(() => clamp(1, 2, 0)).toThrow(RangeError);
    expect(() => smoothstep(1, 1, 2)).toThrow(RangeError);
  });
  it("keeps interpolation deterministic and smoothstep bounded", () => {
    expect(lerp(2, 4, 0.5)).toBe(3);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
  it("replays the same PRNG stream and derives independent streams", () => {
    const a = new DeterministicRandom(1234), b = new DeterministicRandom(1234);
    expect(Array.from({ length: 16 }, () => a.next())).toEqual(Array.from({ length: 16 }, () => b.next()));
    expect(deriveSeed(1234, 0)).not.toBe(deriveSeed(1234, 1));
  });
});

describe("vfx-geometry", () => {
  it("creates stable contours and stars with the requested topology", () => {
    expect(createContour(10, 8)).toHaveLength(8);
    expect(starPoints(10, 4, 5)).toHaveLength(10);
    expect(() => createContour(10, 2)).toThrow(RangeError);
    expect(() => starPoints(4, 4, 5)).toThrow(RangeError);
  });
  it("implements signed distances and smooth minimum limits", () => {
    expect(sdfCircle({ x: 0, y: 0 }, 5)).toBe(-5);
    expect(sdfRoundedBox({ x: 0, y: 0 }, 4, 3, 1)).toBe(-3);
    expect(sminPoly(2, 3, 0)).toBe(2);
    expect(sminExp(2, 3, 100)).toBeCloseTo(2, 5);
  });
  it("uses closed-form ballistic motion and deterministic fragments", () => {
    expect(ballistic(0, 10, 0, 2)).toBe(20);
    expect(ballistic(0, 0, 10, 1)).toBeCloseTo(5);
    expect(ballistic(0, 0, 10, 1, 1)).toBeCloseTo(10 - 10 * (1 - Math.exp(-1)), 8);
    expect(createFragments(12, 42, 10)).toEqual(createFragments(12, 42, 10));
    expect(createFragments(12, 42, 10)).not.toEqual(createFragments(12, 43, 10));
    expect(radiusFromEnergy(4, 2)).toBe(4);
  });
});

describe("vfx-timeline", () => {
  const phases: VFXTimelinePhase[] = [
    { start: 0, end: 0.2, from: 0, to: 1, easing: "ease-out" },
    { start: 0.4, end: 0.8, from: 1, to: 0.25, easing: "smoothstep" }
  ];
  it("samples arbitrary progress deterministically, including held gaps", () => {
    expect(sampleVFXTimeline(0.1, phases)).toBeCloseTo(0.75);
    expect(sampleVFXTimeline(0.3, phases)).toBe(1);
    expect(sampleVFXTimeline(0.6, phases)).toBeCloseTo(0.625);
    expect(sampleVFXTimeline(1, phases)).toBe(0.25);
  });
  it("clamps progress and validates malformed phase contracts", () => {
    expect(sampleVFXTimeline(-1, phases)).toBe(0);
    expect(sampleVFXTimeline(2, phases)).toBe(0.25);
    expect(() => sampleVFXTimeline(0.5, [])).toThrow(RangeError);
    expect(() => sampleVFXTimeline(0.5, [{ start: 0.5, end: 0.4, from: 0, to: 1 }])).toThrow(RangeError);
    expect(() => sampleVFXTimeline(0.5, [
      { start: 0, end: 0.7, from: 0, to: 1 },
      { start: 0.6, end: 0.9, from: 1, to: 0 }
    ])).toThrow(RangeError);
    expect(() => sampleVFXTimeline(Number.NaN, phases)).toThrow(RangeError);
    expect(() => sampleVFXTimeline(0.1, [
      { start: 0, end: 0.2, from: 0, to: 1 },
      { start: 0.3, end: 0.2, from: 1, to: 0 }
    ])).toThrow(RangeError);
  });
  it("compiles a stable sampler for repeated hot-loop evaluation", () => {
    const phase = { start: 0, end: 1, from: 0, to: 1, easing: "smoothstep" as const };
    const sampler = createVFXTimelineSampler([phase]);
    phase.to = 0.25;
    expect(sampler(0.5)).toBeCloseTo(0.5);
    expect(sampler(0.5)).toBe(sampler(0.5));
  });

  it("resolves semantic phase and normalized local phase progress", () => {
    expect(resolveVFXPhase(0.04)).toEqual({ phase: "contact", phaseT: 1 / 3 });
    expect(resolveVFXPhase(0.32)).toEqual({ phase: "expansion", phaseT: 0.5 });
    expect(resolveVFXPhase(0.6)).toEqual({ phase: "peak", phaseT: 0.5 });
    expect(resolveVFXPhase(0.9)).toEqual({ phase: "dissipation", phaseT: 0.6875 });
    expect(() => resolveVFXPhase(0.5, [])).toThrow(RangeError);
    expect(() => resolveVFXPhase(0.5, [
      { id: "contact", start: 0, end: 0.7 },
      { id: "peak", start: 0.6, end: 1 }
    ])).toThrow(RangeError);
  });
  it("implements bounded easing curves", () => {
    for (const easing of ["linear", "smoothstep", "ease-in", "ease-out", "ease-in-out"] as const) {
      expect(easeProgress(0, easing)).toBe(0);
      expect(easeProgress(1, easing)).toBe(1);
      expect(easeProgress(0.5, easing)).toBeGreaterThanOrEqual(0);
      expect(easeProgress(0.5, easing)).toBeLessThanOrEqual(1);
    }
  });
});

describe("vfx-pixel-color", () => {
  it("round-trips sRGB and OKLab/OKLCH within numerical tolerance", () => {
    const rgb = { r: 0.2, g: 0.55, b: 0.8 };
    const roundTrip = oklabToRgb(rgbToOklab(rgb));
    expect(roundTrip.r).toBeCloseTo(rgb.r, 5);
    expect(roundTrip.g).toBeCloseTo(rgb.g, 5);
    expect(roundTrip.b).toBeCloseTo(rgb.b, 5);
    const lch = oklabToOklch(rgbToOklab(rgb));
    const lab = oklchToOklab(lch);
    expect(lab.L).toBeCloseTo(rgbToOklab(rgb).L, 8);
    expect(mixOklab(rgb, rgb, 0.5).g).toBeCloseTo(rgb.g, 5);
  });
  it("builds deterministic ramps and nearest palette mappings", () => {
    const black = { r: 0, g: 0, b: 0 }, white = { r: 1, g: 1, b: 1 };
    expect(createPerceptualRamp(black, white, 5)).toHaveLength(5);
    expect(remapPalette({ r: 0.02, g: 0.02, b: 0.02 }, [white, black])).toEqual(black);
    expect(rgbToHex({ r: 1, g: 0.5, b: 0 })).toBe("#ff8000");
    expect(hexToRgb("#f80")).toEqual({ r: 1, g: 136 / 255, b: 0 });
  });
  it("quantizes and dithers using a periodic Bayer matrix", () => {
    expect(posterize(0.5, 5)).toBe(0.5);
    expect(bayerThreshold(0, 0)).toBe(bayerThreshold(4, 4));
    expect(ditherIndex(0.5, 4, 1, 2)).toBeGreaterThanOrEqual(0);
    expect(ditherIndex(0.5, 4, 1, 2)).toBeLessThan(4);
  });
  it("rasterizes SDF alpha and upscales RGBA by nearest neighbor", () => {
    const mask = rasterizeSdf(3, 3, (x, y) => Math.hypot(x - 1.5, y - 1.5) - 1);
    expect(mask).toHaveLength(9);
    expect(mask[4]).toBe(255);
    expect(sdfCoverage(-1)).toBe(1);
    const image = upscaleNearest(new Uint8Array([1, 2, 3, 4]), 1, 1, 2);
    expect(image.width).toBe(2);
    expect(Array.from(image.data)).toEqual([1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4]);
    expect(() => upscaleNearest(new Uint8Array(3), 1, 1, 2)).toThrow(RangeError);
  });
});

describe("vfx-motion", () => {
  it("replays identical recoil samples for the same seed and progress", () => {
    const samples = [0, 0.04, 0.1, 0.18, 0.32, 0.58, 0.88, 1];
    expect(samples.map((p) => sampleVFXRecoil(p, 1234)))
      .toEqual(samples.map((p) => sampleVFXRecoil(p, 1234)));
    expect(samples.map((p) => sampleVFXRecoil(p, 1234)))
      .not.toEqual(samples.map((p) => sampleVFXRecoil(p, 4321)));
  });
  it("keeps recoil finite and bounded over normalized progress", () => {
    for (let i = 0; i <= 100; i++) {
      const value = sampleVFXRecoil(i / 100, 77);
      expect(Number.isFinite(value)).toBe(true);
      expect(Math.abs(value)).toBeLessThan(0.25);
    }
  });
});
