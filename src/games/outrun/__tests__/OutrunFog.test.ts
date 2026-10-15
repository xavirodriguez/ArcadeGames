import {
  smoothstep,
  fogIntensity,
  hexToRgb,
  resolveSegmentFog,
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
