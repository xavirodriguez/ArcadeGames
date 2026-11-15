import { CanvasDrawAdapter, SkiaDrawAdapter } from "../DrawAdapter";
import { getGlowStyle, renderCanvasGlow, renderSkiaGlow } from "../GlowSystem";

jest.mock("../SkiaContext", () => {
  class MockPaint {
    style: unknown = undefined;
    color: unknown = undefined;
    alpha = 1;
    strokeWidth: number | undefined = undefined;
    maskFilter: unknown = undefined;
    blendMode: unknown = undefined;
    setStyle(style: unknown) { this.style = style; }
    setBlendMode(mode: unknown) { this.blendMode = mode; }
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
      BlendMode: { SrcOver: "src-over", Plus: "plus", Screen: "screen" },
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

interface MockCanvasContext {
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  font: string;
  textAlign: string;
  save: jest.Mock;
  restore: jest.Mock;
  beginPath: jest.Mock;
  arc: jest.Mock;
  fill: jest.Mock;
  stroke: jest.Mock;
  fillRect: jest.Mock;
  strokeRect: jest.Mock;
  moveTo: jest.Mock;
  lineTo: jest.Mock;
  fillText: jest.Mock;
  drawImage: jest.Mock;
  translate: jest.Mock;
}

function createCanvasContext(): { context: CanvasRenderingContext2D; fillSnapshots: Array<{ alpha: number; shadowBlur: number }> } {
  const fillSnapshots: Array<{ alpha: number; shadowBlur: number }> = [];
  const stateStack: GlobalCompositeOperation[] = [];
  const context: MockCanvasContext = {
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    shadowColor: "",
    shadowBlur: 0,
    font: "",
    textAlign: "center",
    save: jest.fn(() => stateStack.push(context.globalCompositeOperation)),
    restore: jest.fn(() => { context.globalCompositeOperation = stateStack.pop() ?? "source-over"; }),
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
  return { context: context as never as CanvasRenderingContext2D, fillSnapshots };
}

describe("DrawAdapter blend modes", () => {
  it("restores Canvas blend mode with the native save/restore stack", () => {
    const { context } = createCanvasContext();
    const adapter = new CanvasDrawAdapter(context);
    adapter.setBlendMode("lighter");
    adapter.save();
    adapter.setBlendMode("screen");
    expect(context.globalCompositeOperation).toBe("screen");
    adapter.restore();
    expect(context.globalCompositeOperation).toBe("lighter");
  });

  it("maps Skia blend modes and restores the adapter state with save/restore", () => {
    const blendModes: unknown[] = [];
    const canvas = {
      save: jest.fn(),
      restore: jest.fn(),
      drawCircle: (_x: number, _y: number, _radius: number, paint: unknown) => {
        blendModes.push((paint as { blendMode: unknown }).blendMode);
      }
    };
    const adapter = new SkiaDrawAdapter(canvas);
    adapter.setBlendMode("lighter");
    adapter.save();
    adapter.setBlendMode("screen");
    adapter.fillCircle(0, 0, 4, "#ffffff");
    adapter.restore();
    adapter.fillCircle(0, 0, 4, "#ffffff");
    adapter.setBlendMode("source-over");
    adapter.fillCircle(0, 0, 4, "#ffffff");
    expect(blendModes).toEqual(["screen", "plus", "src-over"]);
    expect(canvas.save).toHaveBeenCalledTimes(1);
    expect(canvas.restore).toHaveBeenCalledTimes(1);
  });
});

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
  it("applies the same p95 glow degradation thresholds to Skia as Canvas", () => {
    const perfGlobal = globalThis as typeof globalThis & { __ARCADE_PERF_P95__?: number };
    const previousP95 = perfGlobal.__ARCADE_PERF_P95__;
    const cases = [
      { p95: 9, expectedAlpha: [0.175, 0.5] },
      { p95: 13, expectedAlpha: [0.5] },
      { p95: 17, expectedAlpha: [0.5] }
    ];

    try {
      for (const scenario of cases) {
        perfGlobal.__ARCADE_PERF_P95__ = scenario.p95;
        const calls: number[] = [];
        const skiaCanvas = {
          drawCircle: (_x: number, _y: number, _radius: number, paint: unknown) => {
            calls.push((paint as { alpha: number }).alpha);
          }
        };
        new SkiaDrawAdapter(skiaCanvas).drawGlow("#ff00ff", (layer) => {
          layer.fillCircle(0, 0, 8, "#ffffff", 0.5);
        });

        const { context, fillSnapshots } = createCanvasContext();
        new CanvasDrawAdapter(context).drawGlow("#ff00ff", (layer) => {
          layer.fillCircle(0, 0, 8, "#ffffff", 0.5);
        });
        expect(calls).toEqual(scenario.expectedAlpha);
        expect(fillSnapshots.map((snapshot) => snapshot.alpha)).toEqual(scenario.expectedAlpha);
      }
    } finally {
      if (previousP95 === undefined) delete perfGlobal.__ARCADE_PERF_P95__;
      else perfGlobal.__ARCADE_PERF_P95__ = previousP95;
    }
  });

  it("uses the same highlight alpha for strong glows in Canvas and Skia", () => {
    const glow = getGlowStyle("#ff00ff", "strong");
    const { context } = createCanvasContext();
    let canvasHighlightAlpha = 0;
    renderCanvasGlow(context, glow, (ctx, isHighlight) => {
      if (isHighlight) canvasHighlightAlpha = ctx.globalAlpha;
    });

    let skiaHighlightAlpha = 0;
    const skiaCanvas = { drawCircle: jest.fn() };
    renderSkiaGlow(skiaCanvas, glow, (paint, isHighlight) => {
      if (isHighlight) skiaHighlightAlpha = (paint as never as { alpha: number }).alpha;
    });

    expect(canvasHighlightAlpha).toBe(0.9);
    expect(skiaHighlightAlpha).toBe(canvasHighlightAlpha);
  });

});
