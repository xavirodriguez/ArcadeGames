import { LevelVisualDefinition, VisualCompositionCatalog, resolveVisualScene, validateVisualComposition } from "../index";

const assets = new Map([
  ["house", { id: "house", anchor: "bottom-center" as const }],
  ["tree", { id: "tree", anchor: "center" as const }],
  ["plain", { id: "plain" }],
  ["bad-anchor", { id: "bad-anchor", anchor: "baseline" as never }]
]);
const catalog: VisualCompositionCatalog = {
  assets: { getAsset: id => assets.get(id) },
  themes: new Set(["sumi-e"]),
  prefabs: new Map([
    ["village", { schemaVersion: 1 as const, id: "village", instances: [{ id: "well", asset: "house", position: { x: 4, y: 5 } }] }],
    ["unused-broken", { schemaVersion: 1 as const, id: "wrong-key", instances: [{ id: "missing-asset", asset: "not-in-catalog", position: { x: 0, y: 0 } }] }]
  ])
};
const definition: LevelVisualDefinition = {
  schemaVersion: 1, id: "test.level", theme: "sumi-e",
  layers: [
    { id: "settlement", role: "settlement", order: 10, space: "world", position: { x: 100, y: 200 }, items: [
      { kind: "instance", instance: { id: "tree-1", asset: "tree", position: { x: 10, y: 30 }, opacity: 0.5 } },
      { kind: "prefab", id: "well-placement", prefab: "village", position: { x: 4, y: 5 } },
      { kind: "instance", instance: { id: "tree-2", asset: "tree", position: { x: 20, y: 40 } } }
    ] },
    { id: "foreground", role: "foreground", order: 20, space: "world", items: [
      { kind: "instance", instance: { id: "tree-3", asset: "tree", position: { x: 0, y: 0 } } }
    ] }
  ]
};
const paths = (result: ReturnType<typeof validateVisualComposition>) => result.ok ? [] : result.issues.map(issue => issue.path);
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

