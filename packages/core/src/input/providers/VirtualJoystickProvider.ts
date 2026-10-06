import {
  CanonicalActionName,
  CanonicalInputState,
  createEmptyCanonicalInputState,
} from "../CanonicalInput";
import { InputProvider } from "./KeyboardInputProvider";

/**
 * Options for VirtualJoystickProvider twin-stick setup.
 * @public
 */
export interface VirtualJoystickOptions {
  /** Deadzone threshold for right stick auto-firing. Defaults to 0.25. */
  fireThreshold?: number;
  /** Axis deadzone threshold (0-1). Below this magnitude, stick axis outputs 0. Defaults to 0. */
  deadzone?: number;
  /** Non-linear response curve function (e.g., (x) => x * Math.abs(x)). */
  responseCurve?: (val: number) => number;
}

/**
 * Touch / Virtual Joystick twin-stick implementation of InputProvider.
 * @public
 */
export class VirtualJoystickProvider<TExtra extends string = never> implements InputProvider<TExtra> {
  private leftX = 0;
  private leftY = 0;
  private rightX = 0;
  private rightY = 0;
  private fireThreshold: number;
  private deadzone: number;
  private responseCurve?: (val: number) => number;
  private extraActions = new Set<CanonicalActionName<TExtra>>();

  constructor(options?: VirtualJoystickOptions) {
    this.fireThreshold = options?.fireThreshold ?? 0.25;
    this.deadzone = options?.deadzone ?? 0;
    this.responseCurve = options?.responseCurve;
  }

  /** Updates the left stick (movement) axes. */
  public setLeftStick(x: number, y: number): void {
    this.leftX = x;
    this.leftY = y;
  }

  /** Updates the right stick (aiming) axes. */
  public setRightStick(x: number, y: number): void {
    this.rightX = x;
    this.rightY = y;
  }

  /** Sets explicit touch button actions (e.g. pause, hyperspace, boost buttons). */
  public setAction(action: CanonicalActionName<TExtra>, active: boolean): void {
    if (active) {
      this.extraActions.add(action);
    } else {
      this.extraActions.delete(action);
    }
  }

  private processAxis(raw: number): number {
    if (Math.abs(raw) < this.deadzone) return 0;
    const sign = Math.sign(raw);
    const remapped = (Math.abs(raw) - this.deadzone) / (1 - this.deadzone);
    const clamped = Math.min(1, Math.max(0, remapped)) * sign;
    return this.responseCurve ? this.responseCurve(clamped) : clamped;
  }

  public getInputState(): CanonicalInputState<TExtra> {
    const state = createEmptyCanonicalInputState<TExtra>();
    state.timestamp = Date.now();

    state.axes.moveX = this.processAxis(this.leftX);
    state.axes.moveY = this.processAxis(this.leftY);
    state.axes.aimX = this.processAxis(this.rightX);
    state.axes.aimY = this.processAxis(this.rightY);

    // Check right stick magnitude threshold for twin-stick auto-fire
    const rightMagSq = this.rightX * this.rightX + this.rightY * this.rightY;
    if (rightMagSq >= this.fireThreshold * this.fireThreshold) {
      state.actions.add("fire" as CanonicalActionName<TExtra>);
    }

    for (const action of this.extraActions) {
      state.actions.add(action);
    }

    return state;
  }

  public reset(): void {
    this.leftX = 0;
    this.leftY = 0;
    this.rightX = 0;
    this.rightY = 0;
    this.extraActions.clear();
  }
}
