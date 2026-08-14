import { World, AssetLoader, SpriteComponent } from "../src/index";
import { CanvasRenderer, CanvasSpriteDrawer } from "../../renderer-canvas/src/index";

class FakeAssetProvider {
  async loadImage(path: string) {
    return { localUri: "fake_uri_for_" + path, width: 100, height: 100 };
  }
  async loadAudio(path: string) { return {}; }
  async loadFont(path: string) { return {}; }
}

describe("Sprite Integration and Drawers System", () => {
  let world: World;
  let assetLoader: AssetLoader;
  let provider: FakeAssetProvider;

  beforeEach(() => {
    world = new World();
    provider = new FakeAssetProvider();
    assetLoader = new AssetLoader(provider as any);
    world.setResource("AssetLoader", assetLoader);
  });

  it("should have pre-registered sprite shape in CanvasRenderer", () => {
    const canvasRenderer = new CanvasRenderer();

    expect((canvasRenderer as any).shapeDrawers.has("sprite")).toBe(true);
  });

  it("should gracefully return if SpriteComponent, assetKey, or loaded asset is missing", () => {
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Sprite",
      assetKey: "missing_asset"
    } as SpriteComponent);

    const drawer = new CanvasSpriteDrawer();
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: jest.fn()
    } as unknown as CanvasRenderingContext2D;

    // Asset missing in loader cache -> should return gracefully
    expect(() => drawer.draw(mockCtx, world as any, entity)).not.toThrow();
    expect(mockCtx.drawImage).not.toHaveBeenCalled();
  });

  it("should correctly draw sprite with computed anchor, scale, and flip in CanvasSpriteDrawer", async () => {
    await assetLoader.load([{ id: "test_sprite", path: "test.png", type: "image" }]);

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Sprite",
      assetKey: "test_sprite",
      anchor: { x: 0.5, y: 0.5 },
      flipX: true,
      flipY: false
    } as SpriteComponent);

    const drawer = new CanvasSpriteDrawer();

    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      drawImage: jest.fn()
    } as unknown as CanvasRenderingContext2D;

    // Mock HTMLImageElement
    const fakeImage = { complete: true, width: 64, height: 64 };
    jest.spyOn(assetLoader, "get").mockReturnValue(fakeImage);

    drawer.draw(mockCtx, world as any, entity);

    expect(mockCtx.save).toHaveBeenCalled();
    // flipX is true, flipY is false -> scale(-1, 1)
    expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
    // anchor 0.5, 0.5 with width 64, height 64 -> dx = -32, dy = -32
    expect(mockCtx.drawImage).toHaveBeenCalledWith(fakeImage, -32, -32, 64, 64);
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it("should draw subset of sprite using srcRect in CanvasSpriteDrawer", async () => {
    await assetLoader.load([{ id: "test_sprite", path: "test.png", type: "image" }]);

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Sprite",
      assetKey: "test_sprite",
      anchor: { x: 0, y: 0 },
      srcRect: { x: 10, y: 10, w: 20, h: 20 }
    } as SpriteComponent);

    const drawer = new CanvasSpriteDrawer();

    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      drawImage: jest.fn()
    } as unknown as CanvasRenderingContext2D;

    const fakeImage = { complete: true, width: 64, height: 64 };
    jest.spyOn(assetLoader, "get").mockReturnValue(fakeImage);

    drawer.draw(mockCtx, world as any, entity);

    expect(mockCtx.save).toHaveBeenCalled();
    // anchor 0, 0 -> dx = -0, dy = -0
    // srcRect x: 10, y: 10, w: 20, h: 20 -> drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    expect(mockCtx.drawImage).toHaveBeenCalledWith(fakeImage, 10, 10, 20, 20, -0, -0, 20, 20);
    expect(mockCtx.restore).toHaveBeenCalled();
  });
});
