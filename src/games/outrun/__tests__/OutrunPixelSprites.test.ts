import {
  OUTRUN_PLAYER_PIXEL_SPRITE,
  OUTRUN_TRAFFIC_PIXEL_SPRITE,
  getOutrunAnimationFrame,
  resolveOutrunPixelColor,
  visitOutrunPixelRuns,
  type OutrunPixelColor
} from "../rendering/OutrunPixelSprites";
import { colors } from "../../../theme/colors";

describe("OutrunPixelSprites", () => {
  it("keeps authored player and traffic sprite frames rectangular and valid", () => {
    const sprites = [OUTRUN_PLAYER_PIXEL_SPRITE, OUTRUN_TRAFFIC_PIXEL_SPRITE];

    for (const sprite of sprites) {
      expect(sprite.frames).toHaveLength(2);

      for (const frame of sprite.frames) {
        expect(frame).toHaveLength(sprite.height);
        for (const row of frame) {
          expect(row).toHaveLength(sprite.width);
          expect(row).toMatch(/^[.bdghprRt]+$/);
        }
      }
    }
  });

  it("uses high-detail car silhouettes while preserving their two-frame light pulse", () => {
    expect(OUTRUN_PLAYER_PIXEL_SPRITE.width).toBeGreaterThan(16);
    expect(OUTRUN_PLAYER_PIXEL_SPRITE.height).toBeGreaterThan(9);
    expect(OUTRUN_TRAFFIC_PIXEL_SPRITE.width).toBeGreaterThan(12);
    expect(OUTRUN_TRAFFIC_PIXEL_SPRITE.height).toBeGreaterThan(8);
    expect(OUTRUN_PLAYER_PIXEL_SPRITE.frames[0]).not.toEqual(OUTRUN_PLAYER_PIXEL_SPRITE.frames[1]);
    expect(OUTRUN_TRAFFIC_PIXEL_SPRITE.frames[0]).not.toEqual(OUTRUN_TRAFFIC_PIXEL_SPRITE.frames[1]);
  });

  it("selects animation frames deterministically from world distance", () => {
    expect(getOutrunAnimationFrame(0)).toBe(0);
    expect(getOutrunAnimationFrame(399.99)).toBe(0);
    expect(getOutrunAnimationFrame(400)).toBe(1);
    expect(getOutrunAnimationFrame(800)).toBe(0);
    expect(getOutrunAnimationFrame(-10)).toBe(0);
    expect(getOutrunAnimationFrame(Number.NaN)).toBe(0);
    expect(getOutrunAnimationFrame(1200)).toBe(getOutrunAnimationFrame(1200));
  });

  it("visits identical adjacent pixels as crisp horizontal runs", () => {
    const runs: Array<[OutrunPixelColor, number, number, number, number]> = [];

    visitOutrunPixelRuns(["bb..rr", "..RR.."], 10, 20, 2, (color, x, y, width, height) => {
      runs.push([color, x, y, width, height]);
    });

    expect(runs).toEqual([
      ["b", 10, 20, 4, 2],
      ["r", 18, 20, 4, 2],
      ["R", 14, 22, 4, 2]
    ]);
  });

  it("maps authored pixel roles to shared colors consistently", () => {
    expect(resolveOutrunPixelColor("b", "#123456")).toBe("#123456");
    expect(resolveOutrunPixelColor("r", "#123456")).toBe(colors.orangeDark);
    expect(resolveOutrunPixelColor("R", "#123456")).toBe(colors.red);
    expect(resolveOutrunPixelColor("g", "#123456")).toBe(colors.borderDark);
  });
});
