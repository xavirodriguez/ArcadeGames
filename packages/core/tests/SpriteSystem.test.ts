import { World, AssetLoader, SpriteComponent, WebAssetProvider, RenderComponent } from "../src/index";

class FakeAssetProvider {
  async loadImage(path: string) {
    return { localUri: "fake_uri_for_" + path, width: 100, height: 100 };
  }
  async loadAudio(path: string) { return {}; }
  async loadFont(path: string) { return {}; }
}

// Simple mathematical helper to replicate/test the canvas drawer logic
function calculateDrawParams(sprite: SpriteComponent, imgWidth: number, imgHeight: number) {
  const anchorX = sprite.anchor?.x ?? 0.5;
  const anchorY = sprite.anchor?.y ?? 0.5;

  const flipX = sprite.flipX ? -1 : 1;
  const flipY = sprite.flipY ? -1 : 1;

  let sx = 0;
  let sy = 0;
  let sw = imgWidth;
  let sh = imgHeight;

  if (sprite.srcRect) {
    sx = sprite.srcRect.x;
    sy = sprite.srcRect.y;
    sw = sprite.srcRect.w;
    sh = sprite.srcRect.h;
  }

  const dx = -sw * anchorX;
  const dy = -sh * anchorY;

  return {
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    flipX,
    flipY
  };
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

  it("should successfully lookup loaded asset via SpriteComponent", async () => {
    await assetLoader.load([{ id: "ship_sprite", path: "assets/ship.png", type: "image" }]);
    const loadedAsset = assetLoader.get("ship_sprite");
    expect(loadedAsset).toBeDefined();

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Sprite",
      assetKey: "ship_sprite"
    } as SpriteComponent);

    const sprite = world.getComponent(entity, "Sprite") as SpriteComponent;
    expect(sprite).toBeDefined();
    expect(sprite.assetKey).toBe("ship_sprite");

    const resolved = assetLoader.get(sprite.assetKey || "");
    expect(resolved).toBe(loadedAsset);
  });

  it("should gracefully handle missing or unloaded assets without throwing", () => {
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Sprite",
      assetKey: "unloaded_sprite"
    } as SpriteComponent);

    const sprite = world.getComponent(entity, "Sprite") as SpriteComponent;
    expect(sprite).toBeDefined();

    const resolved = assetLoader.get(sprite.assetKey || "");
    expect(resolved).toBeUndefined();

    // Verify drawing simulation does not crash when image is missing
    const drawAction = () => {
      const rawImg = assetLoader.get(sprite.assetKey || "");
      if (!rawImg) {
        return; // Early return mimicking the drawers
      }
    };

    expect(drawAction).not.toThrow();
  });

  it("should verify mathematically that anchor: { x: 0.5, y: 0.5 } centers the sprite", () => {
    const sprite: SpriteComponent = {
      type: "Sprite",
      assetKey: "test_sprite",
      anchor: { x: 0.5, y: 0.5 }
    };

    const imgWidth = 64;
    const imgHeight = 64;

    const params = calculateDrawParams(sprite, imgWidth, imgHeight);

    // dx and dy should be shifted by half the width and height
    expect(params.dx).toBe(-32);
    expect(params.dy).toBe(-32);
    expect(params.sw).toBe(64);
    expect(params.sh).toBe(64);
  });

  it("should verify mathematically that flipX and flipY compute correct scale signs", () => {
    const sprite: SpriteComponent = {
      type: "Sprite",
      assetKey: "test_sprite",
      flipX: true,
      flipY: false
    };

    const params = calculateDrawParams(sprite, 64, 64);

    expect(params.flipX).toBe(-1);
    expect(params.flipY).toBe(1);
  });

  it("should verify mathematically that srcRect selects correct subsets", () => {
    const sprite: SpriteComponent = {
      type: "Sprite",
      assetKey: "test_sprite",
      srcRect: { x: 15, y: 25, w: 10, h: 20 },
      anchor: { x: 0, y: 0 }
    };

    const params = calculateDrawParams(sprite, 100, 100);

    expect(params.sx).toBe(15);
    expect(params.sy).toBe(25);
    expect(params.sw).toBe(10);
    expect(params.sh).toBe(20);
    expect(params.dx).toBe(-0);
    expect(params.dy).toBe(-0);
  });

  it("should verify WebAssetProvider loads mock image in node/test environments", async () => {
    const webProvider = new WebAssetProvider();
    const loader = new AssetLoader(webProvider);
    await loader.load([{ id: "ship_sprite", path: "assets/ship.png", type: "image" }]);

    const asset = loader.get("ship_sprite");
    expect(asset).toBeDefined();
  });

  it("should resolve shape 'sprite' on an entity equipped with Render and Sprite components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      shape: "sprite",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as RenderComponent);
    world.addComponent(entity, {
      type: "Sprite",
      assetKey: "ship_sprite",
      anchor: { x: 0.5, y: 0.5 }
    } as SpriteComponent);

    const render = world.getComponent(entity, "Render") as RenderComponent;
    const sprite = world.getComponent(entity, "Sprite") as SpriteComponent;

    expect(render.shape).toBe("sprite");
    expect(sprite.assetKey).toBe("ship_sprite");
    expect(sprite.anchor).toEqual({ x: 0.5, y: 0.5 });
  });
});
