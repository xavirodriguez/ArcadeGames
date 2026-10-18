import { BlueprintRegistry, World } from "@tiny-aster/core";
import { registerCollectibleTriggerBlueprint, registerStandardPlatformerCollectibles } from "../componentBuilders";

describe("Collectible Blueprint Characterization Tests", () => {
  it("registers collectible trigger blueprint and correctly spawns collectible entity", () => {
    const registry = new BlueprintRegistry();
    const world = new World();

    registerCollectibleTriggerBlueprint(registry, {
      id: "test_collectible",
      kind: "fragment",
      value: 10,
      size: 16,
      halfSize: 10,
      shape: "fragment",
      persistent: false,
      collectOnce: false
    });

    const entity = world.createEntity();
    const bp = registry.get("test_collectible");
    expect(bp).toBeDefined();
    bp?.spawn(world, entity, { x: 50, y: 100, id: "item_1" });

    const transform = world.getComponent(entity, "Transform");
    const collider2D = world.getComponent(entity, "Collider2D");
    const render = world.getComponent(entity, "Render");
    const collectible = world.getComponent(entity, "Collectible");

    expect(transform).toMatchObject({ x: 50, y: 100 });
    expect(collider2D).toMatchObject({
      shape: { type: "aabb", halfWidth: 10, halfHeight: 10 },
      isTrigger: true
    });
    expect(render).toMatchObject({
      shape: "fragment",
      size: 16,
      order: 1
    });
    expect(collectible).toMatchObject({
      type: "Collectible",
      kind: "fragment",
      value: 10,
      persistent: false,
      collectOnce: false,
      id: "item_1"
    });
  });

  it("registerStandardPlatformerCollectibles registers both fragment and core/coin blueprints", () => {
    const registry = new BlueprintRegistry();
    registerStandardPlatformerCollectibles(registry);

    expect(registry.has("collectible_fragment")).toBe(true);
    expect(registry.has("collectible_core")).toBe(true);
  });
});
