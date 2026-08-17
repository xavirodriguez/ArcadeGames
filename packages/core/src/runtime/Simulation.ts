import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { CompactInputFrame } from "../input/InputFrame";

/**
 * Contract representing a pure, deterministic game simulation decoupled from presentation and platform layers.
 *
 * @remarks
 * A simulation's state evolution is a pure function of its initial state, seed, and sequence of input frames.
 *
 * @public
 */
export interface Simulation {
  /**
   * The current fixed simulation tick counter.
   */
  readonly tick: number;

  /**
   * High-level state representation of the simulation.
   */
  readonly state: any;

  /**
   * Advances the simulation by exactly one fixed timestep tick using the provided input frame.
   *
   * @param input - Compact input frame containing action bitmasks and inputs for this tick.
   */
  step(input: CompactInputFrame): void;

  /**
   * Captures the current full state of the simulation as a serializable snapshot.
   *
   * @returns A serializable `WorldSnapshot`.
   */
  snapshot(): WorldSnapshot;

  /**
   * Restores the simulation state from a previously captured snapshot.
   *
   * @param snapshot - The snapshot object to restore into the simulation world.
   */
  restore(snapshot: WorldSnapshot): void;

  /**
   * Generates a deterministic hash string representing the exact state of the simulation.
   *
   * @returns Hexadecimal string representation of the state hash.
   */
  hash(): string;
}
