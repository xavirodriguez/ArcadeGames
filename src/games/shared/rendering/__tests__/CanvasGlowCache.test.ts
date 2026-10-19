import { CanvasGlowCache } from "../CanvasGlowCache";
import { getGlowDegradationLevel, renderCanvasGlow, GLOW_PRESETS } from "../GlowSystem";

describe("CanvasGlowCache", () => {
  beforeEach(() => {
    CanvasGlowCache.getInstance().clear();
  });

  it("caches and retrieves canvas entries by key", () => {
    const cache = CanvasGlowCache.getInstance();
    const renderFn = jest.fn();

    const canvas1 = cache.getOrCreate("test_key", 50, 50, renderFn);
    expect(renderFn).toHaveBeenCalledTimes(1);

    const canvas2 = cache.getOrCreate("test_key", 50, 50, renderFn);
    expect(renderFn).toHaveBeenCalledTimes(1); // Should use cached
    expect(canvas1).toBe(canvas2);
  });

  it("evicts oldest entry when maxEntries threshold is reached", () => {
    const cache = new CanvasGlowCache(2);
    cache.getOrCreate("key1", 10, 10, () => {});
    cache.getOrCreate("key2", 10, 10, () => {});
    expect(cache.size()).toBe(2);

    cache.getOrCreate("key3", 10, 10, () => {});
    expect(cache.size()).toBe(2);
  });
});

describe("Glow Adaptive Degradation", () => {
  it("determines degradation levels based on p95 frame-time", () => {
    expect(getGlowDegradationLevel(5)).toBe(0);
    expect(getGlowDegradationLevel(9)).toBe(1);
    expect(getGlowDegradationLevel(13)).toBe(2);
    expect(getGlowDegradationLevel(18)).toBe(3);
  });

  it("renders canvas glow with offscreen cache options", () => {
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: jest.fn(),
      translate: jest.fn(),
      shadowColor: "",
      shadowBlur: 0,
      globalAlpha: 1,
      strokeStyle: "",
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    const glowStyle = {
      color: "#ff00ff",
      intensity: "normal" as const,
      auraBlur: 8,
      haloBlur: 18,
      auraAlpha: 0.35,
      haloAlpha: 0.15,
      highlightColor: "#00ffff",
    };

    const drawShape = jest.fn();

    renderCanvasGlow(
      mockCtx,
      glowStyle,
      drawShape,
      { key: "test_shape", width: 20, height: 20 },
      5
    );

    expect(mockCtx.drawImage).toHaveBeenCalled();
  });
});
