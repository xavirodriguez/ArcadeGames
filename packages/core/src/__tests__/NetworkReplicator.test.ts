import { NetworkReplicator, INetworkableWorld } from "../network/NetworkManager";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";

describe("NetworkReplicator isolated unit tests", () => {
  test("should resolve entities and map remote IDs to local IDs", () => {
    const replicator = new NetworkReplicator();
    let entityIdCounter = 100;
    const mockWorld: INetworkableWorld = {
      createEntity: jest.fn().mockImplementation(() => entityIdCounter++),
      hasComponent: jest.fn().mockReturnValue(false),
      mutateComponent: jest.fn(),
      addComponent: jest.fn()
    };

    const localId1 = replicator.resolveEntity("server_entity_1", mockWorld);
    expect(localId1).toBe(100);
    expect(mockWorld.createEntity).toHaveBeenCalledTimes(1);

    // Resolving again should return the same local ID
    const localId2 = replicator.resolveEntity("server_entity_1", mockWorld);
    expect(localId2).toBe(100);
    expect(mockWorld.createEntity).toHaveBeenCalledTimes(1); // No new creation

    // Resolving a new one
    const localId3 = replicator.resolveEntity("server_entity_2", mockWorld);
    expect(localId3).toBe(101);
    expect(mockWorld.createEntity).toHaveBeenCalledTimes(2);
  });

  test("should apply replicated component properties", () => {
    const replicator = new NetworkReplicator();
    const mockComponentsStore = new Map<number, any>();
    const mockWorld: INetworkableWorld = {
      createEntity: jest.fn().mockReturnValue(42),
      hasComponent: jest.fn().mockImplementation((entity, type) => mockComponentsStore.has(entity)),
      mutateComponent: jest.fn().mockImplementation((entity, type, updater) => {
        const comp = mockComponentsStore.get(entity);
        updater(comp);
        return true;
      }),
      addComponent: jest.fn().mockImplementation((entity, component) => {
        mockComponentsStore.set(entity, component);
      })
    };

    // Replicate snapshot with component data
    const snapshot: WorldSnapshot = {
      tick: 1,
      stateVersion: 1,
      structureVersion: 1,
      seed: 0,
      nextEntityId: 2,
      entities: [123],
      freeEntities: [],
      isSoA: false,
      componentData: {
        Transform: {
          123: { x: 10, y: 20 }
        }
      }
    };

    replicator.replicate(mockWorld, snapshot);

    expect(mockWorld.createEntity).toHaveBeenCalled();
    expect(mockWorld.addComponent).toHaveBeenCalledWith(42, { x: 10, y: 20, type: "Transform" });
    expect(mockComponentsStore.get(42)).toEqual({ x: 10, y: 20, type: "Transform" });
  });
});
