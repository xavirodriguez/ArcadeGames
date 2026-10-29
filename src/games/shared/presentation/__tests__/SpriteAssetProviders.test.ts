import {
  getCanvasSpriteImage,
  getCanvasSpriteLoadState,
  getSkiaImage,
  getSkiaSpriteLoadState,
  preloadSpriteSheetCanvas,
  preloadSpriteSheetSkia
} from "../../sprites/SpriteDrawer";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import {
  CanvasPresentationSpriteAssets,
  SkiaPresentationSpriteAssets
} from "../adapters/SpriteAssetProviders";

jest.mock("../../sprites/SpriteDrawer", () => ({
  getCanvasSpriteImage: jest.fn((assetId: string) =>
    assetId === "canvas-ready" ? { width: 10, height: 8 } : undefined
  ),
  getCanvasSpriteLoadState: jest.fn((assetId: string) =>
    assetId === "canvas-failed" ? "failed" : assetId === "canvas-ready" ? "ready" : "not-loaded"
  ),
  getSkiaImage: jest.fn((assetId: string) =>
    assetId === "skia-ready" ? { width: () => 10, height: () => 8 } : undefined
  ),
  getSkiaSpriteLoadState: jest.fn((assetId: string) =>
    assetId === "skia-failed" ? "failed" : assetId === "skia-ready" ? "ready" : "not-loaded"
  ),
  preloadSpriteSheetCanvas: jest.fn(() => Promise.resolve()),
  preloadSpriteSheetSkia: jest.fn(() => Promise.resolve())
}));

jest.mock("../../sprites/SpriteRegistry", () => ({
  SpriteRegistry: {
    has: jest.fn((assetId: string) => assetId !== "unknown")
  }
}));

describe("Presentation sprite asset providers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("resolves images from the shared Canvas sprite cache", () => {
    const provider = new CanvasPresentationSpriteAssets();

    expect(provider.getImage("canvas-ready")).toEqual({ width: 10, height: 8 });
    expect(provider.getImage("not-ready")).toBeUndefined();
    expect(provider.getLoadState("canvas-ready")).toBe("ready");
    expect(getCanvasSpriteImage).toHaveBeenCalledWith("canvas-ready");
    expect(getCanvasSpriteLoadState).toHaveBeenCalledWith("canvas-ready");
  });

  test("resolves images from the shared Skia sprite cache", () => {
    const provider = new SkiaPresentationSpriteAssets();

    expect(provider.getImage("skia-ready")).toBeDefined();
    expect(provider.getImage("not-ready")).toBeUndefined();
    expect(provider.getLoadState("skia-ready")).toBe("ready");
    expect(getSkiaImage).toHaveBeenCalledWith("skia-ready");
    expect(getSkiaSpriteLoadState).toHaveBeenCalledWith("skia-ready");
  });

  test("deduplicates preload requests and delegates to the shared Canvas cache", async () => {
    const provider = new CanvasPresentationSpriteAssets();

    await provider.preload(["canvas-ready", "canvas-ready", "canvas-not-loaded"]);

    expect(preloadSpriteSheetCanvas).toHaveBeenCalledTimes(2);
    expect(preloadSpriteSheetCanvas).toHaveBeenCalledWith("canvas-ready");
    expect(preloadSpriteSheetCanvas).toHaveBeenCalledWith("canvas-not-loaded");
  });

  test("deduplicates preload requests and delegates to the shared Skia cache", async () => {
    const provider = new SkiaPresentationSpriteAssets();

    await provider.preload(["skia-ready", "skia-ready"]);

    expect(preloadSpriteSheetSkia).toHaveBeenCalledTimes(1);
    expect(preloadSpriteSheetSkia).toHaveBeenCalledWith("skia-ready");
  });

  test("rejects unregistered semantic asset ids before trying to load them", async () => {
    const provider = new CanvasPresentationSpriteAssets();

    await expect(provider.preload(["canvas-ready", "unknown"])).rejects.toThrow(
      "Unregistered sprite asset(s): unknown"
    );
    expect(SpriteRegistry.has).toHaveBeenCalledWith("unknown");
    expect(preloadSpriteSheetCanvas).not.toHaveBeenCalled();
  });

  test("reports cached failures rather than silently accepting a missing image", async () => {
    const canvasProvider = new CanvasPresentationSpriteAssets();
    const skiaProvider = new SkiaPresentationSpriteAssets();

    await expect(canvasProvider.preload(["canvas-failed"])).rejects.toThrow(
      "Canvas failed to load sprite asset(s): canvas-failed"
    );
    await expect(skiaProvider.preload(["skia-failed"])).rejects.toThrow(
      "Skia failed to load sprite asset(s): skia-failed"
    );
  });
});
