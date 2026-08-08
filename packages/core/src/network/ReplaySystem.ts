import { World } from "../ecs/World";
import { InputFrame } from "./NetTypes";

/**
 * Records input frames sequentially during simulation to generate a replay file.
 * @public
 */
export class ReplayRecorder {
  private inputs: InputFrame[] = [];
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Records a single frame of input.
   */
  public recordFrame(input: InputFrame): void {
    this.inputs.push({
      ...input,
      tick: input.tick
    });
  }

  /**
   * Serializes the recorded session.
   */
  public serialize(metadata: Record<string, unknown> = {}): string {
    return JSON.stringify({
      seed: this.seed,
      inputs: this.inputs,
      metadata
    });
  }

  public getInputs(): InputFrame[] {
    return this.inputs;
  }
}

/**
 * Plays back a serialized replay session by applying inputs sequentially tick-by-tick.
 * @public
 */
export class ReplayPlayer {
  private inputs: InputFrame[];
  private seed: number;

  constructor(serialized: string) {
    const data = JSON.parse(serialized);
    this.seed = data.seed;
    this.inputs = data.inputs || [];
    this.inputs.sort((a, b) => a.tick - b.tick);
  }

  /**
   * Returns the seed of the recorded session.
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Applies the recorded input for the given tick onto the designated player entity.
   */
  public applyInputForTick(world: World<any>, entityId: number, tick: number): boolean {
    const frame = this.inputs.find(i => i.tick === tick);
    if (frame) {
      const inputType = "Input";
      if (!world.hasComponent(entityId, inputType)) {
        world.addComponent(entityId, {
          type: "Input",
          actions: new Set<string>(),
          axes: {}
        });
      }
      world.mutateComponent(entityId, inputType, (inputComp: any) => {
        inputComp.actions = new Set<string>(frame.actions || []);
        inputComp.axes = { ...frame.axes };
      });
      return true;
    }
    return false;
  }

  /**
   * Checks if playback has finished (all inputs consumed).
   */
  public isFinished(currentTick: number): boolean {
    if (this.inputs.length === 0) return true;
    const maxTick = this.inputs[this.inputs.length - 1].tick;
    return currentTick > maxTick;
  }
}
