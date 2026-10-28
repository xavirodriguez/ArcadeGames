import { World } from "../src/ecs/World";
import type { Component } from "../src/ecs/Component";
import type { CanonicalActionName } from "../src/input/CanonicalInput";
import { hasInputAction } from "../src/input/hasInputAction";
import { applyInputFrameToEntity } from "../src/network/InputComponentFactory";
import { LocalPredictionSystem } from "../src/network/LocalPredictionSystem";
import { NetworkManager } from "../src/network/NetworkManager";
import type { InputPayload, MultiplayerRegistry } from "../src/network/types";
import { SnapshotSerializer } from "../src/snapshots/SnapshotSerializer";
import { SnapshotSerializerSoA } from "../src/snapshots/SnapshotSerializerSoA";
import { SnapshotRestore } from "../src/snapshots/SnapshotRestore";
import { SnapshotRestoreSoA } from "../src/snapshots/SnapshotRestoreSoA";
import { hashAoS, hashSoA } from "../src/snapshots/SnapshotHash";
import type { WorldSnapshot } from "../src/snapshots/WorldSnapshot";
import { SNAPSHOT_EXCLUDED_COMPONENT_TYPES } from "../src/snapshots/SnapshotExclusionPolicy";

interface InputFixture extends Component {
  type: "Input";
  actions: readonly CanonicalActionName[];
  axes: Record<string, number>;
}

interface ComplexFixture extends Component {
  type: "ComplexFixture";
  entries: Map<string, { score: number }>;
  tags: Set<string>;
  createdAt: Date;
  samples: Uint16Array;
  view: DataView;
}

interface UnorderedCollectionsFixture extends Component {
  type: "UnorderedCollections";
  entries: Map<string, number>;
  tags: Set<string>;
}

type UnorderedCollectionsRegistry = {
  UnorderedCollections: UnorderedCollectionsFixture;
};

