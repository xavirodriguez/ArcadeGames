import {
  LevelVisualDefinition,
  VisualCompositionCatalog,
  resolveVisualScene,
  validateVisualComposition
} from "../index";

const assets = new Map([
  ["house", { id: "house", anchor: "bottom-center" as const }],
  ["tree", { id: "tree", anchor: "center" as const }]
]);
const catalog: VisualCompositionCatalog = {
  assets: { getAsset: id => assets.get(id) },
  prefabs: new Map([
    ["village", {
      schemaVersion: 1 as const,
      id: "village",
      instances: [{ id: "well", asset: "house", position: { x: 4, y: 5 }, space: "world" as const }]
    }]
  ])
};

const definition: LevelVisualDefinition = {
  schemaVersion: 1,
  id: "test.level",
  theme: "sumi-e",
  layers: [
    {
      id: "foreground",
      role: "foreground",
      order: 20,
      space: "world",
      instances: [{ id: "tree-1", asset: "tree", position: { x: 10, y: 30 }, opacity: 0.5, space: "world" }]
    },
    {
      id: "settlement",
      role: "settlement",
      order: 10,
      space: "world",
      prefab: "village",
      position: { x: 100, y: 200 }
    }
  ]
};

describe("declarative visual composition", () => {
  it("resolves fixed instances in stable layer order with defaults", () => {
    const first = resolveVisualScene(definition, catalog);
    const second = resolveVisualScene(definition, catalog);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) return;
    expect(first.value.instances.map(instance => instance.id)).toEqual(["settlement/well", "tree-1"]);
    expect(first.value.instances[0].position).toEqual({ x: 104, y: 205 });
    expect(first.value.instances[0].scale).toEqual({ x: 1, y: 1 });
    expect(first.value.instances[1].opacity).toBe(0.5);
    expect(first.value.instances[1].anchor).toBe("center");
  });

  it("reports unsupported schema versions, duplicate IDs, missing assets and invalid transforms", () => {
    const invalid = {
      ...definition,
      schemaVersion: 2,
      layers: [
        {
          id: "same", role: "foreground", order: 0, space: "world",
          instances: [
            { id: "dup", asset: "missing", position: { x: Number.NaN, y: 0 }, space: "world", opacity: 2, scale: { x: 0, y: 1 } },
            { id: "dup", asset: "tree", position: { x: 0, y: 0 }, space: "world" }
          ]
        }
      ]
    };
    const result = validateVisualComposition(invalid, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.issues.map(item => item.path);
    expect(paths).toContain("schemaVersion");
    expect(paths).toContain("layers[0].instances[0].position");
    expect(paths).toContain("layers[0].instances[0].opacity");
    expect(paths).toContain("layers[0].instances[0].scale");
    expect(paths).toContain("layers[0].instances[1].id");
    expect(result.issues.some(item => item.message.includes('unknown asset "missing"'))).toBe(true);
  });

  it("rejects negative parallax factors and duplicate layer IDs", () => {
    const invalid = {
      ...definition,
      layers: [
        { id: "x", role: "foreground", order: 0, space: "parallax", parallaxFactor: -1, instances: [] },
        { id: "x", role: "foreground", order: 1, space: "world", instances: [] }
      ]
    };
    const result = validateVisualComposition(invalid, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some(item => item.path === "layers[0].parallaxFactor")).toBe(true);
    expect(result.issues.some(item => item.path === "layers[1].id")).toBe(true);
  });

  it("rejects unknown prefab references", () => {
    const invalid = {
      ...definition,
      layers: [{ id: "village", role: "settlement", order: 0, space: "world", prefab: "missing" }]
    };
    const result = validateVisualComposition(invalid, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some(item => item.path === "layers[0].prefab")).toBe(true);
  });
});
