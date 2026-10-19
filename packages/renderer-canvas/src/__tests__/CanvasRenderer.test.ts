import { World } from "@tiny-aster/core";
import { CanvasRenderer, FrameTimeMeter } from "../CanvasRenderer";

interface MockCanvasCtx {
  canvas: { width: number; height: number };
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textBaseline: string;
  fillRect: jest.Mock;
  strokeRect: jest.Mock;
  fillText: jest.Mock;
  measureText: jest.Mock;
  save: jest.Mock;
  restore: jest.Mock;
  setTransform: jest.Mock;
  translate: jest.Mock;
  scale: jest.Mock;
  beginPath: jest.Mock;
  rect: jest.Mock;
  clip: jest.Mock;
  rotate: jest.Mock;
  arc: jest.Mock;
  fill: jest.Mock;
  stroke: jest.Mock;
}

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
  let mockCtx: MockCanvasCtx;

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

    renderer.render(world, mockCtx as unknown as CanvasRenderingContext2D);

    const stats = renderer.getFrameTimeStats();
    expect(stats.count).toBe(0);
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it("measures frame time and draws HUD when globalThis.__ARCADE_PERF__ is true", () => {
    globalThis.__ARCADE_PERF__ = true;
    const renderer = new CanvasRenderer();
    const world = new World();
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    renderer.render(world, mockCtx as unknown as CanvasRenderingContext2D);

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

    renderer.render(world, mockCtx as unknown as CanvasRenderingContext2D);

    const stats = renderer.getFrameTimeStats();
    expect(stats.count).toBe(1);
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  it("syncs canvas size only when dimensions or DPR change", () => {
    const renderer = new CanvasRenderer();
    const mockCanvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const screenConfig = { width: 800, height: 600 };

    renderer.syncSize(mockCanvas, screenConfig);
    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600);

    // Modifying canvas directly to test no redundant reassignment
    mockCanvas.width = 999;
    renderer.syncSize(mockCanvas, screenConfig);
    expect(mockCanvas.width).toBe(999); // should not reassign since screenConfig & dpr are identical

    // Change screenConfig
    renderer.syncSize(mockCanvas, { width: 1024, height: 768 });
    expect(mockCanvas.width).toBe(1024);
    expect(mockCanvas.height).toBe(768);
  });

  it("applies devicePixelRatio setTransform scaling during rendering", () => {
    const originalWindow = globalThis.window;
    try {
      const mockWindow = { devicePixelRatio: 2 } as unknown as Window & typeof globalThis;
      Object.defineProperty(globalThis, "window", {
        value: mockWindow,
        writable: true,
        configurable: true,
      });

      const renderer = new CanvasRenderer();
      const world = new World();
      world.setResource("ScreenConfig", { width: 800, height: 600 });

      renderer.render(world, mockCtx as unknown as CanvasRenderingContext2D);

      expect(mockCtx.canvas.width).toBe(1600);
      expect(mockCtx.canvas.height).toBe(1200);
      expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });
});

describe("CanvasRenderer Scene Transitions", () => {
  let mockCtx: MockCanvasCtx;

  beforeEach(() => {
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

  it("captures oldScene snapshot only once during drawsBothScenes transition", () => {
    const mockOffCtx = { ...mockCtx, clearRect: jest.fn() };
    const mockOffscreenCanvas = {
      width: 800,
      height: 600,
      getContext: jest.fn().mockReturnValue(mockOffCtx),
    };

    const originalDocument = globalThis.document;
    try {
      (globalThis as unknown as { document: unknown }).document = {
        createElement: jest.fn().mockReturnValue(mockOffscreenCanvas),
      };

      const renderer = new CanvasRenderer();
      const oldWorld = new World();
      oldWorld.setResource("ScreenConfig", { width: 800, height: 600 });
      const newWorld = new World();
      newWorld.setResource("ScreenConfig", { width: 800, height: 600 });

      const mockOldScene = { getWorld: () => oldWorld };
      const mockNewScene = { getWorld: () => newWorld };

      const mockEffect = {
        drawsBothScenes: true,
        render: jest.fn(),
      };

      const mockSceneManager = {
        getState: () => "UNLOADING",
        transitionProgress: 0.2,
        getActiveTransitionEffect: () => mockEffect,
        getTransitionOptions: () => ({}),
        getTransitionOldScene: () => mockOldScene,
        getTransitionNewScene: () => mockNewScene,
      };

      const mainWorld = new World();
      mainWorld.setResource("SceneManager", mockSceneManager);

      const renderWorldSpy = jest.spyOn(renderer as unknown as { renderWorld: jest.Mock }, "renderWorld");

      // Frame 1
      renderer.render(mainWorld, mockCtx as unknown as CanvasRenderingContext2D);
      expect(mockEffect.render).toHaveBeenCalledTimes(1);

      // Initial frame renders newWorld to ctx, oldWorld to offscreen
      expect(renderWorldSpy).toHaveBeenCalledWith(newWorld, expect.anything());
      expect(renderWorldSpy).toHaveBeenCalledWith(oldWorld, expect.anything());

      renderWorldSpy.mockClear();

      // Frame 2
      renderer.render(mainWorld, mockCtx as unknown as CanvasRenderingContext2D);
      expect(mockEffect.render).toHaveBeenCalledTimes(2);

      // Frame 2 should render newWorld to ctx, but reuse cached offscreen snapshot for oldWorld (0 calls for oldWorld)
      expect(renderWorldSpy).toHaveBeenCalledWith(newWorld, expect.anything());
      expect(renderWorldSpy).not.toHaveBeenCalledWith(oldWorld, expect.anything());
    } finally {
      (globalThis as unknown as { document: unknown }).document = originalDocument;
    }
  });
});
