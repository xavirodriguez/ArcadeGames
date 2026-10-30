import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { drawProceduralPrimitivesSkia } from "../drawProceduralSceneSkia";

jest.mock("@shopify/react-native-skia", () => ({
  Skia: {
    Color: (value: string) => value
  }
}));

describe("drawProceduralPrimitivesSkia opacity", () => {
  it("applies each primitive alpha independently and restores caller alpha", () => {
    let alpha = 0.5;
    const paint = {
      getAlphaf: () => alpha,
      setAlphaf: (value: number) => { alpha = value; },
      setStyle: jest.fn(),
      setStrokeWidth: jest.fn(),
      setColor: jest.fn()
    } as never as SkPaint;
    const paintedAlpha: number[] = [];
    const canvas = {
      save: jest.fn(),
      restore: jest.fn(),
      drawLine: jest.fn((_x1: number, _y1: number, _x2: number, _y2: number, drawPaint: SkPaint) => {
        paintedAlpha.push(drawPaint.getAlphaf());
      })
    } as never as SkCanvas;

    drawProceduralPrimitivesSkia(canvas, paint, [
      { type: "line", x1: 0, y1: 0, x2: 10, y2: 10, stroke: "#111111", alpha: 0.5 },
      { type: "line", x1: 10, y1: 10, x2: 20, y2: 20, stroke: "#222222", alpha: 1 }
    ]);

    expect(paintedAlpha).toEqual([0.25, 0.5]);
    expect(alpha).toBe(0.5);
  });
});
