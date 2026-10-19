import { World } from "@tiny-aster/core";
import { CanvasRenderer, FrameTimeMeter } from "../CanvasRenderer";

describe("FrameTimeMeter", () => {
  it("computes p50, p95, p99 correctly and wraps around buffer size", () => {
    const meter = new FrameTimeMeter(100);

    for (let i = 1; i <= 100; i++) {
      meter.record(i);
    }

    let stats = meter.getStats();
    expect(stats.count).toBe(100);
    expect(stats.p50).toBe(51);
    expect(stats.p95).toBe(96);
    expect(stats.p99).toBe(100);

    // Record more to test ring buffer wrap
    for (let i = 101; i <= 150; i++) {
      meter.record(i);
    }

    stats = meter.getStats();
    expect(stats.count).toBe(100);
    // Buffer contains 51..150
    expect(stats.p50).toBe(101);
    expect(stats.p95).toBe(146);
    expect(stats.p99).toBe(150);
  });

  it("handles zero frames gracefully", () => {
    const meter = new FrameTimeMeter(300);
    const stats = meter.getStats();
    expect(stats.count).toBe(0);
    expect(stats.p50).toBe(0);
    expect(stats.p95).toBe(0);
    expect(stats.p99).toBe(0);
  });
});

describe("CanvasRenderer Perf Instrumentation", () => {
  let mockCtx: any;

  beforeEach(() => {
    delete globalThis.__ARCADE_PERF__;
    mockCtx = {
      canvas: { width: 800, height: 600 },
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textBaseline: "",
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      save: jest.fn(),
      restore: jest.fn(),
      setTransform: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
    };
  });

  it("does not measure or draw HUD when perf flag is inactive", () => {
    const renderer = new CanvasRenderer();
    const world = new World();
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    renderer.render(world, mockCtx);

    const stats = renderer.getFrameTimeStats();
    expect(stats.count).toBe(0);
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it("measures frame time and draws HUD when globalThis.__ARCADE_PERF__ is true", () => {
    globalThis.__ARCADE_PERF__ = true;
    const renderer = new CanvasRenderer();
    const world = new World();
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    renderer.render(world, mockCtx);

    const stats = renderer.getFrameTimeStats();
    expect(stats.count).toBe(1);
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      expect.stringMatching(/^p50:/),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("measures frame time and draws HUD when DebugPerf resource is present in world", () => {
    const renderer = new CanvasRenderer();
    const world = new World();
    world.setResource("ScreenConfig", { width: 800, height: 600 });
    world.setResource("DebugPerf", true);

    renderer.render(world, mockCtx);

    const stats = renderer.getFrameTimeStats();
    expect(stats.count).toBe(1);
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  it("applies devicePixelRatio setTransform scaling during rendering", () => {
    const originalWindow = global.window;
    try {
      // @ts-ignore
      delete global.window;
      // @ts-ignore
      global.window = { devicePixelRatio: 2 } as any;

      const renderer = new CanvasRenderer();
      const world = new World();
      world.setResource("ScreenConfig", { width: 800, height: 600 });

      renderer.render(world, mockCtx);

      expect(mockCtx.canvas.width).toBe(1600);
      expect(mockCtx.canvas.height).toBe(1200);
      expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    } finally {
      global.window = originalWindow;
    }
  });
});
