import { WorldSnapshot } from "./WorldSnapshot";

/**
 * A highly efficient, zero-allocation circular buffer for game state snapshots.
 *
 * @remarks
 * Keeps a sliding window of the last N frames of simulation state to enable rollback
 * netcode and resimulation, reusing slot indices to reduce garbage collection overhead.
 * @public
 */
export class SnapshotBuffer {
  private buffer: (WorldSnapshot | null)[];
  private ticks: number[];
  private capacity: number;

  constructor(capacity = 60) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
    this.ticks = new Array(capacity).fill(-1);
  }

  /**
   * Saves a state snapshot for the specified tick into the circular buffer.
   * Reuses buffer slots to keep GC pressure low.
   */
  public saveSnapshot(tick: number, state: WorldSnapshot): void {
    const slot = tick % this.capacity;
    this.buffer[slot] = state;
    this.ticks[slot] = tick;
  }

  /**
   * Retrieves the state snapshot for the specified tick if it exists in the buffer.
   * Returns null if the snapshot has been overwritten or is not present.
   */
  public loadSnapshot(tick: number): WorldSnapshot | null {
    const slot = tick % this.capacity;
    if (this.ticks[slot] === tick) {
      return this.buffer[slot];
    }
    return null;
  }

  /**
   * Clears all buffered state snapshots.
   */
  public clear(): void {
    this.buffer.fill(null);
    this.ticks.fill(-1);
  }
}
