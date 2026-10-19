/**
 * LRU Offscreen Canvas Glow Cache.
 * Caches rendered glow shapes and sprites to avoid costly Canvas2D shadowBlur operations on every frame.
 */

export class CanvasGlowCache {
  private static instance: CanvasGlowCache | null = null;
  private readonly cache = new Map<string, HTMLCanvasElement | { width: number; height: number; getContext: (type: string) => CanvasRenderingContext2D | null }>();
  private readonly maxEntries: number;

  constructor(maxEntries = 128) {
    this.maxEntries = maxEntries;
  }

  public static getInstance(): CanvasGlowCache {
    if (!CanvasGlowCache.instance) {
      CanvasGlowCache.instance = new CanvasGlowCache(128);
    }
    return CanvasGlowCache.instance;
  }

  public getOrCreate(
    key: string,
    width: number,
    height: number,
    renderFn: (ctx: CanvasRenderingContext2D) => void
  ): HTMLCanvasElement | { width: number; height: number } {
    const existing = this.cache.get(key);
    if (existing) {
      // LRU refresh: re-insert at end of Map
      this.cache.delete(key);
      this.cache.set(key, existing);
      return existing;
    }

    const w = Math.ceil(Math.max(1, width));
    const h = Math.ceil(Math.max(1, height));

    let canvas: HTMLCanvasElement | { width: number; height: number; getContext: (type: string) => unknown };

    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const realCanvas = document.createElement("canvas");
      realCanvas.width = w;
      realCanvas.height = h;
      const ctx = realCanvas.getContext("2d");
      if (ctx) {
        renderFn(ctx);
      }
      canvas = realCanvas;
    } else {
      const mockCtx = {
        save: () => {},
        restore: () => {},
        translate: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
      } as unknown as CanvasRenderingContext2D;
      renderFn(mockCtx);
      canvas = { width: w, height: h, getContext: () => mockCtx };
    }

    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, canvas as HTMLCanvasElement);
    return canvas as HTMLCanvasElement;
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}
