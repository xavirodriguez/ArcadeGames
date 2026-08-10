import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { CompactInputFrame } from "../input/InputFrame";

/**
 * Contract representing a pure, deterministic simulation.
 * A simulation's state is a pure function of its initial state, seed, and input frames.
 * @public
 */
export interface Simulation {
  /**
   * The current simulation tick.
   */
  readonly tick: number;

  /**
   * The current state representation.
   */
  readonly state: any;

  /**
   * Advances the simulation by exactly one fixed tick using the provided input frame.
   */
  step(input: CompactInputFrame): void;

  /**
   * Captures the current state of the simulation as a serializable snapshot.
   */
  snapshot(): WorldSnapshot;

  /**
   * Restores the simulation's state from a previously captured snapshot.
   */
  restore(snapshot: WorldSnapshot): void;

  /**
   * Generates a deterministic hash representing the exact simulation state.
   */
  hash(): string;
}
