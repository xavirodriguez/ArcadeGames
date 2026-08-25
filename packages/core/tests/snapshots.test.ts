import { World, CoreComponentRegistry, TransformComponent, BinaryCompression, AoSWorldSnapshot, SoAWorldSnapshot, hashSoA } from "../src";

describe("World Snapshots", () => {
  it("should capture and restore world state", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    const transform: TransformComponent = {
      type: "Transform",
      x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    };
    world.addComponent(entity, transform);

    const snapshot = world.snapshot();
    expect(snapshot.entities).toContain(entity);
    expect((snapshot as AoSWorldSnapshot).componentData["Transform"][entity].x).toBe(10);

    // Modify world
    world.mutateComponent(entity, "Transform", (t) => {
      t.x = 50;
    });
    expect(world.getComponent(entity, "Transform")?.x).toBe(50);

    // Restore
    world.restore(snapshot);
    expect(world.getComponent(entity, "Transform")?.x).toBe(10);
  });

  it("should handle delta snapshots", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    const transform: TransformComponent = {
      type: "Transform",
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    };
    world.addComponent(entity, transform);

    const version1 = world.stateVersion;

    // No changes
    const delta1 = world.deltaSnapshot(version1);
    expect((delta1 as any).componentData).toEqual({});

    // Change something
    world.mutateComponent(entity, "Transform", (t) => {
      t.x = 100;
    });

    const delta2 = world.deltaSnapshot(version1);
    expect((delta2 as any).componentData!["Transform"][entity].x).toBe(100);
  });

  describe("SoA Snapshots", () => {
    it("should capture and restore world state in SoA format", () => {
      const world = new World<CoreComponentRegistry>();
      world.setResource("UseSoASnapshots", true);
      const entity = world.createEntity();

      const transform: TransformComponent = {
        type: "Transform",
        x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
        worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
        dirty: false
      };
      world.addComponent(entity, transform);

      const snapshot = world.snapshot();
      expect(snapshot.isSoA).toBe(true);
      expect((snapshot as SoAWorldSnapshot).soaComponentData).toBeDefined();
      expect((snapshot as SoAWorldSnapshot).soaComponentData!["Transform"].entities[0]).toBe(entity);

      // Modify world
      world.mutateComponent(entity, "Transform", (t) => {
        t.x = 50;
      });
      expect(world.getComponent(entity, "Transform")?.x).toBe(50);

      // Restore
      world.restore(snapshot);
      expect(world.getComponent(entity, "Transform")?.x).toBe(10);
    });

    it("should serialize and deserialize SoA snapshots via BinaryCompression without data loss", () => {
      const world = new World<CoreComponentRegistry>();
      world.setResource("UseSoASnapshots", true);
      const entity = world.createEntity();

      const transform: TransformComponent = {
        type: "Transform",
        x: 42.5, y: -99.9, rotation: Math.PI / 4, scaleX: 1, scaleY: 1,
        worldX: 42.5, worldY: -99.9, worldRotation: Math.PI / 4, worldScaleX: 1, worldScaleY: 1,
        dirty: true
      };
      world.addComponent(entity, transform);

      const snapshot = world.snapshot();
      expect(snapshot.isSoA).toBe(true);

      // Serialize and deserialize to binary
      const binary = BinaryCompression.pack(snapshot);
      expect(binary).toBeInstanceOf(Uint8Array);

      const unpacked = BinaryCompression.unpack(binary);
      expect(unpacked.isSoA).toBe(true);
      expect(unpacked.soaComponentData).toBeDefined();

      const transformData = unpacked.soaComponentData["Transform"];
      expect(transformData.entities[0]).toBe(entity);
      expect(transformData.values).toBeDefined();

      // Restore the world state from the unpacked binary snapshot
      const restoreWorld = new World<CoreComponentRegistry>();
      restoreWorld.restore(unpacked);

      const restoredComp = restoreWorld.getComponent(entity, "Transform");
      expect(restoredComp).toBeDefined();
      expect(restoredComp?.x).toBe(42.5);
      expect(restoredComp?.y).toBe(-99.9);
      expect(restoredComp?.dirty).toBe(true);
    });

    it("should compute deterministic hash for SoA snapshots and detect numeric and non-numeric changes", () => {
      const world1 = new World<CoreComponentRegistry>();
      world1.setResource("UseSoASnapshots", true);
      const entity1 = world1.createEntity();
      world1.addComponent(entity1, {
        type: "Transform",
        x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
        worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
        dirty: false
      });

      const world2 = new World<CoreComponentRegistry>();
      world2.setResource("UseSoASnapshots", true);
      const entity2 = world2.createEntity();
      world2.addComponent(entity2, {
        type: "Transform",
        x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
        worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
        dirty: false
      });

      const snap1 = world1.snapshot() as SoAWorldSnapshot;
      const snap2 = world2.snapshot() as SoAWorldSnapshot;

      const hash1 = hashSoA(snap1);
      const hash2 = hashSoA(snap2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);

      // Mutate numeric property
      world1.mutateComponent(entity1, "Transform", (t) => {
        t.x = 10.001;
      });
      const snap1Mutated = world1.snapshot() as SoAWorldSnapshot;
      const hash1Mutated = hashSoA(snap1Mutated);
      expect(hash1Mutated).not.toBe(hash1);
    });
  });
});
