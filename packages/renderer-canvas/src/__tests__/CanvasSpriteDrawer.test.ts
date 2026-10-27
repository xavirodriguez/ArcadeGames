import {
  getCachedHtmlImageEntry,
  preloadSprites,
  clearHtmlImageCache,
  CanvasSpriteDrawer
} from "../CanvasSpriteDrawer";
import { World, AssetLoader, SpriteComponent } from "@tiny-aster/core";

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
      public onerror: ((e?: unknown) => void) | null = null;

      public decode() {
        return Promise.reject(new Error("decode fail"));
      }
    }

    global.Image = MockImage as unknown as typeof Image;

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
      public onerror: ((e?: unknown) => void) | null = null;

      public decode() {
        return Promise.reject(new Error("decode fail"));
      }
    }

    global.Image = MockImage as unknown as typeof Image;

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
      public onerror: ((e?: unknown) => void) | null = null;

      public decode() {
        return Promise.resolve();
      }
    }

    global.Image = MockImage as unknown as typeof Image;

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

  it("applies SpriteComponent.scale to the destination rectangle without changing the atlas source", async () => {
    const drawer = new CanvasSpriteDrawer();
    const drawImageMock = jest.fn();
    const mockCtx: CanvasRenderingContext2D = Object.assign(Object.create(null), {
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: drawImageMock,
    });

    const world = new World();
    const image = { width: 64, height: 64, complete: true };
    const assetLoader = new AssetLoader({
      async loadImage(): Promise<unknown> { return image; },
      async loadAudio(): Promise<unknown> { return null; },
      async loadFont(): Promise<unknown> { return null; }
    });
    await assetLoader.load([
      { id: "scaled_sprite", path: "scaled_sprite", type: "image" }
    ]);
    world.setResource("AssetLoader", assetLoader);

    const entity = world.createEntity();
    const spriteComp: SpriteComponent = {
      type: "Sprite",
      assetKey: "scaled_sprite",
      srcRect: { x: 64, y: 128, w: 64, h: 64 },
      anchor: { x: 0.5, y: 0.5 },
      scale: 0.5
    };
    world.addComponent(entity, spriteComp);

    drawer.draw(mockCtx, world, entity);

    expect(drawImageMock).toHaveBeenCalledWith(
      image,
      64, 128, 64, 64,
      -16, -16, 32, 32
    );
  });

  it("does not draw sprite if image is not ready", () => {
    class MockImage {
      public src = "";
      public complete = false;
      public naturalWidth = 0;
      public onload: (() => void) | null = null;
      public onerror: ((e?: unknown) => void) | null = null;
    }
    global.Image = MockImage as unknown as typeof Image;

    const drawer = new CanvasSpriteDrawer();
    const drawImageMock = jest.fn();
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: drawImageMock,
    } as unknown as CanvasRenderingContext2D;

    const world = new World();
    const assetLoader = {
      get: jest.fn().mockReturnValue({ uri: "http://example.com/notready.png" }),
    } as unknown as AssetLoader;
    world.setResource("AssetLoader", assetLoader);

    const entity = world.createEntity();
    const spriteComp: SpriteComponent = {
      type: "Sprite",
      assetKey: "notready",
    };
    world.addComponent(entity, spriteComp);

    drawer.draw(mockCtx, world, entity);

    expect(drawImageMock).not.toHaveBeenCalled();
  });
});
