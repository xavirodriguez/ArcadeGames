import { CanonicalInputState, CanonicalActionName } from "../CanonicalInput";

export interface GamepadStateSnapshot {
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
}

/**
 * Gamepad input provider wrapping native Gamepad API inputs into CanonicalInputState.
 * @public
 */
export class GamepadInputProvider {
  private deadzone: number;

  constructor(deadzone = 0.15) {
    this.deadzone = deadzone;
  }

  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) return 0;
    const sign = value > 0 ? 1 : -1;
    return (sign * (Math.abs(value) - this.deadzone)) / (1 - this.deadzone);
  }

  public parseGamepad(gamepad: GamepadStateSnapshot, timestamp = Date.now()): CanonicalInputState {
    const rawMoveX = gamepad.axes[0] ?? 0;
    const rawMoveY = gamepad.axes[1] ?? 0;
    const rawAimX = gamepad.axes[2] ?? 0;
    const rawAimY = gamepad.axes[3] ?? 0;

    const moveX = this.applyDeadzone(rawMoveX);
    const moveY = this.applyDeadzone(rawMoveY);
    const aimX = this.applyDeadzone(rawAimX);
    const aimY = this.applyDeadzone(rawAimY);

    const actions = new Set<CanonicalActionName>();

    // Standard Gamepad Mapping:
    // B0: A / Cross -> confirm / fire
    // B1: B / Circle -> secondary / cancel
    // B2: X / Square -> boost
    // B3: Y / Triangle -> hyperspace
    // B9: Start -> pause
    // B7: Right Trigger -> fire
    const b = gamepad.buttons;

    if (b[0]?.pressed || b[7]?.pressed) actions.add("fire");
    if (b[1]?.pressed) actions.add("secondary");
    if (b[2]?.pressed) actions.add("boost");
    if (b[3]?.pressed) actions.add("hyperspace");
    if (b[9]?.pressed) actions.add("pause");

    return {
      axes: { moveX, moveY, aimX, aimY },
      actions,
      timestamp,
    };
  }
}
