import { World } from "../src/ecs/World";

describe("RNG Determinism and Snapshot Integrity", () => {
  it("should preserve RNG state across AoS snapshot and restore", () => {
    const world = new World();
    world.gameplayRandom.unlock();
    world.gameplayRandom.setSeed(42);

    // Generate some numbers
    const r1 = world.gameplayRandom.next();
    const r2 = world.gameplayRandom.next();

    // Snapshot the world state (AoS model)
    world.deleteResource("UseSoASnapshots");
    const snapshot = world.snapshot();

    // Generate more numbers post-snapshot
    const r3_original = world.gameplayRandom.next();
    const r4_original = world.gameplayRandom.next();

    // Restore the snapshot
    world.restore(snapshot);

    // Generate numbers post-restore and assert they match
    const r3_restored = world.gameplayRandom.next();
    const r4_restored = world.gameplayRandom.next();

    expect(r3_restored).toBe(r3_original);
    expect(r4_restored).toBe(r4_original);
    expect(r1).not.toBe(r3_original);
  });

  it("should preserve RNG state across SoA snapshot and restore", () => {
    const world = new World();
    world.gameplayRandom.unlock();
    world.gameplayRandom.setSeed(100);

    // Generate some numbers
    const r1 = world.gameplayRandom.next();
    const r2 = world.gameplayRandom.next();

    // Snapshot the world state (SoA model)
    world.setResource("UseSoASnapshots", true);
    const snapshot = world.snapshot();

    // Generate more numbers post-snapshot
    const r3_original = world.gameplayRandom.next();
    const r4_original = world.gameplayRandom.next();

    // Restore the snapshot
    world.restore(snapshot);

    // Generate numbers post-restore and assert they match
    const r3_restored = world.gameplayRandom.next();
    const r4_restored = world.gameplayRandom.next();

    expect(r3_restored).toBe(r3_original);
    expect(r4_restored).toBe(r4_original);
    expect(r1).not.toBe(r3_original);
  });

  it("should guarantee absolute sorting determinism in BroadPhase.sweepAndPrune (Shell Sort)", () => {
    const { BroadPhase } = require("../src/physics/collision/BroadPhase");
    const { ShapeType } = require("../src/physics/shapes/Shapes");
    const world = new World();

    // Spawn 5 overlapping and non-overlapping entities in specific positions
    const coords = [150, 10, 50, 200, 100];
    const entities = coords.map((x, idx) => {
      const e = world.createEntity();
      world.addComponent(e, {
        type: "Transform",
        x: x,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      } as any);
      world.addComponent(e, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 10 },
        enabled: true,
        isTrigger: false,
        layer: 1,
        mask: 1
      } as any);
      return e;
    });

    // Execute BroadPhase.sweepAndPrune multiple times to ensure stability
    const pairs1 = BroadPhase.sweepAndPrune(entities, world);
    const pairs2 = BroadPhase.sweepAndPrune(entities, world);

    expect(pairs1.length).toBe(pairs2.length);
    for (let i = 0; i < pairs1.length; i++) {
      expect(pairs1[i][0]).toBe(pairs2[i][0]);
      expect(pairs1[i][1]).toBe(pairs2[i][1]);
    }
  });

  it("should guarantee Query and World entities caching determinism", () => {
    const world = new World();
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    const e3 = world.createEntity();

    world.addComponent(e1, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as any);
    world.addComponent(e2, { type: "Transform", x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 } as any);

    const q = world.getQuery("Transform");

    // Rebuild and query active entities
    const list1 = [...q.getEntities()];
    const list2 = [...q.getEntities()];
    const allEntities1 = [...world.entities];
    const allEntities2 = [...world.entities];

    expect(list1).toEqual([e1, e2]);
    expect(list2).toEqual([e1, e2]);
    expect(allEntities1).toEqual([e1, e2, e3]);
    expect(allEntities2).toEqual([e1, e2, e3]);
  });
});
