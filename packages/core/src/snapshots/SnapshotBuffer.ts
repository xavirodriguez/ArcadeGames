import { WorldSnapshot } from "./WorldSnapshot";

/**
 * A highly efficient circular ring-buffer for game state snapshots.
 *
 * @remarks
 * Keeps a sliding window of the last N frames of simulation state to enable rollback
 * netcode and resimulation. It implements a fixed-size ring buffer where new snapshots overwrite
 * obsolete snapshots from N frames ago.
 *
 * By reusing slot indexes and keeping a static array size, it minimizes allocation cycles and
 * reduces Garbage Collection (GC) pressure in hot simulation paths.
 *
 * @public
 */
export class SnapshotBuffer {
  private buffer: (WorldSnapshot | null)[];
  private ticks: number[];
  private capacity: number;

  /**
   * Instantiates a new SnapshotBuffer with a fixed sliding-window capacity.
   *
   * @param capacity - The sliding window history limit (default is 60 ticks, which corresponds to 1 second of simulation at 60Hz).
   */
  constructor(capacity = 60) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
    this.ticks = new Array(capacity).fill(-1);
  }

  /**
   * Saves a state snapshot for the specified tick into the circular buffer.
   *
   * @remarks
   * Maps the tick number to a ring-buffer slot using modulo operation: `slot = tick % capacity`.
   * If a snapshot already exists at that slot (from exactly `capacity` frames ago), it is discarded
   * and overwritten.
   *
   * @param tick - The absolute simulation frame/tick count.
   * @param state - The world snapshot representing that frame's state.
   */
  public saveSnapshot(tick: number, state: WorldSnapshot): void {
    const slot = tick % this.capacity;
    this.buffer[slot] = state;
    this.ticks[slot] = tick;
  }

  /**
   * Retrieves the state snapshot for the specified tick if it exists in the buffer.
   *
   * @remarks
   * Resolves the ring-buffer slot and validates that the tick recorded at that slot matches the
   * requested tick. Returns `null` if the snapshot has already been overwritten by a newer frame,
   * or was never recorded.
   *
   * @param tick - The target absolute tick count to query.
   * @returns The corresponding WorldSnapshot, or `null` if the frame is out-of-bounds or missing.
   */
  public loadSnapshot(tick: number): WorldSnapshot | null {
    const slot = tick % this.capacity;
    if (this.ticks[slot] === tick) {
      return this.buffer[slot];
    }
    return null;
  }

  /**
   * Clears all buffered state snapshots and resets tick mapping records.
   */
  public clear(): void {
    this.buffer.fill(null);
    this.ticks.fill(-1);
  }
}
