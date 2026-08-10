import { Replay, DeterministicReplayPlayer } from "./DeterministicReplay";
import { Simulation } from "../runtime/Simulation";

/**
 * Utility to identify exactly when and where a simulation desyncs.
 * @public
 */
export class DivergenceDetector {
  /**
   * Playback a replay on a given simulation instance and compare the state hash at each frame
   * against an array of expected hashes.
   * Returns the tick at which the divergence first occurred, or -1 if no divergence is detected.
   */
  public static findDivergenceTick(
    simulation: Simulation,
    replay: Replay,
    expectedHashes: string[]
  ): number {
    const player = new DeterministicReplayPlayer(replay);
    player.prepareSimulation(simulation);

    for (let i = 0; i < replay.inputs.length; i++) {
      const input = replay.inputs[i];
      const expectedHash = expectedHashes[i];

      player.playNextTick(simulation);
      const currentHash = simulation.hash();

      if (currentHash !== expectedHash) {
        return input.t; // Diverged at this input's tick index
      }
    }

    return -1; // Matches perfectly
  }
}
