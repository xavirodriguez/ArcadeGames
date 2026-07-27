import { InputFrame } from "@tiny-aster/core";
import { PongInput, PongInputFrame } from "../types";

export class NetworkController {
  private inputBuffer = new Map<number, PongInput>();

  public onInputReceived(frame: PongInputFrame) {
    this.inputBuffer.set(frame.tick, frame.input);
  }

  public getInputForTick(tick: number): PongInput | undefined {
    return this.inputBuffer.get(tick);
  }

  public hasInputForTick(tick: number): boolean {
    return this.inputBuffer.has(tick);
  }
}
