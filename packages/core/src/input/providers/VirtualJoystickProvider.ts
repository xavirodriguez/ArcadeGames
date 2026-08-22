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
  private extraActions = new Set<CanonicalActionName<TExtra>>();

  constructor(options?: VirtualJoystickOptions) {
    this.fireThreshold = options?.fireThreshold ?? 0.25;
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

  public getInputState(): CanonicalInputState<TExtra> {
    const state = createEmptyCanonicalInputState<TExtra>();
    state.timestamp = Date.now();

    state.axes.moveX = this.leftX;
    state.axes.moveY = this.leftY;
    state.axes.aimX = this.rightX;
    state.axes.aimY = this.rightY;

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
