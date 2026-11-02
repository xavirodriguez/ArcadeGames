import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { TileCollisionSystem } from "../src/physics/systems/TileCollisionSystem";
import { SnapshotSerializer } from "../src/snapshots/SnapshotSerializer";
import { hashAoS } from "../src/snapshots/SnapshotHash";

describe("Locomotion B4 slope contacts", () => {
  const createWorld = (
    slope: { start: { x: number; y: number }; end: { x: number; y: number }; maxWalkableAngleDegrees?: number },
    x: number,
    y: number,
    vx: number,
    vy: number
  ) => {
    const world = new World<CoreComponentRegistry>();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: [[1]],
      tileSize: 40,
      tileDefinitions: { 1: { solid: true, slope } }
    });
    world.addComponent(tilemap, {
      type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: x, worldY: y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    world.addComponent(player, { type: "Velocity", vx, vy, angularVelocity: 0 });
    world.addComponent(player, {
      type: "Collider2D", shape: { type: "aabb", halfWidth: 4, halfHeight: 5 },
      layer: 1, mask: 0xffff, offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });
    world.addComponent(player, { type: "Tag", tags: ["TileCollider"] });
    world.addComponent(player, { type: "PlatformerGroundState", isGrounded: false });
    world.addComponent(player, { type: "PhysicsContactState", contacts: [], isGrounded: false });
    return { world, player };
  };

  it("projects velocity onto a stable uphill tangent and resolves the foot to the surface", () => {
    const { world, player } = createWorld(
      { start: { x: 0, y: 40 }, end: { x: 40, y: 0 } }, 20, 15, 100, 600
    );

    new TileCollisionSystem().update(world, 0.01);

    const transform = world.getComponent(player, "Transform")!;
    const velocity = world.getComponent(player, "Velocity")!;
    const state = world.getComponent(player, "PhysicsContactState")!;
    expect(transform.x).toBeCloseTo(18, 5);
    expect(transform.y).toBeCloseTo(13, 5);
    expect(state.isGrounded).toBe(true);
    expect(state.groundContact?.normal.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(state.groundContact?.normal.y).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(state.groundContact?.point.x).toBeCloseTo(22, 5);
    expect(state.groundContact?.point.y).toBeCloseTo(18, 5);
    const expectedTangentSpeed = (100 - 600) / Math.SQRT2 + 0.6 * 980 * Math.SQRT1_2 * 0.01;
    expect(velocity.vx).toBeCloseTo(expectedTangentSpeed * Math.SQRT1_2, 4);
    expect(velocity.vy).toBeCloseTo(-expectedTangentSpeed * Math.SQRT1_2, 4);
  });

  it("resolves a descending-to-the-right ramp with a normalized upward normal", () => {
    const { world, player } = createWorld(
      { start: { x: 0, y: 0 }, end: { x: 40, y: 40 } }, 20, 15, 100, 600
    );

    new TileCollisionSystem().update(world, 0.01);

    const state = world.getComponent(player, "PhysicsContactState")!;
    const velocity = world.getComponent(player, "Velocity")!;
    expect(state.isGrounded).toBe(true);
    expect(state.groundContact?.normal.x).toBeCloseTo(Math.SQRT1_2, 5);
    expect(state.groundContact?.normal.y).toBeCloseTo(-Math.SQRT1_2, 5);
    const expectedTangentSpeed = (100 + 600) / Math.SQRT2 - 0.6 * 980 * Math.SQRT1_2 * 0.01;
    expect(velocity.vx).toBeCloseTo(expectedTangentSpeed * Math.SQRT1_2, 4);
    expect(velocity.vy).toBeCloseTo(expectedTangentSpeed * Math.SQRT1_2, 4);
  });

  it("produces identical slope contact snapshots for identical fixed-step worlds", () => {
    const first = createWorld({ start: { x: 0, y: 40 }, end: { x: 40, y: 0 } }, 20, 15, 100, 60);
    const second = createWorld({ start: { x: 0, y: 40 }, end: { x: 40, y: 0 } }, 20, 15, 100, 60);
    const collision = new TileCollisionSystem();
    for (let tick = 0; tick < 8; tick++) {
      collision.update(first.world, 1 / 60);
      collision.update(second.world, 1 / 60);
    }
    expect(hashAoS(SnapshotSerializer.snapshot(first.world))).toBe(hashAoS(SnapshotSerializer.snapshot(second.world)));
  });

  it("does not classify a slope steeper than its walkable-angle limit as ground", () => {
    const { world, player } = createWorld(
      { start: { x: 0, y: 40 }, end: { x: 40, y: 0 }, maxWalkableAngleDegrees: 30 },
      20, 25, 0, 60
    );

    new TileCollisionSystem().update(world, 0.1);

    const state = world.getComponent(player, "PhysicsContactState")!;
    expect(state.isGrounded).toBe(false);
    expect(state.groundContact).toBeUndefined();
    expect(state.contacts.length).toBe(1);
  });

  it("uses static friction to prevent a stationary body slipping down a walkable slope", () => {
    const { world, player } = createWorld(
      { start: { x: 0, y: 40 }, end: { x: 40, y: 40 - 40 / Math.sqrt(3) } }, 20, 25, 0, 60
    );

    new TileCollisionSystem().update(world, 0.1);

    const velocity = world.getComponent(player, "Velocity")!;
    expect(velocity.vx).toBeCloseTo(0, 5);
    expect(velocity.vy).toBeCloseTo(0, 5);
  });
});
