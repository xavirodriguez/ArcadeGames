import { CanonicalInputState, CanonicalActionName } from "../CanonicalInput";

/**
 * Touch twin-stick virtual joystick provider.
 * Left stick maps to moveX/moveY; Right stick maps to aimX/aimY, triggering "fire" when threshold is exceeded.
 * @public
 */
export class VirtualJoystickProvider {
  private leftStick = { x: 0, y: 0 };
  private rightStick = { x: 0, y: 0 };
  private fireThreshold: number;

  constructor(fireThreshold = 0.3) {
    this.fireThreshold = fireThreshold;
  }

  public updateLeftStick(x: number, y: number): void {
    this.leftStick.x = x;
    this.leftStick.y = y;
  }

  public updateRightStick(x: number, y: number): void {
    this.rightStick.x = x;
    this.rightStick.y = y;
  }

  public poll(timestamp = Date.now()): CanonicalInputState {
    const moveX = this.leftStick.x;
    const moveY = this.leftStick.y;
    const aimX = this.rightStick.x;
    const aimY = this.rightStick.y;

    const rightMag = Math.sqrt(aimX * aimX + aimY * aimY);
    const actions = new Set<CanonicalActionName>();

    if (rightMag >= this.fireThreshold) {
      actions.add("fire");
    }

    return {
      axes: { moveX, moveY, aimX, aimY },
      actions,
      timestamp,
    };
  }
}
