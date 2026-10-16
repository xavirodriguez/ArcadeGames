import { World } from "../../ecs/World";
import { CollisionSystem2D } from "../../physics/collision/CollisionSystems";
import { SnapshotSerializer } from "../SnapshotSerializer";
import { SnapshotSerializerSoA } from "../SnapshotSerializerSoA";
import { SnapshotRestore } from "../SnapshotRestore";
import { SnapshotRestoreSoA } from "../SnapshotRestoreSoA";
import { hashAoS, hashSoA } from "../SnapshotHash";
import { ShapeType, CircleShape } from "../../physics/shapes/Shapes";

function setupWorld(): World {
  const world = new World();
  world.addSystem(new CollisionSystem2D());

  for (let i = 0; i < 15; i++) {
    const e = world.createEntity();
    world.addComponent(e, {
      type: "Transform",
      x: i * 20,
      y: i * 15,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: i * 20,
      worldY: i * 15,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(e, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 10 } as CircleShape,
      layer: 1,
      mask: 1,
      enabled: true,
      isTrigger: false,
      offsetX: 0,
      offsetY: 0
    });
  }

  world.update(0.016);
  return world;
}

describe("Snapshot Round-Trip Tests", () => {
  it("should maintain identical state hash after AoS snapshot -> restore -> snapshot round-trip", () => {
    const world = setupWorld();

    const snap1 = SnapshotSerializer.snapshot(world);
    const hash1 = hashAoS(snap1);

    SnapshotRestore.restore(world, snap1);

    const snap2 = SnapshotSerializer.snapshot(world);
    const hash2 = hashAoS(snap2);

    expect(hash2).toBe(hash1);
  });

  it("should maintain identical state hash after SoA snapshot -> restore -> snapshot round-trip", () => {
    const world = setupWorld();

    const snap1 = SnapshotSerializerSoA.snapshot(world);
    const hash1 = hashSoA(snap1);

    SnapshotRestoreSoA.restore(world, snap1);

    const snap2 = SnapshotSerializerSoA.snapshot(world);
    const hash2 = hashSoA(snap2);

    expect(hash2).toBe(hash1);
  });
});
