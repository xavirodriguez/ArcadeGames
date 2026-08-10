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
});
