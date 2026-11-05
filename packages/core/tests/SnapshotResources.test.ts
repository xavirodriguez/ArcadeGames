import {
  World,
  BinaryCompression,
  hashAoS,
  hashSoA,
  NetworkReplicationUtils
} from "../src";
import type {
  CoreComponentRegistry,
  AoSWorldSnapshot,
  SoAWorldSnapshot,
  SnapshotDelta
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
    const packed = BinaryCompression.pack(snapshot);
    const transportedSnapshot = BinaryCompression.unpack<typeof snapshot>(packed);
    source.getResource<{ policy: { priority: number } }>("GameplayFreeze")!.policy.priority = 99;

    const target = createWorld(useSoA);
    target.registerSnapshotResource("GameplayFreeze");
    target.setResource("GameplayFreeze", { remaining: 10 });
    target.restore(transportedSnapshot);

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

  it("rejects cyclic resource values because deterministic hashing requires acyclic data", () => {
    const world = createWorld(useSoA);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    world.registerSnapshotResource("CyclicPolicy");
    world.setResource("CyclicPolicy", cyclic);
    expect(() => world.snapshot()).toThrow(/circular reference/);
  });

  it("keeps unregistered service resources outside the rollback payload", () => {
    const source = createWorld(useSoA);
    source.setResource("RendererHandle", { id: "source" });
    const snapshot = source.snapshot();

    const target = createWorld(useSoA);
    target.setResource("RendererHandle", { id: "target" });
    target.restore(snapshot);

    expect(target.getResource("RendererHandle")).toEqual({ id: "target" });
    expect(snapshot.snapshotResourceKeys).toEqual(["GameplayFreeze"]);
    expect(snapshot.snapshotResources).toEqual({});
  });

  it("includes the complete registered resource state in delta snapshots", () => {
    const world = createWorld(useSoA);
    world.registerSnapshotResource("GameplayFreeze");
    world.setResource("GameplayFreeze", { remaining: 0.04 });

    const delta = world.deltaSnapshot(0);

    expect(delta.snapshotResourceKeys).toEqual(["GameplayFreeze"]);
    expect(delta.snapshotResources).toEqual({ GameplayFreeze: { remaining: 0.04 } });
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

describe("Snapshot resource delta replication", () => {
  it.each([false, true])("applies complete resource state to a baseline snapshot (SoA=%s)", useSoA => {
    const world = createWorld(useSoA);
    world.registerSnapshotResource("GameplayFreeze");
    world.setResource("GameplayFreeze", { remaining: 0.1 });
    const base = world.snapshot();

    world.setResource("GameplayFreeze", { remaining: 0.025, owner: "combat" });
    const delta = world.deltaSnapshot(0) as SnapshotDelta;

    NetworkReplicationUtils.applyDelta(base, delta);

    expect(base.snapshotResourceKeys).toEqual(["GameplayFreeze"]);
    expect(base.snapshotResources).toEqual({
      GameplayFreeze: { remaining: 0.025, owner: "combat" }
    });
  });
});
