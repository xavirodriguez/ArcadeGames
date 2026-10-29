import { getVisibleRepeatedIndexRange, getVisualPosition } from "../VisualSceneTransform";

describe("shared scene transforms", () => {
  it("applies parallax, zoom and viewport offset once", () => {
    expect(getVisualPosition({
      position: { x: 100, y: 200 }, space: "parallax", parallaxFactor: 0.25
    }, { x: 10, y: 20, zoom: 2, visualOffsetX: 5, visualOffsetY: -3 }, { x: 7, y: 11 }))
      .toEqual({ x: 202, y: 398 });
  });

  it("keeps screen-space scenery fixed and unzoomed", () => {
    expect(getVisualPosition({
      position: { x: 100, y: 200 }, space: "screen"
    }, { x: 900, y: 400, zoom: 3, visualOffsetX: 5, visualOffsetY: -3 }))
      .toEqual({ x: 105, y: 197 });
  });

  it("culls repeated scenery with an overscan margin", () => {
    const range = getVisibleRepeatedIndexRange({
      space: "parallax", parallaxFactor: 0.5,
      start: { x: 0, y: 300 }, spacing: 100
    }, { x: 300, y: 0 }, 400, { x: 0, y: 0 }, 100);
    expect(range).toEqual({ firstIndex: 1, lastIndex: 6 });
  });

  it("returns an empty range for invalid zoom", () => {
    expect(getVisibleRepeatedIndexRange({
      space: "world", start: { x: 0, y: 0 }, spacing: 100
    }, { x: 0, y: 0, zoom: 0 }, 400)).toEqual({ firstIndex: 0, lastIndex: -1 });
  });
});
