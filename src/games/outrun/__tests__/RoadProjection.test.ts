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
});
