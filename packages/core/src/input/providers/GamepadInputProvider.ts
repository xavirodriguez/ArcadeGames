import {
  CanonicalActionName,
  CanonicalInputState,
  createEmptyCanonicalInputState,
} from "../CanonicalInput";
import { InputProvider } from "./KeyboardInputProvider";

/**
 * Options for GamepadInputProvider.
 * @public
 */
export interface GamepadProviderOptions {
  /** Index of the target gamepad in navigator.getGamepads(). Defaults to 0. */
  gamepadIndex?: number;
  /** Analog stick deadzone threshold (0 to 1). Defaults to 0.15. */
  deadzone?: number;
}

/**
 * Gamepad API implementation of InputProvider.
 * @public
 */
export class GamepadInputProvider<TExtra extends string = never> implements InputProvider<TExtra> {
  private gamepadIndex: number;
  private deadzone: number;

  constructor(options?: GamepadProviderOptions) {
    this.gamepadIndex = options?.gamepadIndex ?? 0;
    this.deadzone = options?.deadzone ?? 0.15;
  }

  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) return 0;
    return value;
  }

  public getInputState(): CanonicalInputState<TExtra> {
    const state = createEmptyCanonicalInputState<TExtra>();
    state.timestamp = Date.now();

    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      return state;
    }

    const gamepads = navigator.getGamepads();
    const pad = gamepads[this.gamepadIndex];

    if (!pad || !pad.connected) {
      return state;
    }

    // Axes
    if (pad.axes.length >= 2) {
      state.axes.moveX = this.applyDeadzone(pad.axes[0]);
      state.axes.moveY = this.applyDeadzone(pad.axes[1]);
    }
    if (pad.axes.length >= 4) {
      state.axes.aimX = this.applyDeadzone(pad.axes[2]);
      state.axes.aimY = this.applyDeadzone(pad.axes[3]);
    }

    // Standard Gamepad Button Mapping
    const isButtonPressed = (index: number) => {
      const btn = pad.buttons[index];
      if (!btn) return false;
      return typeof btn === "object" ? btn.pressed : btn === 1.0;
    };

    if (isButtonPressed(0) || isButtonPressed(7)) { // South button (A / X) or Right Trigger
      state.actions.add("fire" as CanonicalActionName<TExtra>);
    }
    if (isButtonPressed(1)) { // East button (B / Circle)
      state.actions.add("secondary" as CanonicalActionName<TExtra>);
    }
    if (isButtonPressed(2)) { // West button (X / Square)
      state.actions.add("boost" as CanonicalActionName<TExtra>);
    }
    if (isButtonPressed(3)) { // North button (Y / Triangle)
      state.actions.add("hyperspace" as CanonicalActionName<TExtra>);
    }
    if (isButtonPressed(9)) { // Start / Pause
      state.actions.add("pause" as CanonicalActionName<TExtra>);
    }

    return state;
  }
}