describe("declarative visual composition", () => {
  it("resolves stable layer/item order, offsets, and complete defaults", () => {
    const first = resolveVisualScene(definition, catalog);
    expect(resolveVisualScene(definition, catalog)).toEqual(first);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.instances.map(i => i.id)).toEqual(["settlement/tree-1", "settlement/well-placement/well", "settlement/tree-2", "foreground/tree-3"]);
    expect(first.value.instances[1].position).toEqual({ x: 108, y: 210 });
    expect(first.value.instances[0]).toMatchObject({ position: { x: 110, y: 230 }, scale: { x: 1, y: 1 }, rotation: 0, flipX: false, opacity: 0.5, anchor: "center" });
  });

  it("rejects unknown keys, instance space, and invalid scale/opacity", () => {
    const invalid = { ...definition, layers: [{ id: "settlement", role: "settlement", order: 0, space: "world", items: [
      { kind: "instance", instance: { id: "tree", asset: "tree", position: { x: 0, y: 0 }, opacty: 0.5, space: "screen", opacity: 2, scale: { x: 0, y: 1 } } }
    ] }] };
    const p = paths(validateVisualComposition(invalid, catalog));
    expect(p).toContain("layers[0].items[0].instance.opacty");
    expect(p).toContain("layers[0].items[0].instance.space");
    expect(p).toContain("layers[0].items[0].instance.opacity");
    expect(p).toContain("layers[0].items[0].instance.scale");
  });

  it("rejects duplicate instance IDs within one layer", () => {
    const invalid = { ...definition, layers: [{ id: "same", role: "settlement", order: 0, space: "world", items: [
      { kind: "instance", instance: { id: "dup", asset: "tree", position: { x: 0, y: 0 } } },
      { kind: "instance", instance: { id: "dup", asset: "house", position: { x: 1, y: 1 } } }
    ] }] };
    expect(paths(validateVisualComposition(invalid, catalog))).toContain("layers[0].items[1].instance.id");
  });

  it("allows same local instance ID in different layers because resolved IDs are namespaced", () => {
    const d = { ...definition, layers: [
      { id: "back", role: "far-background", order: 0, space: "world", items: [{ kind: "instance", instance: { id: "dup", asset: "tree", position: { x: 0, y: 0 } } }] },
      { id: "front", role: "foreground", order: 1, space: "world", items: [{ kind: "instance", instance: { id: "dup", asset: "tree", position: { x: 0, y: 0 } } }] }
    ] };
    const r = resolveVisualScene(d as LevelVisualDefinition, catalog);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.instances.map(i => i.id)).toEqual(["back/dup", "front/dup"]);
  });

  it("breaks equal order ties by locale-independent code-unit ordering", () => {
    const d = { ...definition, layers: [
      { id: "a-layer", role: "settlement", order: 1, space: "world", items: [{ kind: "instance", instance: { id: "a", asset: "tree", position: { x: 0, y: 0 } } }] },
      { id: "Z-layer", role: "settlement", order: 1, space: "world", items: [{ kind: "instance", instance: { id: "z", asset: "tree", position: { x: 0, y: 0 } } }] }
    ] };
    const r = resolveVisualScene(d as LevelVisualDefinition, catalog);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.instances.map(i => i.layerId)).toEqual(["Z-layer", "a-layer"]);
  });

  it("rejects unsupported schemaVersion and non-object input", () => {
    expect(paths(validateVisualComposition({ ...definition, schemaVersion: 2 }, catalog))).toContain("schemaVersion");
    expect(paths(validateVisualComposition(null, catalog))).toContain("$");
    expect(paths(validateVisualComposition([], catalog))).toContain("$");
  });

  it.each([Number.NaN, Infinity, -Infinity])("rejects non-finite coordinates: %s", value => {
    const d = { ...definition, layers: [{ id: "x", role: "settlement", order: 0, space: "world", items: [
      { kind: "instance", instance: { id: "bad", asset: "tree", position: { x: value, y: 0 } } }
    ] }] };
    expect(paths(validateVisualComposition(d, catalog))).toContain("layers[0].items[0].instance.position");
  });

  it("rejects non-finite rotation and non-boolean flipX", () => {
    const d = { ...definition, layers: [{ id: "x", role: "settlement", order: 0, space: "world", items: [
      { kind: "instance", instance: { id: "bad", asset: "tree", position: { x: 0, y: 0 }, rotation: Infinity, flipX: "yes" } }
    ] }] };
    const p = paths(validateVisualComposition(d, catalog));
    expect(p).toContain("layers[0].items[0].instance.rotation");
    expect(p).toContain("layers[0].items[0].instance.flipX");
  });

  it("requires parallaxFactor for parallax layers", () => {
    const d = { ...definition, layers: [{ id: "mist", role: "atmosphere", order: 0, space: "parallax", items: [] }] };
    expect(paths(validateVisualComposition(d, catalog))).toContain("layers[0].parallaxFactor");
  });

  it("puts parallaxFactor in camera IR only for parallax instances", () => {
    const d = { ...definition, layers: [
      { id: "world", role: "settlement", order: 0, space: "world", items: [{ kind: "instance", instance: { id: "w", asset: "tree", position: { x: 0, y: 0 } } }] },
      { id: "screen", role: "effects", order: 1, space: "screen", items: [{ kind: "instance", instance: { id: "s", asset: "tree", position: { x: 0, y: 0 } } }] },
      { id: "parallax", role: "far-background", order: -1, space: "parallax", parallaxFactor: 0.35, items: [{ kind: "instance", instance: { id: "p", asset: "tree", position: { x: 0, y: 0 } } }] }
    ] };
    const r = resolveVisualScene(d as LevelVisualDefinition, catalog);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const byId = new Map(r.value.instances.map(i => [i.id, i]));
      expect(byId.get("parallax/p")?.parallaxFactor).toBe(0.35);
      expect("parallaxFactor" in byId.get("world/w")!).toBe(false);
      expect("parallaxFactor" in byId.get("screen/s")!).toBe(false);
    }
  });

  it("defaults anchor when asset metadata omits it", () => {
    const d = { ...definition, layers: [{ id: "x", role: "settlement", order: 0, space: "world", items: [
      { kind: "instance", instance: { id: "plain", asset: "plain", position: { x: 0, y: 0 } } }
    ] }] };
    const r = resolveVisualScene(d as LevelVisualDefinition, catalog);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.instances[0]).toMatchObject({ anchor: "bottom-center", rotation: 0, flipX: false });
  });

  it("reports invalid registry anchors and resolved ID collisions", () => {
    const bad = { ...definition, layers: [{ id: "x", role: "settlement", order: 0, space: "world", items: [
      { kind: "instance", instance: { id: "bad", asset: "bad-anchor", position: { x: 0, y: 0 } } }
    ] }] };
    const anchorResult = resolveVisualScene(bad as LevelVisualDefinition, catalog);
    expect(anchorResult.ok).toBe(false);
    if (!anchorResult.ok) expect(anchorResult.issues.some(i => i.message.includes("unsupported anchor"))).toBe(true);
    const collision = { ...definition, layers: [{ id: "x", role: "settlement", order: 0, space: "world", items: [
      { kind: "instance", instance: { id: "placement/well", asset: "tree", position: { x: 0, y: 0 } } },
      { kind: "prefab", id: "placement", prefab: "village" }
    ] }] };
    const collisionResult = resolveVisualScene(collision as LevelVisualDefinition, catalog);
    expect(collisionResult.ok).toBe(false);
    if (!collisionResult.ok) expect(collisionResult.issues.some(i => i.message.includes("resolved ID collision"))).toBe(true);
  });

  it("validates only referenced prefabs and checks map key against prefab.id", () => {
    expect(validateVisualComposition(definition, catalog).ok).toBe(true);
    const d = { ...definition, layers: [{ id: "x", role: "settlement", order: 0, space: "world", items: [
      { kind: "prefab", id: "bad", prefab: "unused-broken" }
    ] }] };
    const p = paths(validateVisualComposition(d, catalog));
    expect(p).toContain("prefabs.unused-broken");
    expect(p.some(path => path.endsWith(".asset"))).toBe(true);
  });

  it("validates theme, parallax, role/order, and duplicate layers independently", () => {
    expect(paths(validateVisualComposition({ ...definition, theme: "unregistered" }, catalog))).toContain("theme");
    const parallax = { ...definition, layers: [{ id: "mist", role: "atmosphere", order: 0, space: "parallax", parallaxFactor: -1, items: [] }] };
    expect(paths(validateVisualComposition(parallax, catalog))).toContain("layers[0].parallaxFactor");
    const order = { ...definition, layers: [
      { id: "front", role: "foreground", order: 0, space: "world", items: [] },
      { id: "back", role: "far-background", order: 1, space: "world", items: [] }
    ] };
    expect(paths(validateVisualComposition(order, catalog))).toContain("layers.order");
    const dup = { ...definition, layers: [
      { id: "same", role: "settlement", order: 0, space: "world", items: [] },
      { id: "same", role: "settlement", order: 1, space: "world", items: [] }
    ] };
    expect(paths(validateVisualComposition(dup, catalog))).toContain("layers[1].id");
  });

  it("does not mutate deep-frozen inputs/catalog or alias resolved transforms", () => {
    const d = deepFreeze({
      schemaVersion: 1 as const, id: "immutable.level", theme: "sumi-e",
      layers: [{ id: "settlement", role: "settlement" as const, order: 0, space: "world" as const, position: { x: 10, y: 20 },
        items: [{ kind: "instance" as const, instance: { id: "tree", asset: "tree", position: { x: 1, y: 2 } } }]
      }]
    });
    const c = deepFreeze(catalog);
    const before = JSON.stringify(d);
    const r = resolveVisualScene(d, c);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(d)).toBe(before);
    if (!r.ok) return;
    (r.value.instances[0].position as { x: number; y: number }).x = 999;
    if (d.layers[0].items[0].kind === "instance") expect(d.layers[0].items[0].instance.position.x).toBe(1);
    expect(d.layers[0].position.x).toBe(10);
  });
});
