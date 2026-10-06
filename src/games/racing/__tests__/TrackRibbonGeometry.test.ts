import { buildTrackRibbon, TrackRibbonPoint } from "../rendering/TrackRibbonGeometry";

describe("TrackRibbonGeometry", () => {
  const waypoints: TrackRibbonPoint[] = [
    { x: 800, y: 200, radius: 70 },
    { x: 1220, y: 380, radius: 70 },
    { x: 1220, y: 680, radius: 70 },
    { x: 800, y: 800, radius: 70 },
    { x: 380, y: 680, radius: 70 },
    { x: 380, y: 380, radius: 70 }
  ];

  test("returns valid closed loop geometry with equal point counts for left, right, center", () => {
    const geom = buildTrackRibbon(waypoints, 8);
    expect(geom.center.length).toBe(waypoints.length * 8);
    expect(geom.left.length).toBe(geom.center.length);
    expect(geom.right.length).toBe(geom.center.length);
  });

  test("maintains non-zero track width between left and right points", () => {
    const geom = buildTrackRibbon(waypoints, 8);
    for (let i = 0; i < geom.center.length; i += 1) {
      const l = geom.left[i]!;
      const r = geom.right[i]!;
      const dist = Math.hypot(l.x - r.x, l.y - r.y);
      // Expected distance is approximately 2 * radius = 140
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(180);
    }
  });

  test("returns empty arrays if fewer than 3 waypoints are provided", () => {
    const geom = buildTrackRibbon([{ x: 0, y: 0, radius: 50 }], 8);
    expect(geom.center).toEqual([]);
    expect(geom.left).toEqual([]);
    expect(geom.right).toEqual([]);
  });
});
