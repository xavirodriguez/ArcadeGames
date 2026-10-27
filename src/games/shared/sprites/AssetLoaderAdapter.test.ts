import type { AssetDescriptor, AssetLoader, SpriteSheetDefinition } from "@tiny-aster/core";
import { SpriteRegistry } from "./SpriteRegistry";
import { loadSpriteSheetWithAssetLoader } from "./AssetLoaderAdapter";

const TEST_SHEET: SpriteSheetDefinition = {
  id: "sprite_asset_adapter_test_sheet",
  assetPath: "assets/sprite_asset_adapter_test_sheet.png",
  imageSource: null,
  frameWidth: 16,
  frameHeight: 16,
  anchor: { x: 0.5, y: 1 },
  animations: {
    idle: {
      name: "idle",
      frames: [{ x: 0, y: 0, w: 16, h: 16 }],
      frameDuration: 0.1,
      loop: true
    }
  }
};

describe("loadSpriteSheetWithAssetLoader", () => {
  it("loads a runtime alias and publishes the resolved source on the canonical sheet", async () => {
    const loadCalls: AssetDescriptor[][] = [];
    const assetLoader: Pick<AssetLoader, "load"> = {
      async load(assets) {
        loadCalls.push(assets);
      }
    };

    await loadSpriteSheetWithAssetLoader(
      assetLoader,
      TEST_SHEET,
      "legacy_runtime_sprite_key",
      { uri: "https://example.test/sprite.png", localUri: "file:///cache/sprite.png" }
    );

    expect(loadCalls).toEqual([[
      {
        id: "legacy_runtime_sprite_key",
        path: "file:///cache/sprite.png",
        type: "image"
      }
    ]]);
    expect(SpriteRegistry.get(TEST_SHEET.id)).toEqual({
      ...TEST_SHEET,
      imageSource: {
        uri: "https://example.test/sprite.png",
        localUri: "file:///cache/sprite.png"
      }
    });
  });

  it("uses the URI if no local URI is available", async () => {
    const loadCalls: AssetDescriptor[][] = [];
    const assetLoader: Pick<AssetLoader, "load"> = {
      async load(assets) {
        loadCalls.push(assets);
      }
    };

    await loadSpriteSheetWithAssetLoader(
      assetLoader,
      { ...TEST_SHEET, id: "sprite_asset_adapter_remote_test_sheet" },
      "sprite_asset_adapter_remote_key",
      { uri: "https://example.test/remote.png" }
    );

    expect(loadCalls[0]?.[0]?.path).toBe("https://example.test/remote.png");
  });

  it("does not register a sheet if the ECS AssetLoader fails", async () => {
    const assetLoader: Pick<AssetLoader, "load"> = {
      async load() {
        throw new Error("simulated load failure");
      }
    };

    await expect(
      loadSpriteSheetWithAssetLoader(
        assetLoader,
        { ...TEST_SHEET, id: "sprite_asset_adapter_failure_test" },
        "sprite_asset_adapter_failure_key",
        { uri: "file:///cache/fail.png" }
      )
    ).rejects.toThrow("simulated load failure");

    expect(SpriteRegistry.get("sprite_asset_adapter_failure_test")).toBeUndefined();
  });

  it("rejects a missing image URI before contacting the loader", async () => {
    const load = jest.fn<Promise<void>, [AssetDescriptor[]]>();
    const assetLoader: Pick<AssetLoader, "load"> = { load };

    await expect(
      loadSpriteSheetWithAssetLoader(
        assetLoader,
        { ...TEST_SHEET, id: "sprite_asset_adapter_missing_uri_test" },
        "sprite_asset_adapter_missing_uri_key",
        {}
      )
    ).rejects.toThrow("has no resolved image URI");
    expect(load).not.toHaveBeenCalled();
  });
});
