import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { TileCollisionSystem } from "../src/physics/systems/TileCollisionSystem";
import { PlatformerMovementSystem } from "../src/physics/systems/PlatformerMovementSystem";
import { PHYSICS_MATERIAL_PRESETS } from "../src/physics/PhysicsMaterials";
import { SnapshotSerializer } from "../src/snapshots/SnapshotSerializer";
import { hashAoS } from "../src/snapshots/SnapshotHash";

describe("Locomotion v1 physics contacts and materials", () => {
  const addTransform = (world: World<CoreComponentRegistry>, entity: number, x: number, y: number) => {
    world.addComponent(entity, {
      type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: x, worldY: y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
  };

  const addPlayer = (world: World<CoreComponentRegistry>, x: number, y: number, vx: number, vy: number) => {
    const entity = world.createEntity();
    addTransform(world, entity, x, y);
    world.addComponent(entity, { type: "Velocity", vx, vy, angularVelocity: 0 });
    world.addComponent(entity, {
      type: "Collider2D", shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
      layer: 1, mask: 0xffff, offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });
    world.addComponent(entity, { type: "Tag", tags: ["TileCollider"] });
    world.addComponent(entity, { type: "PlatformerGroundState", isGrounded: false });
    world.addComponent(entity, { type: "PhysicsContactState", contacts: [], isGrounded: false });
    return entity;
  };

  it("publishes ground contact, material identity and conveyor velocity", () => {
    const world = new World<CoreComponentRegistry>();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap", data: [[0, 0, 0], [1, 1, 1]], tileSize: 40,
      tileDefinitions: { 1: { solid: true, materialId: "belt" } },
      physicsMaterials: { belt: { ...PHYSICS_MATERIAL_PRESETS.conveyor, id: "belt" } }
    });
    addTransform(world, tilemap, 0, 0);
    const player = addPlayer(world, 40, 30, 0, 100);

    new TileCollisionSystem().update(world, 0.1);

    const state = world.getComponent(player, "PhysicsContactState")!;
    expect(state.isGrounded).toBe(true);
    expect(state.groundContact?.entity).toBe(tilemap);
    expect(state.groundContact?.normal).toEqual({ x: 0, y: -1 });
    expect(state.groundContact?.materialId).toBe("belt");
    expect(state.groundContact?.surfaceVelocity).toEqual({ x: 120, y: 0 });
  });

  it("resolves the legacy Collider box used by the Platformer game", () => {
    const world = new World<CoreComponentRegistry>();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap", data: [[0, 0, 0], [1, 1, 1]], tileSize: 40,
      tileDefinitions: { 1: { solid: true, materialId: "normal" } },
      physicsMaterials: { normal: PHYSICS_MATERIAL_PRESETS.normal }
    });
    addTransform(world, tilemap, 0, 0);
    const player = world.createEntity();
    addTransform(world, player, 40, 30);
    world.addComponent(player, { type: "Velocity", vx: 0, vy: 100, angularVelocity: 0 });
    world.addComponent(player, {
      type: "Collider",
      shape: { type: 1, width: 20, height: 30 },
      layer: 1, mask: 0xffff, enabled: true, isTrigger: false
    });
    world.addComponent(player, { type: "Tag", tags: ["TileCollider"] });
    world.addComponent(player, { type: "PlatformerGroundState", isGrounded: false });
    world.addComponent(player, { type: "PhysicsContactState", contacts: [], isGrounded: false });

    new TileCollisionSystem().update(world, 0.1);

    expect(world.getComponent(player, "PlatformerGroundState")?.isGrounded).toBe(true);
    expect(world.getComponent(player, "PhysicsContactState")?.groundContact?.materialId).toBe("normal");
  });

  it("uses material restitution on landing", () => {
    const world = new World<CoreComponentRegistry>();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap", data: [[0, 0, 0], [1, 1, 1]], tileSize: 40,
      tileDefinitions: { 1: { solid: true, materialId: "spring" } },
      physicsMaterials: { spring: { ...PHYSICS_MATERIAL_PRESETS.elastic, id: "spring", restitution: 0.5 } }
    });
    addTransform(world, tilemap, 0, 0);
    const player = addPlayer(world, 40, 30, 0, 100);

    new TileCollisionSystem().update(world, 0.1);

    expect(world.getComponent(player, "Velocity")?.vy).toBe(-50);
    expect(world.getComponent(player, "PhysicsContactState")?.isGrounded).toBe(false);
  });

  it("applies traction and surface friction to grounded movement", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 });
    world.addComponent(entity, {
      type: "PlatformerMovementConfig", acceleration: 1000, maxSpeed: 200,
      deceleration: 1000, airAcceleration: 500, airDeceleration: 500
    });
    world.addComponent(entity, {
      type: "PlatformerInput", moveDir: 1, jumpPressed: false, jumpHeld: false, jumpReleased: false
    });
    world.addComponent(entity, { type: "PlatformerGroundState", isGrounded: true });
    world.addComponent(entity, {
      type: "PhysicsContactState", contacts: [], isGrounded: true,
      groundContact: {
        entity: 999, point: { x: 0, y: 0 }, normal: { x: 0, y: -1 }, separation: 0,
        materialId: "ice", surfaceVelocity: { x: 0, y: 0 }, material: PHYSICS_MATERIAL_PRESETS.ice
      }
    });

    new PlatformerMovementSystem().update(world, 0.1);

    expect(world.getComponent(entity, "Velocity")?.vx).toBeGreaterThan(100);
    expect(world.getComponent(entity, "Velocity")?.vx).toBeLessThan(200);
  });

  it("produces the same snapshot hash for identical fixed-step contact simulations", () => {
    const createWorld = () => {
      const world = new World<CoreComponentRegistry>();
      const tilemap = world.createEntity();
      world.addComponent(tilemap, {
        type: "Tilemap", data: [[0, 0, 0], [1, 1, 1]], tileSize: 40,
        tileDefinitions: { 1: { solid: true, materialId: "ice" } },
        physicsMaterials: { ice: PHYSICS_MATERIAL_PRESETS.ice }
      });
      addTransform(world, tilemap, 0, 0);
      addPlayer(world, 40, 30, 0, 100);
      return world;
    };
    const first = createWorld();
    const second = createWorld();
    const collision = new TileCollisionSystem();

    for (let tick = 0; tick < 8; tick++) {
      collision.update(first, 1 / 60);
      collision.update(second, 1 / 60);
    }

    expect(hashAoS(SnapshotSerializer.snapshot(first))).toBe(hashAoS(SnapshotSerializer.snapshot(second)));
  });

  it("clears stale contact state when no tilemap exists", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "PhysicsContactState", contacts: [{
        entity: 42, point: { x: 0, y: 0 }, normal: { x: 0, y: -1 }, separation: 0,
        surfaceVelocity: { x: 0, y: 0 }
      }], isGrounded: true
    });

    new TileCollisionSystem().update(world, 1 / 60);

    expect(world.getComponent(entity, "PhysicsContactState")?.contacts).toEqual([]);
    expect(world.getComponent(entity, "PhysicsContactState")?.isGrounded).toBe(false);
  });
});
