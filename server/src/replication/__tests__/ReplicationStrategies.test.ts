import { World, ClientAckTracker, ReplicationStateTracker, NetworkDeltaSystem, NetworkBudgetManager, InterestManagerSystem } from "@tiny-aster/core";
import { DeltaReplicationStrategy } from "../DeltaReplicationStrategy";
import { BudgetReplicationStrategy } from "../BudgetReplicationStrategy";

describe("Replication Strategies Integration", () => {
  it("DeltaReplicationStrategy should produce smaller payloads on delta ticks compared to full initial snapshot", () => {
    const world = new World();
    const ackTracker = new ClientAckTracker();
    const tracker = new ReplicationStateTracker();
    const deltaSystem = new NetworkDeltaSystem(tracker);
    const budgetManager = new NetworkBudgetManager();

    const mockRoom: any = {
      world,
      ackTracker,
      deltaSystem,
      budgetManager,
      newClients: new Set(["client-1"]),
      playerEntities: new Map(),
    };

    // Create 10 entities with components
    for (let i = 0; i < 10; i++) {
      const entity = world.createEntity();
      world.addComponent(entity, { type: "Transform", x: i * 10, y: i * 10 } as any);
      world.addComponent(entity, { type: "Health", current: 100, max: 100 } as any);
    }

    const mockClient = {
      sessionId: "client-1",
      send: jest.fn()
    };

    const strategy = new DeltaReplicationStrategy();
    const state = { protocolVersion: 1 };

    // Tick 1: Full snapshot initial payload for new client
    const resTick1 = strategy.replicate(mockRoom, [mockClient], state, 1);
    expect(mockClient.send).toHaveBeenCalledTimes(1);
    const firstCallArgs = mockClient.send.mock.calls[0][1];
    const initialPayloadLength = firstCallArgs.delta.length;

    // Simulate client ACKing sequence 1
    ackTracker.recordAck("client-1", 1, 1);

    // Tick 2: Mutate only 1 component on 1 entity
    world.mutateComponent(1 as any, "Transform", (t: any) => {
      t.x = 999;
    });

    mockClient.send.mockClear();
    const resTick2 = strategy.replicate(mockRoom, [mockClient], state, 2);
    expect(mockClient.send).toHaveBeenCalledTimes(1);
    const secondCallArgs = mockClient.send.mock.calls[0][1];
    const deltaPayloadLength = secondCallArgs.delta.length;

    // Delta payload size should be smaller than full snapshot
    expect(deltaPayloadLength).toBeLessThan(initialPayloadLength);
    expect(resTick2.totalBytesSentThisTick).toBeLessThan(resTick1.totalBytesSentThisTick);
  });

  it("BudgetReplicationStrategy should filter and bound replicated entities to MAX_ENTITIES_PER_TICK", () => {
    const world = new World();
    const ackTracker = new ClientAckTracker();
    const tracker = new ReplicationStateTracker();
    const deltaSystem = new NetworkDeltaSystem(tracker);
    const budgetManager = new NetworkBudgetManager();
    const interestSystem = new InterestManagerSystem();

    interestSystem.onRegister(world);

    const playerEntity = world.createEntity();
    world.addComponent(playerEntity, { type: "Ship", sessionId: "client-1" } as any);
    world.addComponent(playerEntity, { type: "Transform", x: 0, y: 0 } as any);

    // Create 30 distant entities
    for (let i = 0; i < 30; i++) {
      const e = world.createEntity();
      world.addComponent(e, { type: "Asteroid", size: "large" } as any);
      world.addComponent(e, { type: "Transform", x: (i + 1) * 20, y: 0 } as any);
    }

    interestSystem.update(world, 0.016);

    const mockRoom: any = {
      world,
      ackTracker,
      deltaSystem,
      budgetManager,
      newClients: new Set(["client-1"]),
      playerEntities: new Map([["client-1", playerEntity]]),
    };

    const mockClient = {
      sessionId: "client-1",
      send: jest.fn()
    };

    const strategy = new BudgetReplicationStrategy();
    const state = { protocolVersion: 1 };

    const res = strategy.replicate(mockRoom, [mockClient], state, 1);
    expect(res.totalEntitiesFiltered).toBeGreaterThan(0);
  });
});
