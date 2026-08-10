import { GameDefinition } from "./GameDefinition";
import { Simulation } from "./Simulation";
import { CompactInputFrame } from "../input/InputFrame";
import { DeterministicReplayRecorder } from "../replay/DeterministicReplay";

/**
 * Orchestrates a live, active gameplay session of a GameDefinition.
 *
 * @remarks
 * Keeps track of simulation step advancement, input history logging, and triggers
 * side-effect event broadcasts after each step.
 * @public
 */
export class GameSession {
  public readonly id: string;
  public readonly playerId: string;
  public readonly gameDefinition: GameDefinition;
  public readonly seed: number;
  public readonly simulation: Simulation;
  private recorder: DeterministicReplayRecorder;
  private inputHistory: CompactInputFrame[] = [];

  constructor(gameDefinition: GameDefinition, seed: number, playerId = "local-player", sessionId = "session-1") {
    this.id = sessionId;
    this.playerId = playerId;
    this.gameDefinition = gameDefinition;
    this.seed = seed;
    this.simulation = gameDefinition.createSimulation(seed);

    this.recorder = new DeterministicReplayRecorder(gameDefinition.name, seed);
    this.recorder.captureInitialState(this.simulation);
  }

  /**
   * Advances the gameplay session by exactly one tick using the provided human input frame.
   */
  public playTick(input: CompactInputFrame): void {
    // 1. Advance simulation state
    this.simulation.step(input);

    // 2. Record inputs to replay buffer and local history
    this.recorder.recordFrame(input);
    this.inputHistory.push({ ...input });

    // 3. Broadcast events that occurred this frame (as pure side-effects, e.g. for audio/visual presentation)
    const eventBus = (this.simulation as any).eventBus;
    if (eventBus && typeof eventBus.emit === "function") {
      eventBus.emit("session:tick" as any, { tick: this.simulation.tick, state: this.simulation.state });
    }
  }

  /**
   * Retrieves the raw list of inputs logged so far.
   */
  public getInputsHistory(): CompactInputFrame[] {
    return [...this.inputHistory];
  }

  /**
   * Compiles and outputs the final deterministic replay file for the session.
   */
  public getReplay() {
    return this.recorder.compileReplay();
  }
}
