import { Simulation } from "../runtime/Simulation";
import { SnapshotBuffer } from "../snapshots/SnapshotBuffer";
import { CompactInputFrame } from "../input/InputFrame";

/**
 * Orchestrates rollback and resimulation for client-side prediction and lag compensation.
 * @public
 */
export class RollbackSimulation {
  private simulation: Simulation;
  private rollbackBuffer: SnapshotBuffer;

  constructor(simulation: Simulation, rollbackBuffer: SnapshotBuffer) {
    this.simulation = simulation;
    this.rollbackBuffer = rollbackBuffer;
  }

  /**
   * Executes a rollback and resimulation cycle.
   *
   * @param targetTick - The tick index where the input correction was received.
   * @param correctedInput - The validated or corrected input frame for the target tick.
   * @param currentTick - The current tick index before the rollback.
   * @param inputsHistory - Map of previously predicted inputs recorded per tick index.
   * @returns true if rollback was executed, false if snapshot was not found in circular buffer.
   */
  public processRollback(
    targetTick: number,
    correctedInput: CompactInputFrame,
    currentTick: number,
    inputsHistory: Map<number, CompactInputFrame>
  ): boolean {
    // 1. Load the state snapshot at targetTick
    const snapshot = this.rollbackBuffer.loadSnapshot(targetTick);
    if (!snapshot) {
      return false; // Snapshot has already fallen out of the sliding window
    }

    // 2. Restore simulation to targetTick
    this.simulation.restore(snapshot);

    // 3. Apply corrected input frame at targetTick
    this.simulation.step(correctedInput);
    inputsHistory.set(targetTick, correctedInput);

    // Save the new corrected snapshot back to the circular buffer
    this.rollbackBuffer.saveSnapshot(targetTick, this.simulation.snapshot());

    // 4. Fast-forward / Resimulate up to currentTick
    for (let t = targetTick + 1; t <= currentTick; t++) {
      let input = inputsHistory.get(t);
      if (!input) {
        // Fallback in case input is missing: keep buttons empty, set correct tick
        input = { t, b: 0 };
        inputsHistory.set(t, input);
      }
      this.simulation.step(input);

      // Save each resimulated step back into the circular buffer
      this.rollbackBuffer.saveSnapshot(t, this.simulation.snapshot());
    }

    return true;
  }
}
