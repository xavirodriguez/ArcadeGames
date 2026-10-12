import {
  StoryGraphRegistry,
  StoryGraph,
  StoryPackage,
  CURRENT_STORY_SCHEMA_VERSION,
  StoryRuntime
} from "../src";

describe("StoryGraphRegistry", () => {
  beforeEach(() => {
    StoryGraphRegistry.resetInstance();
  });

  it("registers static TS graph fallbacks and retrieves them by graph ID", () => {
    const registry = StoryGraphRegistry.getInstance();

    const staticGraph: StoryGraph = {
      id: "ts_static_graph_1",
      title: "Static TS Graph",
      entryNodeId: "node_1",
      nodes: {
        node_1: { id: "node_1", type: "dialogue", isEndNode: true }
      }
    };

    registry.registerStaticGraph(staticGraph, "test/StaticGraph.ts");

    const retrieved = registry.getGraph("ts_static_graph_1");
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe("Static TS Graph");
  });

  it("prioritizes dynamically loaded StoryPackages over static TS fallbacks on ID collision", () => {
    const registry = StoryGraphRegistry.getInstance();

    const staticGraph: StoryGraph = {
      id: "shared_graph_id",
      title: "Static TS Version",
      entryNodeId: "static_node",
      nodes: { static_node: { id: "static_node", type: "dialogue" } }
    };

    const dynamicGraph: StoryGraph = {
      id: "shared_graph_id",
      title: "Dynamic JSON Package Version",
      entryNodeId: "dynamic_node",
      nodes: { dynamic_node: { id: "dynamic_node", type: "cutscene" } }
    };

    const dynamicPkg: StoryPackage = {
      manifest: {
        id: "pkg_override",
        title: "Override Package",
        contentVersion: "1.0.0",
        schemaVersion: CURRENT_STORY_SCHEMA_VERSION,
        entryGraph: "shared_graph_id"
      },
      graphs: {
        shared_graph_id: dynamicGraph
      }
    };

    registry.registerStaticGraph(staticGraph);
    registry.registerDynamicPackage(dynamicPkg);

    const resolved = registry.getGraph("shared_graph_id");
    expect(resolved?.title).toBe("Dynamic JSON Package Version");

    // Unregister dynamic package and verify fallback to TS static version
    registry.unregisterDynamicPackage("pkg_override");
    const fallbackResolved = registry.getGraph("shared_graph_id");
    expect(fallbackResolved?.title).toBe("Static TS Version");
  });

  it("allows StoryRuntime to resolve graphs directly by string ID from StoryGraphRegistry", () => {
    const registry = StoryGraphRegistry.getInstance();

    const testGraph: StoryGraph = {
      id: "registered_story_id",
      title: "Registered Story",
      entryNodeId: "entry_node",
      nodes: {
        entry_node: {
          id: "entry_node",
          type: "dialogue",
          isEndNode: true
        }
      }
    };

    registry.registerStaticGraph(testGraph);

    const runtime = new StoryRuntime("registered_story_id");
    expect(runtime.getCurrentNode()?.id).toBe("entry_node");
  });

  it("throws clear error in StoryRuntime if string graph ID is missing from registry", () => {
    expect(() => {
      new StoryRuntime("non_existent_graph_id");
    }).toThrow("StoryRuntime.loadGraph: Story graph with ID 'non_existent_graph_id' not found in StoryGraphRegistry.");
  });

  it("clears all static and dynamic registrations on reset", () => {
    const registry = StoryGraphRegistry.getInstance();
    registry.registerStaticGraph({ id: "g1", title: "G1", entryNodeId: "n1", nodes: {} });
    expect(registry.getGraph("g1")).toBeDefined();

    registry.clear();
    expect(registry.getGraph("g1")).toBeUndefined();
  });
});
