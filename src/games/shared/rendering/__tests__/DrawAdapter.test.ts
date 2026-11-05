import { CanvasDrawAdapter, SkiaDrawAdapter } from "../DrawAdapter";

jest.mock("../SkiaContext", () => {
  class MockPaint {
    style: unknown;
    color: unknown;
    alpha = 1;
    strokeWidth: number | undefined;
    maskFilter: unknown;
    setStyle(style: unknown) { this.style = style; }
    setColor(color: unknown) { this.color = color; }
    setAlphaf(alpha: number) { this.alpha = alpha; }
    setStrokeWidth(width: number) { this.strokeWidth = width; }
    setMaskFilter(filter: unknown) { this.maskFilter = filter; }
  }
  const sharedPaint = new MockPaint();
  return {
    Skia: {
      Paint: () => new MockPaint(),
      PaintStyle: { Fill: "fill", Stroke: "stroke" },
      Color: (color: string) => color,
      MaskFilter: { MakeBlur: (_mode: unknown, sigma: number) => ({ sigma }) },
      BlurMode: { Normal: "normal" },
      XYWHRect: (...values: number[]) => values,
      Path: { Make: () => ({ addArc: jest.fn() }) },
      Font: () => null
    },
    getPaint: () => sharedPaint
  };
});

function createCanvasContext() {
  const fillSnapshots: Array<{ alpha: number; shadowBlur: number }> = [];
  const context = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    shadowColor: "",
    shadowBlur: 0,
    font: "",
    textAlign: "center",
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(() => fillSnapshots.push({ alpha: context.globalAlpha, shadowBlur: context.shadowBlur })),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    fillText: jest.fn(),
    drawImage: jest.fn(),
    translate: jest.fn()
  };
  return { context: context as unknown as CanvasRenderingContext2D, fillSnapshots };
}

describe("DrawAdapter glow composition", () => {
  it("multiplies primitive alpha by each Canvas glow layer alpha", () => {
    const { context, fillSnapshots } = createCanvasContext();
    const adapter = new CanvasDrawAdapter(context);
    adapter.drawGlow("#ff00ff", (layer) => layer.fillCircle(0, 0, 8, "#ffffff", 0.5));
    expect(fillSnapshots).toEqual([
      { alpha: 0.075, shadowBlur: 18 },
      { alpha: 0.175, shadowBlur: 8 },
      { alpha: 0.5, shadowBlur: 0 }
    ]);
    adapter.fillCircle(0, 0, 8, "#ffffff", 0.5);
    expect(fillSnapshots[3]).toEqual({ alpha: 0.5, shadowBlur: 0 });
  });

  it("preserves Skia blur mask filters and multiplies primitive alpha per layer", () => {
    const calls: Array<{ alpha: number; maskFilter: unknown; color: unknown }> = [];
    const canvas = {
      drawCircle: (_x: number, _y: number, _radius: number, paint: unknown) => {
        const current = paint as { alpha: number; maskFilter: unknown; color: unknown };
        calls.push({ alpha: current.alpha, maskFilter: current.maskFilter, color: current.color });
      }
    };
    const adapter = new SkiaDrawAdapter(canvas);
    adapter.drawGlow("#ff00ff", (layer) => layer.fillCircle(0, 0, 8, "#ffffff", 0.5));
    expect(calls.map((call) => call.alpha)).toEqual([0.075, 0.175, 0.5]);
    expect(calls.map((call) => call.maskFilter)).toEqual([{ sigma: 18 }, { sigma: 8 }, null]);
    expect(calls.map((call) => call.color)).toEqual(["#ffffff", "#ffffff", "#ffffff"]);
    adapter.fillCircle(0, 0, 8, "#ffffff", 0.5);
    expect(calls[3].maskFilter).toBeUndefined();
    expect(calls[3].alpha).toBe(0.5);
  });
});
