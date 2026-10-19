import {
  getCachedHtmlImageEntry,
  preloadSprites,
  clearHtmlImageCache,
  CanvasSpriteDrawer
} from "../CanvasSpriteDrawer";
import { World } from "@tiny-aster/core";

describe("CanvasSpriteDrawer Preloading and Caching", () => {
  const originalImage = global.Image;

  beforeEach(() => {
    clearHtmlImageCache();
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  it("tracks image loading status through 'loading', 'ready', and 'error'", async () => {
    class MockImage {
      public src = "";
      public complete = false;
      public naturalWidth = 0;
      public onload: (() => void) | null = null;
      public onerror: ((e?: any) => void) | null = null;

      public decode() {
        return Promise.reject(new Error("decode fail"));
      }
    }

    global.Image = MockImage as any;

    const entry = getCachedHtmlImageEntry("http://example.com/test.png")!;
    expect(entry.status).toBe("loading");

    const mockImg = entry.img as unknown as MockImage;
    mockImg.complete = true;
    mockImg.naturalWidth = 100;
    mockImg.onload?.();

    await entry.promise;
    expect(entry.status).toBe("ready");
  });

  it("marks status as error on load failure", async () => {
    class MockImage {
      public src = "";
      public complete = false;
      public naturalWidth = 0;
      public onload: (() => void) | null = null;
      public onerror: ((e?: any) => void) | null = null;

      public decode() {
        return Promise.reject(new Error("decode fail"));
      }
    }

    global.Image = MockImage as any;

    const entry = getCachedHtmlImageEntry("http://example.com/broken.png")!;
    expect(entry.status).toBe("loading");

    const mockImg = entry.img as unknown as MockImage;
    mockImg.onerror?.(new Error("404"));

    await expect(entry.promise).rejects.toThrow();
    expect(entry.status).toBe("error");
  });

  it("preloadSprites resolves when all assets are loaded or errored", async () => {
    class MockImage {
      public src = "";
      public complete = false;
      public naturalWidth = 0;
      public onload: (() => void) | null = null;
      public onerror: ((e?: any) => void) | null = null;

      public decode() {
        return Promise.resolve();
      }
    }

    global.Image = MockImage as any;

    const uris = ["http://example.com/a.png", "http://example.com/b.png"];
    const preloadPromise = preloadSprites(uris);

    // Trigger onload on mock images
    uris.forEach((uri) => {
      const entry = getCachedHtmlImageEntry(uri)!;
      const img = entry.img as unknown as MockImage;
      img.complete = true;
      img.naturalWidth = 50;
      img.onload?.();
    });

    await expect(preloadPromise).resolves.toBeUndefined();
  });

  it("does not draw sprite if image is not ready", () => {
    class MockImage {
      public src = "";
      public complete = false;
      public naturalWidth = 0;
      public onload: (() => void) | null = null;
      public onerror: ((e?: any) => void) | null = null;
    }
    global.Image = MockImage as any;

    const drawer = new CanvasSpriteDrawer();
    const mockCtx: any = {
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: jest.fn(),
    };

    const world = new World();
    const assetLoader = {
      get: jest.fn().mockReturnValue({ uri: "http://example.com/notready.png" }),
    };
    world.setResource("AssetLoader", assetLoader as any);

    const entity = world.createEntity();
    world.addComponent(entity, { type: "Sprite", assetKey: "notready" } as any);

    drawer.draw(mockCtx, world, entity);

    expect(mockCtx.drawImage).not.toHaveBeenCalled();
  });
});
