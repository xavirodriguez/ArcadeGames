import {
  World,
  CoreComponentRegistry,
  AoSWorldSnapshot,
  SoAWorldSnapshot,
  hashAoS,
  hashSoA
} from "../src";

function createWorld(useSoA: boolean): World<CoreComponentRegistry> {
  const world = new World<CoreComponentRegistry>();
  if (useSoA) world.setResource("UseSoASnapshots", true);
  return world;
}

describe.each([
  ["AoS", false],
  ["SoA", true]
] as const)("Snapshot resources (%s)", (_format, useSoA) => {
  it("captures and restores registered resource values without aliasing", () => {
    const source = createWorld(useSoA);
    source.registerSnapshotResource("GameplayFreeze");
    source.setResource("GameplayFreeze", {
      remaining: 0.125,
      source: "juice",
      policy: { priority: 3 }
    });

    const snapshot = source.snapshot();
    source.getResource<{ policy: { priority: number } }>("GameplayFreeze")!.policy.priority = 99;

    const target = createWorld(useSoA);
    target.registerSnapshotResource("GameplayFreeze");
    target.setResource("GameplayFreeze", { remaining: 10 });
    target.restore(snapshot);

    expect(target.getResource("GameplayFreeze")).toEqual({
      remaining: 0.125,
      source: "juice",
      policy: { priority: 3 }
    });
    expect(target.isSnapshotResourceRegistered("GameplayFreeze")).toBe(true);
  });

  it("removes registered target resources absent from the restored snapshot", () => {
    const source = createWorld(useSoA);
    source.registerSnapshotResource("GameplayFreeze");
    source.setResource("GameplayFreeze", { remaining: 0.2 });
    const snapshot = source.snapshot();

    const target = createWorld(useSoA);
    target.registerSnapshotResource("GameplayFreeze");
    target.setResource("GameplayFreeze", { remaining: 10 });
    target.registerSnapshotResource("TransientSimulationState");
    target.setResource("TransientSimulationState", { active: true });
    target.setResource("RendererHandle", { id: "must-survive" });

    target.restore(snapshot);

    expect(target.getResource("GameplayFreeze")).toEqual({ remaining: 0.2 });
    expect(target.getResource("TransientSimulationState")).toBeUndefined();
    expect(target.isSnapshotResourceRegistered("TransientSimulationState")).toBe(false);
    expect(target.getResource("RendererHandle")).toEqual({ id: "must-survive" });
  });

  it("restores a registered-but-absent resource as absent", () => {
    const source = createWorld(useSoA);
    source.registerSnapshotResource("GameplayFreeze");
    const snapshot = source.snapshot();

    const target = createWorld(useSoA);
    target.registerSnapshotResource("GameplayFreeze");
    target.setResource("GameplayFreeze", { remaining: 1 });
    target.restore(snapshot);

    expect(target.getResource("GameplayFreeze")).toBeUndefined();
    expect(target.isSnapshotResourceRegistered("GameplayFreeze")).toBe(true);
  });

  it("rejects non-serializable values before creating a snapshot", () => {
    const world = createWorld(useSoA);
    world.registerSnapshotResource("InvalidPolicy");
    world.setResource("InvalidPolicy", { callback: () => undefined });
    expect(() => world.snapshot()).toThrow(/unsupported function/);
  });
});

describe("Snapshot resource hashing", () => {
  it("includes registered resource values in AoS hashes", () => {
    const world = createWorld(false);
    world.registerSnapshotResource("GameplayFreeze");
    world.setResource("GameplayFreeze", { remaining: 0.1 });
    const firstHash = hashAoS(world.snapshot() as AoSWorldSnapshot);
    world.setResource("GameplayFreeze", { remaining: 0.2 });
    expect(hashAoS(world.snapshot() as AoSWorldSnapshot)).not.toBe(firstHash);
  });

  it("includes registered resource values in SoA hashes", () => {
    const world = createWorld(true);
    world.registerSnapshotResource("GameplayFreeze");
    world.setResource("GameplayFreeze", { remaining: 0.1 });
    const firstHash = hashSoA(world.snapshot() as SoAWorldSnapshot);
    world.setResource("GameplayFreeze", { remaining: 0.2 });
    expect(hashSoA(world.snapshot() as SoAWorldSnapshot)).not.toBe(firstHash);
  });
});
