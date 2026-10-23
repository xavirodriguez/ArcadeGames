import {
  createIcebergVerts,
  ICEBREAKER_HULL_VERTS,
  ICEBREAKER_DECK_VERTS,
  scaleVerts
} from "../mods/iceberg/IcebergGeometry";
import { buildFacets, buildFanFacets } from "../mods/iceberg/IcebergFacets";
import { iceToneColor, ICEBERG_PALETTE } from "../mods/iceberg/IcebergPalette";
import { icebergMod } from "../mods/iceberg/IcebergMod";

function seqRandom(seedValues: number[]): () => number {
  let i = 0;
  return () => {
    const v = seedValues[i % seedValues.length];
    i += 1;
    return v;
  };
}

describe("IcebergGeometry (Phase 1)", () => {
  it("createIcebergVerts is deterministic for the same random stream", () => {
    const stream = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.15, 0.25, 0.35];
    const a = createIcebergVerts("large", 40, seqRandom(stream));
    const b = createIcebergVerts("large", 40, seqRandom(stream));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a.length).toBeLessThanOrEqual(12);
  });

  it("small icebergs are sharp (3–4 verts)", () => {
    const verts = createIcebergVerts("small", 10, seqRandom([0.5, 0.2, 0.8, 0.1, 0.9, 0.3]));
    expect(verts.length).toBeGreaterThanOrEqual(3);
    expect(verts.length).toBeLessThanOrEqual(4);
  });

  it("medium icebergs use 6–8 verts", () => {
    const verts = createIcebergVerts("medium", 20, seqRandom([0.4, 0.6, 0.1, 0.9, 0.2, 0.7, 0.3, 0.8, 0.5]));
    expect(verts.length).toBeGreaterThanOrEqual(6);
    expect(verts.length).toBeLessThanOrEqual(8);
  });

  it("verts stay roughly within radius band", () => {
    const radius = 40;
    const verts = createIcebergVerts("large", radius, seqRandom([0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 0.99, 0.05]));
    for (const v of verts) {
      const r = Math.hypot(v.x, v.y);
      expect(r).toBeGreaterThan(radius * 0.4);
      expect(r).toBeLessThan(radius * 1.4);
    }
  });

  it("icebreaker hull is closed and bow-forward (+X)", () => {
    expect(ICEBREAKER_HULL_VERTS.length).toBeGreaterThanOrEqual(6);
    const tip = ICEBREAKER_HULL_VERTS[0];
    expect(tip.x).toBeGreaterThan(0.8);
    expect(Math.abs(tip.y)).toBeLessThan(0.05);
  });

  it("scaleVerts multiplies by size", () => {
    const scaled = scaleVerts(ICEBREAKER_DECK_VERTS, 20);
    expect(scaled[0].x).toBeCloseTo(ICEBREAKER_DECK_VERTS[0].x * 20);
  });

  it("icebergMod.createAsteroidVerts delegates to createIcebergVerts", () => {
    expect(icebergMod.createAsteroidVerts).toBeDefined();
    const verts = icebergMod.createAsteroidVerts!("medium", 20, seqRandom([0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7]));
    expect(verts.length).toBeGreaterThanOrEqual(6);
  });
});

describe("IcebergFacets (Phase 1)", () => {
  const square = [
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 }
  ];

  it("buildFacets returns one facet per edge", () => {
    const facets = buildFacets(square);
    expect(facets).toHaveLength(4);
    for (const f of facets) {
      expect(["light", "mid", "dark"]).toContain(f.tone);
    }
  });

  it("buildFanFacets fans from centroid", () => {
    const fans = buildFanFacets(square);
    expect(fans).toHaveLength(4);
  });

  it("iceToneColor maps tones to palette", () => {
    expect(iceToneColor("light")).toBe(ICEBERG_PALETTE.iceLight);
    expect(iceToneColor("mid")).toBe(ICEBERG_PALETTE.iceMid);
    expect(iceToneColor("dark")).toBe(ICEBERG_PALETTE.iceDark);
  });
});