function makePredictionWorld(actions: CanonicalActionName[]): { world: World<MultiplayerRegistry>; entity: number } {
  const world = new World<MultiplayerRegistry>();
  const entity = world.createEntity();
  world.addComponent(entity, {
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
  world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
  world.addComponent(entity, { type: "LocalPlayer" });
  world.addComponent(entity, { type: "Input", actions, axes: {} });
  return { world, entity };
}

function snapshotWorld(world: World<MultiplayerRegistry>, format: "AoS" | "SoA"): WorldSnapshot {
  return format === "AoS" ? SnapshotSerializer.snapshot(world) : SnapshotSerializerSoA.snapshot(world);
}

function hashSnapshot(snapshot: WorldSnapshot): string {
  return snapshot.isSoA ? hashSoA(snapshot) : hashAoS(snapshot);
}

function restoreWorld(world: World<MultiplayerRegistry>, snapshot: WorldSnapshot): void {
  if (snapshot.isSoA) SnapshotRestoreSoA.restore(world, snapshot);
  else SnapshotRestore.restore(world, snapshot);
}

describe("Input netcode hardening", () => {
  describe.each(["AoS", "SoA"] as const)("snapshot policy and round-trip (%s)", format => {
    it("keeps Input in the snapshot/hash, excludes transient presentation state, and restores canonical actions", () => {
      const { world, entity } = makePredictionWorld(["thrust", "fire"]);
      applyInputFrameToEntity(world, entity, { actions: ["thrust", "fire"], axes: { moveX: 1 } });
      world.addComponent(entity, { type: "VisualOffset", offsetX: 4, offsetY: 6 });
      world.addComponent(entity, { type: "ScreenShake", intensity: 1, duration: 1, remaining: 0.5 });
      world.addComponent(entity, { type: "HapticRequest", pattern: "tap", intensity: 0.5 });

      const snapshot = snapshotWorld(world, format);
      const componentTypes = snapshot.isSoA
        ? Object.keys(snapshot.soaComponentData)
        : Object.keys(snapshot.componentData);
      expect(componentTypes).toContain("Input");
      for (const excludedType of SNAPSHOT_EXCLUDED_COMPONENT_TYPES) {
        expect(componentTypes).not.toContain(excludedType);
      }

      const beforeHash = hashSnapshot(snapshot);
      world.mutateComponent(entity, "VisualOffset", component => {
        (component as Component & { offsetX: number }).offsetX = 999;
      });
      expect(hashSnapshot(snapshotWorld(world, format))).toBe(beforeHash);

      world.mutateComponent(entity, "Input", component => {
        (component as InputFixture).actions = ["boost"];
      });
      expect(hashSnapshot(snapshotWorld(world, format))).not.toBe(beforeHash);

      restoreWorld(world, snapshot);
      expect(world.hasComponent(entity, "VisualOffset")).toBe(false);
      expect(world.hasComponent(entity, "ScreenShake")).toBe(false);
      expect(world.hasComponent(entity, "HapticRequest")).toBe(false);
      const restoredInput = world.getComponent(entity, "Input");
      expect(Array.isArray(restoredInput?.actions)).toBe(true);
      expect(restoredInput?.actions).toEqual(["fire", "thrust"]);
      expect(hasInputAction(restoredInput?.actions, "fire")).toBe(true);
    });
  });

  describe.each(["AoS", "SoA"] as const)("built-in component values (%s)", format => {
    it("round-trips Map, Set, Date, typed arrays and DataView without aliasing", () => {
      const world = new World<Record<string, Component>>();
      const entity = world.createEntity();
      const initialBytes = new Uint8Array([8, 13, 21]).buffer;
      world.addComponent(entity, {
        type: "ComplexFixture",
        entries: new Map([["alpha", { score: 7 }]]),
        tags: new Set(["stable", "netcode"]),
        createdAt: new Date("2026-01-02T03:04:05.000Z"),
        samples: new Uint16Array([3, 5, 8]),
        view: new DataView(initialBytes)
      } as ComplexFixture);

      const snapshot = format === "AoS" ? SnapshotSerializer.snapshot(world) : SnapshotSerializerSoA.snapshot(world);
      const beforeHash = snapshot.isSoA ? hashSoA(snapshot) : hashAoS(snapshot);
      const live = world.getComponent(entity, "ComplexFixture") as ComplexFixture;
      live.entries.get("alpha")!.score = 999;
      live.tags.add("mutated");
      live.createdAt.setTime(0);
      live.samples[0] = 999;
      live.view.setUint8(0, 0);

      if (snapshot.isSoA) SnapshotRestoreSoA.restore(world, snapshot);
      else SnapshotRestore.restore(world, snapshot);

      const restored = world.getComponent(entity, "ComplexFixture") as ComplexFixture;
      expect(restored.entries.get("alpha")?.score).toBe(7);
      expect([...restored.tags]).toEqual(["stable", "netcode"]);
      expect(restored.createdAt.toISOString()).toBe("2026-01-02T03:04:05.000Z");
      expect([...restored.samples]).toEqual([3, 5, 8]);
      expect(restored.view.getUint8(0)).toBe(8);

      const afterSnapshot = format === "AoS" ? SnapshotSerializer.snapshot(world) : SnapshotSerializerSoA.snapshot(world);
      expect(afterSnapshot.isSoA ? hashSoA(afterSnapshot) : hashAoS(afterSnapshot)).toBe(beforeHash);
    });
  });

  it("hashes Map and Set contents independently of insertion order", () => {
    const firstWorld = new World<UnorderedCollectionsRegistry>();
    firstWorld.gameplayRandom.setSeed(12345);
    const firstEntity = firstWorld.createEntity();
    firstWorld.addComponent(firstEntity, {
      type: "UnorderedCollections",
      entries: new Map([["beta", 2], ["alpha", 1]]),
      tags: new Set(["beta", "alpha"])
    } as UnorderedCollectionsFixture);

    const secondWorld = new World<UnorderedCollectionsRegistry>();
    secondWorld.gameplayRandom.setSeed(12345);
    const secondEntity = secondWorld.createEntity();
    secondWorld.addComponent(secondEntity, {
      type: "UnorderedCollections",
      entries: new Map([["alpha", 1], ["beta", 2]]),
      tags: new Set(["alpha", "beta"])
    } as UnorderedCollectionsFixture);

    const firstAoS = SnapshotSerializer.snapshot(firstWorld);
    const secondAoS = SnapshotSerializer.snapshot(secondWorld);
    expect(hashAoS(firstAoS)).toBe(hashAoS(secondAoS));

    const firstSoA = SnapshotSerializerSoA.snapshot(firstWorld);
    const secondSoA = SnapshotSerializerSoA.snapshot(secondWorld);
    expect(hashSoA(firstSoA)).toBe(hashSoA(secondSoA));
  });

  it("copies queued action arrays and replays only inputs newer than the acknowledged server tick", () => {
    const replayed: CanonicalActionName[][] = [];
    const { world, entity } = makePredictionWorld(["fire"]);
    const liveInput = world.getMutableComponent(entity, "Input");
    if (!liveInput) throw new Error("Input fixture was not registered");
    const liveActions = liveInput.actions as CanonicalActionName[];
    const system = new LocalPredictionSystem<MultiplayerRegistry, InputPayload>(
      new NetworkManager<MultiplayerRegistry>(),
      { simulateFn: (_currentWorld, input) => replayed.push([...input.actions]) }
    );

    system.update(world, 1 / 60);
    liveActions.push("boost");
    replayed.length = 0;
    system.reconcile(world, -1, { x: 0, y: 0, vx: 0, vy: 0 });
    expect(replayed).toEqual([["fire"]]);

    // A second independent system demonstrates that acknowledged input tick 0 is dropped.
    const tickReplay: CanonicalActionName[][] = [];
    const tickWorldSetup = makePredictionWorld(["fire"]);
    const tickWorld = tickWorldSetup.world;
    const tickEntity = tickWorldSetup.entity;
    const tickSystem = new LocalPredictionSystem<MultiplayerRegistry, InputPayload>(
      new NetworkManager<MultiplayerRegistry>(),
      { simulateFn: (_currentWorld, input) => tickReplay.push([...input.actions]) }
    );
    tickSystem.update(tickWorld, 1 / 60);
    const checkpoint = SnapshotSerializer.snapshot(tickWorld);
    tickWorld.mutateComponent(tickEntity, "Input", component => {
      (component as InputFixture).actions = ["boost"];
    });
    tickSystem.update(tickWorld, 1 / 60);
    SnapshotRestore.restore(tickWorld, checkpoint);
    tickReplay.length = 0;
    tickSystem.reconcile(tickWorld, 0, { x: 0, y: 0, vx: 0, vy: 0 });
    expect(tickReplay).toEqual([["boost"]]);
    const postRestoreInput = tickWorld.getComponent(tickEntity, "Input");
    expect(postRestoreInput?.actions).toEqual(["fire"]);
    expect(hasInputAction(postRestoreInput?.actions, "fire")).toBe(true);
  });
});
