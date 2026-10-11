import { isPointInZone } from "../utils/RacingUtils";

describe("RacingUtils", () => {
  it("isPointInZone returns true for points inside the zone and false outside", () => {
    const zone = { x: 100, y: 100, width: 40, height: 40 };
    expect(isPointInZone(100, 100, zone)).toBe(true);
    expect(isPointInZone(80, 80, zone)).toBe(true);
    expect(isPointInZone(120, 120, zone)).toBe(true);
    expect(isPointInZone(79, 100, zone)).toBe(false);
    expect(isPointInZone(100, 121, zone)).toBe(false);
  });
});
