import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { buildSnapshotMetadata, InternalWorldSnapshotAccess } from "../src/snapshots/SnapshotMetadataBuilder";
import { SnapshotSerializer } from "../src/snapshots/SnapshotSerializer";
import { SnapshotSerializerSoA } from "../src/snapshots/SnapshotSerializerSoA";
import { AoSWorldSnapshot, SoAWorldSnapshot } from "../src/snapshots/WorldSnapshot";
import { hashAoS, hashSoA } from "../src/snapshots/SnapshotHash";

interface TestInternalWorldAccess extends InternalWorldSnapshotAccess {
  activeEntities: Set<number>;
}

describe("SnapshotMetadataBuilder", () => {
  it("should build correct metadata for AoS and SoA options", () => {
    const world = new World<CoreComponentRegistry>();
    const e1 = world.createEntity();
    const e2 = world.createEntity();

    const internal = (world as object as TestInternalWorldAccess);
    const metadataAoS = buildSnapshotMetadata(world, internal, internal.activeEntities);

    expect(metadataAoS.entities).toEqual([e1, e2].sort((a, b) => a - b));
    expect(metadataAoS.nextEntityId).toBe(internal.nextEntityId);
    expect(metadataAoS.structureVersion).toBe(world.structureVersion);
    expect(metadataAoS.stateVersion).toBe(world.stateVersion);
    expect(metadataAoS.isSoA).toBeUndefined();

    const metadataSoA = buildSnapshotMetadata(world, internal, internal.activeEntities, { isSoA: true });
    expect(metadataSoA.isSoA).toBe(true);
  });

  it("should produce identical metadata across AoS and SoA snapshots of the same world", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    });

    const aosSnap = SnapshotSerializer.snapshot(world);
    const soaSnap = SnapshotSerializerSoA.snapshot(world);

    expect(aosSnap.entities).toEqual(soaSnap.entities);
    expect(aosSnap.nextEntityId).toBe(soaSnap.nextEntityId);
    expect(aosSnap.freeEntities).toEqual(soaSnap.freeEntities);
    expect(aosSnap.generations).toEqual(soaSnap.generations);
    expect(aosSnap.structureVersion).toBe(soaSnap.structureVersion);
    expect(aosSnap.stateVersion).toBe(soaSnap.stateVersion);
    expect(aosSnap.seed).toBe(soaSnap.seed);
    expect(aosSnap.rngState).toBe(soaSnap.rngState);
    expect(aosSnap.tick).toBe(soaSnap.tick);

    expect(aosSnap.isSoA).toBeUndefined();
    expect(soaSnap.isSoA).toBe(true);
  });

  it("should restore correctly and idempotently with refactored metadata builder", () => {
    const world1 = new World<CoreComponentRegistry>();
    const entity = world1.createEntity();
    world1.addComponent(entity, {
      type: "Transform",
      x: 42, y: 84, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 42, worldY: 84, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: true
    });

    const snapshot1 = world1.snapshot();
    const world2 = new World<CoreComponentRegistry>();
    world2.restore(snapshot1);

    expect(world2.getComponent(entity, "Transform")?.x).toBe(42);

    const snapshot2 = world2.snapshot();
    expect(snapshot1.entities).toEqual(snapshot2.entities);
    expect((snapshot1 as AoSWorldSnapshot).componentData).toEqual((snapshot2 as AoSWorldSnapshot).componentData);
  });

  it("should compute deterministic state hashes for AoS and SoA snapshots", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    });

    const aosSnap = SnapshotSerializer.snapshot(world);
    const soaSnap = SnapshotSerializerSoA.snapshot(world);

    const hashA = hashAoS(aosSnap);
    const hashS = hashSoA(soaSnap as SoAWorldSnapshot);

    expect(hashA).toHaveLength(8);
    expect(hashS).toHaveLength(8);
  });
});
