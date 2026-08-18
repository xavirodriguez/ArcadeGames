import { Simulation } from "../runtime/Simulation";
import { SnapshotBuffer } from "../snapshots/SnapshotBuffer";
import { CompactInputFrame } from "../input/InputFrame";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";

/**
 * Handles client-side prediction logging, state hash verification, and server-reconciliation rollback cycles.
 * @public
 */
export class MultiplayerReconciler {
  private simulation: Simulation;
  private rollbackBuffer: SnapshotBuffer;
  private inputsHistory = new Map<number, CompactInputFrame>();
  private localHashes = new Map<number, string>();
  private maxHistorySize: number;

  constructor(simulation: Simulation, rollbackBuffer: SnapshotBuffer, maxHistorySize = 60) {
    this.simulation = simulation;
    this.rollbackBuffer = rollbackBuffer;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Logs a locally predicted frame input and its resulting post-step state hash.
   */
  public logPrediction(tick: number, input: CompactInputFrame, stateHash: string): void {
    this.inputsHistory.set(tick, { ...input });
    this.localHashes.set(tick + 1, stateHash); // Hash of the state AFTER executing step at 'tick' (so state at tick + 1)

    // Clean up ancient history to prevent memory leak
    const oldestTick = tick - this.maxHistorySize;
    this.inputsHistory.delete(oldestTick);
    this.localHashes.delete(oldestTick);
  }

  /**
   * Reconciles the local simulation with the server's authoritative tick snapshot and state hash.
   *
   * @param serverTick - The tick index of the authoritative server update (state of tick serverTick BEFORE step serverTick).
   * @param serverSnapshot - The authoritative server state snapshot at the start of serverTick.
   * @param serverHash - The authoritative state hash computed by the server for serverTick.
   * @param currentLocalTick - The latest tick index predicted locally on the client.
   * @returns true if reconciliation completed successfully, false if desync occurred and rollback failed.
   */
  public reconcile(
    serverTick: number,
    serverSnapshot: WorldSnapshot,
    serverHash: string,
    currentLocalTick: number
  ): boolean {
    const localHash = this.localHashes.get(serverTick);

    // 1. If hashes match exactly, prediction was 100% correct! No rollback needed.
    if (localHash === serverHash) {
      return true;
    }

    // 2. Mismatch detected! We must perform reconciliation.
    // Restore simulation directly to the server's authoritative snapshot at serverTick
    this.simulation.restore(serverSnapshot);

    // Save this authoritative state under serverTick in the sliding snapshot buffer
    this.rollbackBuffer.saveSnapshot(serverTick, serverSnapshot);

    // 3. Rollback resimulator: we fast-forward by stepping inputs starting from serverTick up to currentLocalTick.
    const world = (this.simulation as any).world ?? (this.simulation as any).getWorld?.();
    const prevIsReSimulating = world ? world.isReSimulating : false;

    if (world) {
      world.isReSimulating = true;
    }

    try {
      for (let t = serverTick; t <= currentLocalTick; t++) {
        // Save state snapshot of tick t BEFORE executing its step
        this.rollbackBuffer.saveSnapshot(t, this.simulation.snapshot());

        let input = this.inputsHistory.get(t);
        if (!input) {
          input = { t, b: 0 };
          this.inputsHistory.set(t, input);
        }
        this.simulation.step(input);

        // Re-log the corrected state hashes for all resimulated ticks
        this.localHashes.set(t + 1, this.simulation.hash());
      }
    } finally {
      if (world) {
        world.isReSimulating = prevIsReSimulating;
      }
    }

    return true;
  }

  /**
   * Clears the input and hash prediction histories.
   */
  public clearHistory(): void {
    this.inputsHistory.clear();
    this.localHashes.clear();
  }
}
