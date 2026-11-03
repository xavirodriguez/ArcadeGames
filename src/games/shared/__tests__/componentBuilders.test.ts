import { BlueprintRegistry, CoreComponentRegistry, ShapeType, World } from "@tiny-aster/core";
import { registerCollectibleTriggerBlueprint, registerStandardPlatformerCollectibles, setupPlatformerMovementComponents, setupTilemapEntity } from "../componentBuilders";

describe("Shared platformer locomotion setup", () => {
  const config = {
    PLAYER_ACCEL: 800,
    PLAYER_SPEED: 240,
    PLAYER_DECEL: 1200,
    PLAYER_AIR_ACCEL: 400,
    PLAYER_AIR_DECEL: 600,
    PLAYER_JUMP_VEL: -350,
    PLAYER_MIN_JUMP_VEL: -150,
    RISE_GRAVITY: 980,
    FALL_GRAVITY: 1200
  };

  it("attaches an isolated locomotion profile and slide posture for Collider2D players", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    const collider2D: Collider2DComponent = {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
      layer: 1, mask: 0xffff, offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });

    setupPlatformerMovementComponents(world, entity, config);
    expect(world.getComponent(entity, "LocomotionProfile")).toMatchObject({
      type: "LocomotionProfile",
      ground: { maxSpeed: 240 },
      slide: { minEntrySpeed: 120 }
    });
    expect(world.getComponent(entity, "PlatformerPosture")).toMatchObject({
      current: "standing",
      standingHeight: 30,
      slidingHeight: 18
    });
  });

  it("supports legacy Collider box players without sharing mutable profile objects", () => {
    const world = new World<CoreComponentRegistry>();
    const first = world.createEntity();
    const second = world.createEntity();
    for (const entity of [first, second]) {
      const collider: ColliderComponent = {
        type: "Collider",
        shape: { type: ShapeType.Box, width: 20, height: 30 },
        layer: 1, mask: 0xffff, enabled: true, isTrigger: false
      });
      setupPlatformerMovementComponents(world, entity, config);
    }

    expect(world.getComponent(first, "PlatformerPosture")).toMatchObject({ standingHeight: 30, slidingHeight: 18 });
    const firstProfile = world.getMutableComponent(first, "LocomotionProfile");
    const secondProfile = world.getComponent(second, "LocomotionProfile");
    if (firstProfile) {
      firstProfile.ground.maxSpeed = 999;
    }
    expect(secondProfile?.ground.maxSpeed).toBe(240);
  });
});

describe("Shared platformer tilemap materials", () => {
  it("attaches serializable material presets used by authored tile material ids", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    setupTilemapEntity(world, entity, 40, [[1, 2, 3]], {
      1: { solid: true, materialId: "normal" },
      2: { solid: true, materialId: "ice" },
      3: { solid: true, materialId: "normal" }
    });

    expect(world.getComponent(entity, "Tilemap")).toMatchObject({
      physicsMaterials: {
        normal: { id: "normal", traction: 1 },
        ice: { id: "ice", traction: 0.12 }
      }
    });
  });
});

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
