import { calculateSpriteDestinationRect } from "../src/assets/SpriteSheetDefinition";

describe("calculateSpriteDestinationRect", () => {
  it("positions centered sprites around the entity origin", () => {
    expect(calculateSpriteDestinationRect(32, 64, { x: 0.5, y: 0.5 })).toEqual({
      x: -16,
      y: -32,
      width: 32,
      height: 64
    });
  });

  it("supports bottom-centered character anchors", () => {
    const rect = calculateSpriteDestinationRect(64, 64, { x: 0.5, y: 0.94 });

    expect(rect).not.toBeNull();
    expect(rect?.x).toBe(-32);
    expect(rect?.y).toBeCloseTo(-60.16, 8);
    expect(rect?.width).toBe(64);
    expect(rect?.height).toBe(64);
  });

  it("supports top-left anchors without changing size", () => {
    expect(calculateSpriteDestinationRect(10, 20, { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 20
    });
  });

  it("rejects invalid dimensions and normalized anchors", () => {
    const invalidCases: Array<{
      width: number;
      height: number;
      anchor: { x: number; y: number };
    }> = [
      { width: 0, height: 10, anchor: { x: 0.5, y: 0.5 } },
      { width: -1, height: 10, anchor: { x: 0.5, y: 0.5 } },
      { width: 10, height: Number.NaN, anchor: { x: 0.5, y: 0.5 } },
      { width: 10, height: 10, anchor: { x: -0.1, y: 0.5 } },
      { width: 10, height: 10, anchor: { x: 0.5, y: 1.1 } }
    ];

    for (const testCase of invalidCases) {
      expect(
        calculateSpriteDestinationRect(
          testCase.width,
          testCase.height,
          testCase.anchor
        )
      ).toBeNull();
    }
  });
});
