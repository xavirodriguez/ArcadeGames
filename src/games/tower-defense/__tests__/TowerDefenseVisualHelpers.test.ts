import { createPathDirectionMarkers } from "../rendering/TowerDefenseVisualHelpers";

describe("Tower Defense path direction markers", () => {
  it("places markers along the route and points them toward the next waypoint", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ];

    const markers = createPathDirectionMarkers(points, 2);

    expect(markers).toHaveLength(2);
    expect(markers[0]).toEqual({ x: 20, y: 0, angle: Math.PI / 2 });
    expect(markers[1]?.x).toBe(20);
    expect(markers[1]?.y).toBe(20);
    expect(markers[1]?.angle).toBeCloseTo(Math.PI);
  });

  it("returns no markers for short routes and skips duplicate waypoints", () => {
    expect(createPathDirectionMarkers([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toEqual([]);

    const markers = createPathDirectionMarkers([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
    ], 1);

    expect(markers.some((marker) => !Number.isFinite(marker.angle))).toBe(false);
    expect(markers.every((marker) => Number.isFinite(marker.x) && Number.isFinite(marker.y))).toBe(true);
  });

  it("uses a safe interval when the requested stride is invalid", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
      { x: 40, y: 0 },
    ];

    expect(createPathDirectionMarkers(points, 0)).toHaveLength(3);
    expect(createPathDirectionMarkers(points, Number.NaN)).toHaveLength(1);
  });
});
