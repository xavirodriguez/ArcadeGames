import { World } from "../src/ecs/World";
import {
  ReplicationStateTracker,
  ClientAckTracker,
  NetworkDeltaSystem,
  NetworkBudgetManager,
  InterestManagerSystem
} from "../src/network/MultiplayerSystems";

describe("MultiplayerSystems Replication Suite", () => {
  describe("ReplicationStateTracker", () => {
    let tracker: ReplicationStateTracker;

    beforeEach(() => {
      tracker = new ReplicationStateTracker();
    });

    afterEach(() => {
      tracker.clear();
    });

    test("should save, retrieve, and clear client baselines", () => {
      const state1 = { tick: 10, componentData: { "Transform": { "1": { type: "Transform", x: 50, y: 100 } } } };
      tracker.saveBaseline("client_A", 10, state1);

      expect(tracker.getBaseline("client_A", 10)).toEqual(state1);
      expect(tracker.getBaseline("client_A", 11)).toBeNull();

      // Overwriting/additional ticks
      const state2 = { tick: 11, componentData: { "Transform": { "1": { type: "Transform", x: 55, y: 105 } } } };
      tracker.saveBaseline("client_A", 11, state2);
      expect(tracker.getBaseline("client_A", 11)).toEqual(state2);

      // Clear specific client
      tracker.clearClient("client_A");
      expect(tracker.getBaseline("client_A", 11)).toBeNull();
    });

    test("should enforce maximum baseline history eviction", () => {
      for (let i = 1; i <= 130; i++) {
        tracker.saveBaseline("client_B", i, { tick: i });
      }

      // Oldest baseline should have been evicted (limit: 120)
      expect(tracker.getBaseline("client_B", 1)).toBeNull();
      expect(tracker.getBaseline("client_B", 130)).toBeDefined();
    });
  });

  describe("ClientAckTracker", () => {
    let tracker: ClientAckTracker;

    beforeEach(() => {
      tracker = new ClientAckTracker();
    });

    afterEach(() => {
      tracker.clearClient("client_A");
    });

    test("should generate sequence numbers sequentially", () => {
      expect(tracker.nextSequence("client_A")).toBe(1);
      expect(tracker.nextSequence("client_A")).toBe(2);
      expect(tracker.nextSequence("client_B")).toBe(1);
    });

    test("should record and track client acknowledgments", () => {
      tracker.recordAck("client_A", 42, 100);

      expect(tracker.getLastAckedSequence("client_A")).toBe(42);
      expect(tracker.getLastAckedTick("client_A")).toBe(100);
      expect(tracker.getIdleTime("client_A")).toBeLessThanOrEqual(50);
    });
  });

  describe("NetworkDeltaSystem", () => {
    let world: World;
    let tracker: ReplicationStateTracker;
    let deltaSystem: NetworkDeltaSystem;

    beforeEach(() => {
      world = new World();
      tracker = new ReplicationStateTracker();
      deltaSystem = new NetworkDeltaSystem(tracker);
    });

    test("should fallback to full updates on forceFull or missing baseline", () => {
      const entity = world.createEntity();
      world.addComponent(entity, { type: "Transform", x: 10, y: 20 } as any);

      // forceFull = true
      const payload1 = deltaSystem.generateDelta(
        world,
        "client_A",
        1,
        0,
        new Set([entity]),
        true
      );
      expect(payload1.kind).toBe("full");
      if (payload1.kind === "full") {
        expect((payload1.fullWorldState as any).componentData?.["Transform"]?.[entity]).toBeDefined();
      }

      // baselineAck = 0
      const payload2 = deltaSystem.generateDelta(
        world,
        "client_A",
        2,
        0,
        new Set([entity]),
        false
      );
      expect(payload2.kind).toBe("full");
    });

    test("should generate precise diff-deltas compared against baseline", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, { type: "Transform", x: 10, y: 20 } as any);
      const e2 = world.createEntity();
      world.addComponent(e2, { type: "Transform", x: 100, y: 200 } as any);

      // 1. Record baseline at tick 10
      const snapshot10 = world.snapshot();
      tracker.saveBaseline("client_A", 10, snapshot10);

      // 2. Mutate state at tick 11:
      // - Move e1
      // - Keep e2 same
      world.mutateComponent(e1, "Transform" as any, (t: any) => {
        t.x = 15;
      });

      const payload = deltaSystem.generateDelta(
        world,
        "client_A",
        1,
        10,
        new Set([e1, e2]),
        false
      );

      expect(payload.kind).toBe("delta");
      if (payload.kind === "delta") {
        // e1 has changes
        expect((payload.delta as any).componentData?.["Transform"]?.[e1]).toEqual({
          type: "Transform", x: 15, y: 20
        });
        // e2 has no changes, so it should not be present in delta
        expect((payload.delta as any).componentData?.["Transform"]?.[e2]).toBeUndefined();
      }
    });
  });

  describe("NetworkBudgetManager", () => {
    let budgetManager: NetworkBudgetManager;

    beforeEach(() => {
      budgetManager = new NetworkBudgetManager();
    });

    test("should clamp prioritized interests under budget and promote self", () => {
      const interest = [
        { id: 1, distance: 100 },
        { id: 2, distance: 50 },
        { id: 3, distance: 150 }
      ];

      // Promote client selfEntityId = '3' to highest, clamp to maxCount = 2
      const res = budgetManager.prioritize("client_A", interest, "3", 2);

      expect(res.length).toBe(2);
      expect(res[0].id).toBe(3); // Promoted self
      expect(res[1].id).toBe(2); // Next closest distance
    });
  });

  describe("InterestManagerSystem", () => {
    let world: World;
    let interestSystem: InterestManagerSystem;

    beforeEach(() => {
      world = new World();
      interestSystem = new InterestManagerSystem();
      world.addSystem(interestSystem);
    });

    test("should filter entities within spatial Area of Interest (AOI) radius", () => {
      interestSystem.registerClient("client_A");

      // Spawn Player representing client_A at (100, 100)
      const player = world.createEntity();
      world.addComponent(player, { type: "Player", ownerSessionId: "client_A" } as any);
      world.addComponent(player, { type: "Transform", x: 100, y: 100 } as any);

      // Entity close (distance: ~70px < 600px AOI limit)
      const eClose = world.createEntity();
      world.addComponent(eClose, { type: "Transform", x: 150, y: 150 } as any);

      // Entity far (distance: ~1414px > 600px AOI limit)
      const eFar = world.createEntity();
      world.addComponent(eFar, { type: "Transform", x: 1100, y: 1100 } as any);

      interestSystem.update(world, 16.66);

      const aoi = interestSystem.getClientInterest("client_A");

      expect(aoi.has(player)).toBe(true);
      expect(aoi.has(eClose)).toBe(true);
      expect(aoi.has(eFar)).toBe(false);
    });
  });
});
