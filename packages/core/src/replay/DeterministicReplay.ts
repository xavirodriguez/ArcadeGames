import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { CompactInputFrame } from "../input/InputFrame";
import { Simulation } from "../runtime/Simulation";

/**
 * Structure representing a fully recorded, pure deterministic game replay.
 * @public
 */
export interface Replay {
  /**
   * Version of the replay format.
   */
  version: number;

  /**
   * The identifier of the game (e.g. "asteroids", "pong").
   */
  game: string;

  /**
   * The initial simulation seed used.
   */
  seed: number;

  /**
   * The initial snapshot of the world before the first replay tick.
   */
  initialSnapshot: WorldSnapshot;

  /**
   * Array of compact, bitmasked input frames.
   */
  inputs: CompactInputFrame[];
}

/**
 * Handles recording of deterministic simulation steps.
 * @public
 */
export class DeterministicReplayRecorder {
  private inputs: CompactInputFrame[] = [];
  private gameName: string;
  private seed: number;
  private initialSnapshot: WorldSnapshot | null = null;

  constructor(gameName: string, seed: number) {
    this.gameName = gameName;
    this.seed = seed;
  }

  /**
   * Captures the initial state of the simulation before recording gameplay ticks.
   */
  public captureInitialState(simulation: Simulation): void {
    this.initialSnapshot = simulation.snapshot();
    this.inputs = [];
  }

  /**
   * Records a single tick's compact input frame.
   */
  public recordFrame(input: CompactInputFrame): void {
    this.inputs.push({
      t: input.t,
      b: input.b,
      a: input.a ? [...input.a] : undefined
    });
  }

  /**
   * Finalizes the recording and compiles the completed Replay object.
   */
  public compileReplay(): Replay {
    if (!this.initialSnapshot) {
      throw new Error("Cannot compile replay: Initial state was not captured.");
    }
    return {
      version: 1,
      game: this.gameName,
      seed: this.seed,
      initialSnapshot: this.initialSnapshot,
      inputs: [...this.inputs]
    };
  }
}

/**
 * Handles deterministic playback of completed replay files.
 * @public
 */
export class DeterministicReplayPlayer {
  private replay: Replay;
  private currentInputIndex = 0;

  constructor(replay: Replay) {
    this.replay = replay;
  }

  /**
   * Initializes the simulation by restoring its initial state snapshot.
   */
  public prepareSimulation(simulation: Simulation): void {
    simulation.restore(this.replay.initialSnapshot);
    this.currentInputIndex = 0;
  }

  /**
   * Advances the playback by exactly one tick.
   * Returns true if a tick was successfully played, false if the replay has finished.
   */
  public playNextTick(simulation: Simulation): boolean {
    if (this.currentInputIndex >= this.replay.inputs.length) {
      return false; // Replay complete
    }

    const input = this.replay.inputs[this.currentInputIndex];
    simulation.step(input);
    this.currentInputIndex++;
    return true;
  }

  /**
   * Checks if the replay playback has reached the end.
   */
  public isFinished(): boolean {
    return this.currentInputIndex >= this.replay.inputs.length;
  }

  /**
   * Returns the progress ratio of the playback (from 0.0 to 1.0).
   */
  public getProgress(): number {
    if (this.replay.inputs.length === 0) return 1.0;
    return this.currentInputIndex / this.replay.inputs.length;
  }
}
