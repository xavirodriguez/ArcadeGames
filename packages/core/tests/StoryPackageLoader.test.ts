import {
  StoryPackageLoader,
  StoryPackageLoadError,
  StoryPackage,
  IAssetProvider,
  AssetLoader,
  StoryGraphRegistry,
  CURRENT_STORY_SCHEMA_VERSION
} from "../src";

class MockAssetProvider implements IAssetProvider {
  public mockData: Record<string, unknown> = {};

  public async loadImage(): Promise<unknown> {
    return {};
  }
  public async loadAudio(): Promise<unknown> {
    return {};
  }
  public async loadFont(): Promise<unknown> {
    return {};
  }
  public async load(path: string): Promise<unknown> {
    if (path in this.mockData) {
      return this.mockData[path];
    }
    throw new Error(`Path not found: ${path}`);
  }
}

describe("StoryPackageLoader", () => {
  let provider: MockAssetProvider;
  let loader: StoryPackageLoader;

  beforeEach(() => {
    provider = new MockAssetProvider();
    loader = new StoryPackageLoader(provider);
    StoryGraphRegistry.resetInstance();
  });

  it("successfully loads, validates and returns a valid StoryPackage object", async () => {
    const validPkg: StoryPackage = {
      manifest: {
        id: "pkg_test_1",
        title: "Test Package",
        contentVersion: "1.0.0",
        schemaVersion: CURRENT_STORY_SCHEMA_VERSION,
        entryGraph: "graph_1"
      },
      graphs: {
        graph_1: {
          id: "graph_1",
          title: "Graph 1",
          entryNodeId: "node_1",
          nodes: {
            node_1: {
              id: "node_1",
              type: "dialogue",
              isEndNode: true
            }
          }
        }
      }
    };

    provider.mockData["assets/story/test.json"] = validPkg;

    const result = await loader.load("assets/story/test.json");
    expect(result.package.manifest.id).toBe("pkg_test_1");
    expect(result.validation.valid).toBe(true);
  });

  it("migrates older schema version 1 packages to current schema version 3", async () => {
    const legacySingleGraph = {
      id: "legacy_story",
      title: "Legacy Story",
      entryNodeId: "n1",
      nodes: {
        n1: {
          id: "n1",
          type: "dialogue",
          onEnterEffects: [{ type: "setFlag", flag: "flag_1", value: true }],
          choices: [
            {
              id: "c1",
              textKey: "choice.1",
              target: "n2",
              onSelectEffects: [{ type: "setVariable", variable: "v1", value: 10 }]
            }
          ]
        },
        n2: {
          id: "n2",
          type: "cutscene",
          isEndNode: true
        }
      }
    };

    provider.mockData["legacy.json"] = legacySingleGraph;

    const result = await loader.load("legacy.json");
    expect(result.package.manifest.schemaVersion).toBe(CURRENT_STORY_SCHEMA_VERSION);
    expect(result.package.manifest.entryGraph).toBe("legacy_story");

    const node1 = result.package.graphs["legacy_story"].nodes["n1"];
    expect(node1.effects).toBeDefined();
    expect(node1.choices?.[0].targetNodeId).toBe("n2");
    expect(node1.choices?.[0].effects).toBeDefined();
  });

  it("throws StoryPackageLoadError with cause 'validation' when manifest/graph structure is invalid", async () => {
    const invalidPkg = {
      manifest: {
        id: "pkg_invalid",
        title: "Invalid Package",
        contentVersion: "1.0.0",
        schemaVersion: CURRENT_STORY_SCHEMA_VERSION,
        entryGraph: "missing_graph"
      },
      graphs: {}
    };

    provider.mockData["invalid.json"] = invalidPkg;

    await expect(loader.load("invalid.json")).rejects.toThrow(StoryPackageLoadError);

    try {
      await loader.load("invalid.json");
    } catch (err) {
      expect(err).toBeInstanceOf(StoryPackageLoadError);
      const loadErr = err as StoryPackageLoadError;
      expect(loadErr.causeType).toBe("validation");
      expect(loadErr.validationResult?.valid).toBe(false);
    }
  });

  it("throws StoryPackageLoadError with cause 'fetch' when provider returns empty object or null", async () => {
    provider.mockData["empty.json"] = {};

    await expect(loader.load("empty.json")).rejects.toThrow(StoryPackageLoadError);

    try {
      await loader.load("empty.json");
    } catch (err) {
      const loadErr = err as StoryPackageLoadError;
      expect(loadErr.causeType).toBe("fetch");
    }
  });

  it("handles stringified JSON input directly", async () => {
    const pkg: StoryPackage = {
      manifest: {
        id: "pkg_str",
        title: "String Package",
        contentVersion: "1.0.0",
        schemaVersion: CURRENT_STORY_SCHEMA_VERSION,
        entryGraph: "g1"
      },
      graphs: {
        g1: {
          id: "g1",
          title: "Graph 1",
          entryNodeId: "n1",
          nodes: { n1: { id: "n1", type: "dialogue", isEndNode: true } }
        }
      }
    };

    const jsonString = JSON.stringify(pkg);
    const result = await loader.load(jsonString);
    expect(result.package.manifest.id).toBe("pkg_str");
  });

  it("supports AssetLoader parameter injection", async () => {
    const assetLoader = new AssetLoader(provider);
    const customLoader = new StoryPackageLoader(assetLoader);

    const validPkg: StoryPackage = {
      manifest: {
        id: "pkg_asset_loader",
        title: "AssetLoader Test",
        contentVersion: "1.0.0",
        schemaVersion: CURRENT_STORY_SCHEMA_VERSION,
        entryGraph: "g1"
      },
      graphs: {
        g1: {
          id: "g1",
          title: "Graph 1",
          entryNodeId: "n1",
          nodes: { n1: { id: "n1", type: "dialogue", isEndNode: true } }
        }
      }
    };

    provider.mockData["asset_loader.json"] = validPkg;
    const result = await customLoader.load("asset_loader.json");
    expect(result.package.manifest.id).toBe("pkg_asset_loader");
  });

  it("normalizes Expo Asset wrapper objects with localUri or uri", async () => {
    const validPkg: StoryPackage = {
      manifest: {
        id: "expo_pkg",
        title: "Expo Asset Package",
        contentVersion: "1.0.0",
        schemaVersion: CURRENT_STORY_SCHEMA_VERSION,
        entryGraph: "g1"
      },
      graphs: {
        g1: {
          id: "g1",
          title: "Graph 1",
          entryNodeId: "n1",
          nodes: { n1: { id: "n1", type: "dialogue", isEndNode: true } }
        }
      }
    };

    // Simulate Expo Asset object returning a local URI
    const expoAssetWrapper = {
      localUri: "file:///assets/expo_pkg.json",
      uri: "file:///assets/expo_pkg.json",
      downloaded: true
    };

    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => validPkg
    } as Response);

    provider.mockData["expo_asset"] = expoAssetWrapper;

    const result = await loader.load("expo_asset");
    expect(result.package.manifest.id).toBe("expo_pkg");

    global.fetch = originalFetch;
  });
});
