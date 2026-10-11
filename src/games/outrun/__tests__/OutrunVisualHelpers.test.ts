import {
  computeOutrunCloudGeometry,
  computeOutrunHeatHazeGeometry,
  computeOutrunFacetedPeakGeometry,
  computeOutrunCoastBuildingGeometry,
  computeOutrunDesertHillGeometry,
  computeOutrunMountainCliffGeometry,
  computeOutrunPalmFrondGeometry,
  computeSegmentBands,
  computeSpriteDrawPosition,
  computeOffroadDustParticle
} from "../rendering/OutrunVisualHelpers";
import { COAST_PALETTE, applyDayPhase } from "../rendering/OutrunPalettes";
import type { ProjectedSegment, RoadSegmentSprite } from "../types/OutrunTypes";

describe("OutrunVisualHelpers Geometry Determinism", () => {
  it("computeOutrunCloudGeometry produces deterministic cloud positions", () => {
    const cloud1 = computeOutrunCloudGeometry(0, 800, 600, 100, 0);
    const cloud2 = computeOutrunCloudGeometry(0, 800, 600, 100, 0);
    expect(cloud1).toEqual(cloud2);
    expect(cloud1.cloudX).toBeGreaterThanOrEqual(0);
    expect(cloud1.cloudX).toBeLessThan(800);
  });

  it("computeOutrunHeatHazeGeometry produces wave offset", () => {
    const line1 = computeOutrunHeatHazeGeometry(0, 18, 800, 0, 100);
    const line2 = computeOutrunHeatHazeGeometry(0, 18, 800, 0, 100);
    expect(line1).toEqual(line2);
  });

  it("computeOutrunFacetedPeakGeometry generates peak positions", () => {
    const peak1 = computeOutrunFacetedPeakGeometry(0, 200, 50, 270, "coast");
    const peak2 = computeOutrunFacetedPeakGeometry(0, 200, 50, 270, "coast");
    expect(peak1).toEqual(peak2);
  });

  it("computeOutrunCoastBuildingGeometry generates building dimensions", () => {
    const b1 = computeOutrunCoastBuildingGeometry(0, 100, 20);
    expect(b1.bw).toBeGreaterThan(0);
    expect(b1.bh).toBeGreaterThan(0);
  });

  it("computeOutrunDesertHillGeometry and MountainCliff generate geometry", () => {
    const hill = computeOutrunDesertHillGeometry(1, 200, 30);
    const cliff = computeOutrunMountainCliffGeometry(1, 150, 25);
    expect(hill.hHeight).toBeGreaterThan(0);
    expect(cliff.mw).toBeGreaterThan(0);
  });

  it("computeOutrunPalmFrondGeometry distributes fronds around top point", () => {
    const frond0 = computeOutrunPalmFrondGeometry(0, 6, 10, -80);
    const frond3 = computeOutrunPalmFrondGeometry(3, 6, 10, -80);
    expect(frond0.angle).toBe(0);
    expect(frond3.angle).toBeCloseTo(Math.PI);
  });

  it("computeSegmentBands computes road band styles and widths correctly", () => {
    const palette = applyDayPhase(COAST_PALETTE, 0.5);
    const proj: ProjectedSegment = {
      index: 0,
      p1z: 10,
      p2z: 20,
      x1: 400,
      y1: 300,
      w1: 100,
      x2: 400,
      y2: 320,
      w2: 120,
      curve: 2.0,
      clip: 600,
      fog: 0.5
    };
    const bands = computeSegmentBands(proj, palette, 3, 600);
    expect(bands.rumbleW1).toBeCloseTo(115);
    expect(bands.hasInnerDarkening).toBe(true);
    expect(bands.innerSide).toBe(1);
    expect(bands.hasFog).toBe(true);
  });

  it("computeSpriteDrawPosition calculates side offset and visibility", () => {
    const sp: RoadSegmentSprite = { kind: "palm", offset: 1.5, side: -1 };
    const proj: ProjectedSegment = {
      index: 0,
      p1z: 10,
      p2z: 20,
      x1: 400,
      y1: 300,
      w1: 100,
      x2: 400,
      y2: 320,
      w2: 120,
      curve: 0,
      clip: 500,
      fog: 0
    };
    const pos = computeSpriteDrawPosition(sp, proj);
    expect(pos.sx).toBe(400 - 150);
    expect(pos.visible).toBe(true);
  });

  it("computeOffroadDustParticle calculates dust particle offset and radius", () => {
    const dust = computeOffroadDustParticle(0, 100, 0.8);
    expect(dust.radius).toBeGreaterThan(0);
    expect(dust.alpha).toBeGreaterThanOrEqual(0);
  });
});
