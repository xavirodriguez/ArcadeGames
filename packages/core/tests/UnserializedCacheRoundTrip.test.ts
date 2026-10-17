import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { SpatialPartitioningSystem } from "../src/systems/SpatialPartitioningSystem";
import { ShapeType } from "../src/physics/shapes/Shapes";
import { SystemPhase } from "../src/ecs/System";
import { hashSoA, hashAoS } from "../src/snapshots/SnapshotHash";
import { SoAWorldSnapshot, AoSWorldSnapshot } from "../src/snapshots/WorldSnapshot";

function computeWorldHash(world: World): string {
  const snap = world.snapshot();
  if (snap.isSoA) {
    return hashSoA(snap as SoAWorldSnapshot);
  }
  const aosSnap = snap as AoSWorldSnapshot;
  return hashAoS({
    tick: aosSnap.tick,
    entities: aosSnap.entities,
    componentData: aosSnap.componentData,
    seed: aosSnap.seed,
    rngState: aosSnap.rngState
  });
}

/**
 * Unserialized Cache Contract Round-Trip Tests (Task 4.4)
 */
describe("Unserialized Cache Contract Round-Trip Tests (Task 4.4)", () => {
  it("should produce identical state hash after snapshot() -> restore() in systems with transient caches", () => {
    const world1 = new World<CoreComponentRegistry>();
    world1.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Collision });
    world1.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });

    // Spawn 2 colliding circles and 1 spatial node entity
    const e1 = world1.createEntity();
    world1.addComponent(e1, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world1.addComponent(e1, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 15 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false
    });
    world1.addComponent(e1, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    const e2 = world1.createEntity();
    world1.addComponent(e2, {
      type: "Transform",
      x: 10,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world1.addComponent(e2, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 15 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false
    });
    world1.addComponent(e2, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    const e3 = world1.createEntity();
    world1.addComponent(e3, {
      type: "Transform",
      x: 250,
      y: 350,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 250,
      worldY: 350,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world1.addComponent(e3, {
      type: "SpatialNode",
      gridX: 0,
      gridY: 0,
      active: false
    });

    // Run 5 ticks to populate internal collision & spatial caches
    for (let i = 0; i < 5; i++) {
      world1.update(1 / 60);
    }

    const hashBeforeSnapshot = computeWorldHash(world1);
    const snapshot = world1.snapshot();

    // Instantiate world2 and restore from snapshot
    const world2 = new World<CoreComponentRegistry>();
    world2.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Collision });
    world2.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });

    world2.restore(snapshot);

    // Verify immediate restored hash parity
    expect(computeWorldHash(world2)).toBe(hashBeforeSnapshot);

    // Run 1 tick on both worlds so transient caches reconstruct
    world1.update(1 / 60);
    world2.update(1 / 60);

    // Parity check post-reconstruction tick
    expect(computeWorldHash(world2)).toBe(computeWorldHash(world1));

    // Check collision event components in both worlds match exactly
    const colEvents1 = world1.getComponent(e1, "CollisionEvents")!;
    const colEvents2 = world2.getComponent(e1, "CollisionEvents")!;
    expect(colEvents2.collisions.length).toBe(colEvents1.collisions.length);
    expect(colEvents2.collisions[0].otherEntity).toBe(colEvents1.collisions[0].otherEntity);

    // Check spatial node in both worlds match exactly
    const spatial1 = world1.getComponent(e3, "SpatialNode")!;
    const spatial2 = world2.getComponent(e3, "SpatialNode")!;
    expect(spatial2.gridX).toBe(spatial1.gridX);
    expect(spatial2.gridY).toBe(spatial1.gridY);
  });
});
