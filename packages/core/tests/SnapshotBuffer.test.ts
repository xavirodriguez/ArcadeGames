import { SnapshotBuffer } from "../src/snapshots/SnapshotBuffer";
import { WorldSnapshot } from "../src/snapshots/WorldSnapshot";

describe("SnapshotBuffer Circular State Buffer", () => {
  const createMockSnapshot = (tick: number): WorldSnapshot => {
    return {
      tick,
      entities: [],
      componentData: {},
      stateVersion: 0,
      structureVersion: 0,
      seed: 0,
      nextEntityId: 0,
      freeEntities: []
    } as any;
  };

  it("should store and load snapshots correctly", () => {
    const buffer = new SnapshotBuffer(10);
    const snap = createMockSnapshot(5);

    buffer.saveSnapshot(5, snap);
    expect(buffer.loadSnapshot(5)).toBe(snap);
    expect(buffer.loadSnapshot(15)).toBeNull(); // Same slot, different tick
  });

  it("should wrap around and overwrite old slots in circular fashion", () => {
    const buffer = new SnapshotBuffer(3);
    const snap1 = createMockSnapshot(0);
    const snap2 = createMockSnapshot(1);
    const snap3 = createMockSnapshot(2);
    const snap4 = createMockSnapshot(3);

    buffer.saveSnapshot(0, snap1);
    buffer.saveSnapshot(1, snap2);
    buffer.saveSnapshot(2, snap3);

    expect(buffer.loadSnapshot(0)).toBe(snap1);

    // This overwrite slot 0 (3 % 3 === 0)
    buffer.saveSnapshot(3, snap4);

    expect(buffer.loadSnapshot(0)).toBeNull(); // Overwritten
    expect(buffer.loadSnapshot(3)).toBe(snap4);
  });

  it("should clear successfully", () => {
    const buffer = new SnapshotBuffer(5);
    const snap = createMockSnapshot(1);

    buffer.saveSnapshot(1, snap);
    buffer.clear();

    expect(buffer.loadSnapshot(1)).toBeNull();
  });
});
