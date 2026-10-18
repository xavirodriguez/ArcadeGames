import { projectRoad, createProjectionBuffer } from "../rendering/RoadProjection";
import type { RoadSegment } from "../types/OutrunTypes";

function makeStraightRoad(count: number, length = 200): RoadSegment[] {
  const segs: RoadSegment[] = [];
  for (let i = 0; i < count; i++) {
    segs.push({ index: i, length, curve: 0, hill: 0 });
  }
  return segs;
}

describe("projectRoad", () => {
  const screenW = 800;
  const screenH = 600;
  const cameraHeight = 1000;
  const cameraDepth = 0.84;
  const roadWidth = 2000;
  const drawDistance = 100;

  it("straight road produces symmetric perspective", () => {
    const segments = makeStraightRoad(200);
    const out = createProjectionBuffer(drawDistance);
    const count = projectRoad(
      segments, 0, 0, cameraHeight, cameraDepth, roadWidth, drawDistance, screenW, screenH, out
    );
    expect(count).toBeGreaterThan(10);
    const near = out[0];
    const far = out[Math.min(count - 1, 50)];
    expect(near.w1).toBeGreaterThan(far.w1);
    for (let i = 0; i < Math.min(count, 30); i++) {
      expect(Math.abs(out[i].x1 - screenW / 2)).toBeLessThan(screenW * 0.15);
    }
  });

  it("projects road width and curvature in world-space units", () => {
    const segments = makeStraightRoad(40);
    segments[0].curve = 4;
    const out = createProjectionBuffer(40);
    const count = projectRoad(
      segments, 0, 0, cameraHeight, cameraDepth, roadWidth, 40, screenW, screenH, out
    );

    expect(count).toBe(40);

    // At z=1200, half-width = (cameraDepth / z) * roadWidth * screenW / 2.
    expect(out[6].w1).toBeCloseTo((cameraDepth / 1200) * roadWidth * (screenW / 2), 8);
    expect(out[6].w1).toBeGreaterThan(out[20].w1);

    // Curve offsets are world-space values too; they must not be divided by roadWidth.
    expect(out[2].x1).toBeGreaterThan(screenW / 2 + 1);
  });

  it("curve produces progressive horizontal displacement", () => {
    const segments: RoadSegment[] = [];
    for (let i = 0; i < 100; i++) {
      segments.push({ index: i, length: 200, curve: 4, hill: 0 });
    }
    const out = createProjectionBuffer(drawDistance);
    const count = projectRoad(
      segments, 0, 0, cameraHeight, cameraDepth, roadWidth, drawDistance, screenW, screenH, out
    );
    expect(count).toBeGreaterThan(5);
    const nearX = out[2].x1;
    const farX = out[Math.min(count - 1, 40)].x1;
    expect(Math.abs(farX - screenW / 2)).toBeGreaterThan(Math.abs(nearX - screenW / 2) * 0.5);
  });

  it("hill produces vertical variation", () => {
    const flat = makeStraightRoad(80);
    const hilly: RoadSegment[] = [];
    for (let i = 0; i < 80; i++) {
      hilly.push({ index: i, length: 200, curve: 0, hill: 3 });
    }
    const outFlat = createProjectionBuffer(drawDistance);
    const outHill = createProjectionBuffer(drawDistance);
    projectRoad(flat, 0, 0, cameraHeight, cameraDepth, roadWidth, drawDistance, screenW, screenH, outFlat);
    projectRoad(hilly, 0, 0, cameraHeight, cameraDepth, roadWidth, drawDistance, screenW, screenH, outHill);
    let differed = false;
    for (let i = 5; i < 40; i++) {
      if (Math.abs(outFlat[i].y1 - outHill[i].y1) > 1) {
        differed = true;
        break;
      }
    }
    expect(differed).toBe(true);
  });

  it("wraps segment indices circularly", () => {
    const segments = makeStraightRoad(20, 200);
    const out = createProjectionBuffer(60);
    const playerZ = 19 * 200 + 100;
    const count = projectRoad(
      segments, playerZ, 0, cameraHeight, cameraDepth, roadWidth, 60, screenW, screenH, out
    );
    expect(count).toBeGreaterThan(10);
    const indices = out.slice(0, count).map((p) => p.index);
    expect(indices.some((i) => i < 5)).toBe(true);
    expect(indices.some((i) => i > 10)).toBe(true);
  });

  it("same input produces same output (determinism)", () => {
    const segments = makeStraightRoad(100);
    for (let i = 20; i < 40; i++) segments[i].curve = 2;
    for (let i = 50; i < 70; i++) segments[i].hill = -1.5;
    const out1 = createProjectionBuffer(drawDistance);
    const out2 = createProjectionBuffer(drawDistance);
    const c1 = projectRoad(segments, 1234.5, 0.25, cameraHeight, cameraDepth, roadWidth, drawDistance, screenW, screenH, out1);
    const c2 = projectRoad(segments, 1234.5, 0.25, cameraHeight, cameraDepth, roadWidth, drawDistance, screenW, screenH, out2);
    expect(c1).toBe(c2);
    for (let i = 0; i < c1; i++) {
      expect(out1[i].x1).toBeCloseTo(out2[i].x1, 8);
      expect(out1[i].y1).toBeCloseTo(out2[i].y1, 8);
      expect(out1[i].w1).toBeCloseTo(out2[i].w1, 8);
      expect(out1[i].index).toBe(out2[i].index);
    }
  });

  it("handles near-plane straddling segments (p1z <= 0 < p2z) cleanly without non-finite coordinates (T0.2 fixture 5 / T1.1)", () => {
    const segments = makeStraightRoad(10, 200);
    const out = createProjectionBuffer(10);
    // Camera placed mid-segment so segment 0 has rawP1z = -100 and rawP2z = 100
    const playerZ = 100;
    const count = projectRoad(
      segments, playerZ, 0, cameraHeight, cameraDepth, roadWidth, 10, screenW, screenH, out
    );
    expect(count).toBe(10);
    const straddling = out[0];
    expect(straddling.p1z).toBeGreaterThan(0); // Clipped to NEAR_PLANE (0.5)
    expect(Number.isFinite(straddling.x1)).toBe(true);
    expect(Number.isFinite(straddling.y1)).toBe(true);
    expect(Number.isFinite(straddling.w1)).toBe(true);
    expect(Number.isFinite(straddling.x2)).toBe(true);
    expect(Number.isFinite(straddling.y2)).toBe(true);
    expect(Number.isFinite(straddling.w2)).toBe(true);
  });

  it("tracks hill crest horizon occlusion clipY (T0.2 fixture 4 / T1.2)", () => {
    const segments: RoadSegment[] = [];
    // Up-hill section followed by down-hill section (crest)
    for (let i = 0; i < 20; i++) segments.push({ index: i, length: 200, curve: 0, hill: 4 });
    for (let i = 20; i < 40; i++) segments.push({ index: i, length: 200, curve: 0, hill: -4 });

    const out = createProjectionBuffer(40);
    const count = projectRoad(
      segments, 0, 0, cameraHeight, cameraDepth, roadWidth, 40, screenW, screenH, out
    );
    expect(count).toBe(40);

    // Verify clip is updated at the crest
    let minClip = screenH;
    for (let i = 0; i < count; i++) {
      expect(out[i].clip).toBeLessThanOrEqual(minClip);
      if (out[i].clip < minClip) {
        minClip = out[i].clip;
      }
    }
    expect(minClip).toBeLessThan(screenH);
  });

  it("maintains continuous lateral displacement across segment boundaries in curve (T0.2 fixture 6 / T2.3)", () => {
    const segments: RoadSegment[] = [];
    for (let i = 0; i < 20; i++) segments.push({ index: i, length: 200, curve: 3, hill: 0 });

    const out1 = createProjectionBuffer(10);
    const out2 = createProjectionBuffer(10);

    // Compare playerZ = 190 (near end of seg 0) and playerZ = 210 (just inside seg 1)
    projectRoad(segments, 190, 0, cameraHeight, cameraDepth, roadWidth, 10, screenW, screenH, out1);
    projectRoad(segments, 210, 0, cameraHeight, cameraDepth, roadWidth, 10, screenW, screenH, out2);

    // Delta between adjacent steps (20 world units of Z advancement)
    const deltaX = Math.abs(out1[0].x1 - out2[0].x1);
    expect(deltaX).toBeLessThan(50); // Continuous movement, no abrupt jump
  });

  it("geometric baseline: verifies fixed projected segment coordinates (T0.3)", () => {
    const segments: RoadSegment[] = [
      { index: 0, length: 200, curve: 0, hill: 0 },
      { index: 1, length: 200, curve: 2, hill: 1 },
      { index: 2, length: 200, curve: 4, hill: -1 },
      { index: 3, length: 200, curve: 0, hill: 0 },
      { index: 4, length: 200, curve: -2, hill: 0 },
      { index: 5, length: 200, curve: 0, hill: 0 }
    ];
    const out = createProjectionBuffer(6);
    const count = projectRoad(segments, 0, 0, cameraHeight, cameraDepth, roadWidth, 6, screenW, screenH, out);

    expect(count).toBe(6);
    const baseline = out.slice(0, 6).map((p) => ({
      index: p.index,
      x1: Math.round(p.x1),
      y1: Math.round(p.y1),
      w1: Math.round(p.w1),
      x2: Math.round(p.x2),
      y2: Math.round(p.y2),
      w2: Math.round(p.w2),
      clip: Math.round(p.clip)
    }));

    expect(baseline).toEqual([
      { index: 0, x1: 400, y1: 504300, w1: 1344000, x2: 400, y2: 1560, w2: 3360, clip: 600 },
      { index: 1, x1: 400, y1: 1560, w1: 3360, x2: 400, y2: 930, w2: 1680, clip: 600 },
      { index: 2, x1: 400, y1: 930, w1: 1680, x2: 401, y2: 720, w2: 1120, clip: 600 },
      { index: 3, x1: 401, y1: 720, w1: 1120, x2: 403, y2: 615, w2: 840, clip: 600 },
      { index: 4, x1: 403, y1: 615, w1: 840, x2: 406, y2: 552, w2: 672, clip: 600 },
      { index: 5, x1: 406, y1: 552, w1: 672, x2: 410, y2: 510, w2: 560, clip: 552 }
    ]);
  });
});
