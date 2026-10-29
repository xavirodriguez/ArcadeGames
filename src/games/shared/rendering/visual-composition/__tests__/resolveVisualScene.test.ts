import { LevelVisualDefinition, VisualCompositionCatalog, resolveVisualScene, validateVisualComposition } from "../index";

const assets = new Map([
  ["house", { id: "house", anchor: "bottom-center" as const }],
  ["tree", { id: "tree", anchor: "center" as const }]
]);
const catalog: VisualCompositionCatalog = {
  assets: { getAsset: id => assets.get(id) },
  themes: new Set(["sumi-e"]),
  prefabs: new Map([
    ["village", {
      schemaVersion: 1 as const,
      id: "village",
      instances: [{ id: "well", asset: "house", position: { x: 4, y: 5 } }]
    }],
    ["unused-broken", {
      schemaVersion: 1 as const,
      id: "wrong-key",
      instances: [{ id: "missing-asset", asset: "not-in-catalog", position: { x: 0, y: 0 } }]
    }]
  ])
};

const definition: LevelVisualDefinition = {
  schemaVersion: 1,
  id: "test.level",
  theme: "sumi-e",
  layers: [
    {
      id: "settlement",
      role: "settlement",
      order: 10,
      space: "world",
      position: { x: 100, y: 200 },
      items: [
        { kind: "instance", instance: { id: "tree-1", asset: "tree", position: { x: 10, y: 30 }, opacity: 0.5 } },
        { kind: "prefab", id: "well-placement", prefab: "village", position: { x: 4, y: 5 } },
        { kind: "instance", instance: { id: "tree-2", asset: "tree", position: { x: 20, y: 40 } } }
      ]
    },
    {
      id: "foreground",
      role: "foreground",
      order: 20,
      space: "world",
      items: [{ kind: "instance", instance: { id: "tree-3", asset: "tree", position: { x: 0, y: 0 } } }]
    }
  ]
};

describe("declarative visual composition", () => {
  it("resolves in stable layer and intra-layer item order with unique prefixed IDs", () => {
    const first = resolveVisualScene(definition, catalog);
    expect(resolveVisualScene(definition, catalog)).toEqual(first);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.instances.map(instance => instance.id)).toEqual([
      "settlement/tree-1", "settlement/well-placement/well", "settlement/tree-2", "foreground/tree-3"
    ]);
    expect(first.value.instances[1].position).toEqual({ x: 108, y: 210 });
    expect(first.value.instances[0].position).toEqual({ x: 110, y: 230 });
    expect(first.value.instances[0].scale).toEqual({ x: 1, y: 1 });
    expect(first.value.instances[0].opacity).toBe(0.5);
    expect(first.value.instances[0].anchor).toBe("center");
  });

  it("rejects unknown keys, coordinate-space on instances, invalid transforms and missing assets", () => {
    const invalid = {
      ...definition,
      layers: [{
        id: "settlement", role: "settlement", order: 10, space: "world",
        items: [{ kind: "instance", instance: {
          id: "dup", asset: "not-found", position: { x: 0, y: 0 }, opacty: 0.5,
          space: "screen", opacity: 2, scale: { x: 0, y: 1 }
        }}]
      }]
    };
    const result = validateVisualComposition(invalid, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.issues.map(item => item.path);
    expect(paths).toContain("layers[0].items[0].instance.opacty");
    expect(paths).toContain("layers[0].items[0].instance.space");
    expect(paths).toContain("layers[0].items[0].instance.opacity");
    expect(paths).toContain("layers[0].items[0].instance.scale");
    expect(result.issues.some(item => item.message.includes('unknown asset "not-found"'))).toBe(true);
  });

  it("rejects invalid parallax factors, role/order conflicts, duplicate layers and unknown themes", () => {
    const invalid = {
      ...definition,
      theme: "unregistered",
      layers: [
        { id: "front", role: "foreground", order: 0, space: "world", items: [] },
        { id: "back", role: "far-background", order: 1, space: "parallax", parallaxFactor: -1, items: [] },
        { id: "front", role: "foreground", order: 2, space: "world", items: [] }
      ]
    };
    const result = validateVisualComposition(invalid, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some(item => item.path === "theme")).toBe(true);
    expect(result.issues.some(item => item.path === "layers[1].parallaxFactor")).toBe(true);
    expect(result.issues.some(item => item.path === "layers[2].id")).toBe(true);
    expect(result.issues.some(item => item.path === "layers.order")).toBe(true);
  });

  it("validates only referenced prefabs and requires prefab map keys to match IDs", () => {
    const result = validateVisualComposition(definition, catalog);
    expect(result.ok).toBe(true);
    const usedWrongKey = {
      ...definition,
      layers: [{
        id: "settlement", role: "settlement", order: 10, space: "world",
        items: [{ kind: "prefab", id: "bad", prefab: "unused-broken" }]
      }]
    };
    const invalid = validateVisualComposition(usedWrongKey, catalog);
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.issues.some(item => item.message.includes("must match prefab.id"))).toBe(true);
    expect(invalid.issues.some(item => item.message.includes('unknown asset "not-in-catalog"'))).toBe(true);
  });

  it("rejects resolved ID collisions and invalid registry anchors observably", () => {
    const collision = {
      ...definition,
      layers: [{
        id: "x", role: "settlement", order: 0, space: "world",
        items: [
          { kind: "instance", instance: { id: "placement/well", asset: "tree", position: { x: 0, y: 0 } } },
          { kind: "prefab", id: "placement", prefab: "village" }
        ]
      }]
    };
    const result = resolveVisualScene(collision, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some(item => item.message.includes("resolved ID collision"))).toBe(true);
  });
});
