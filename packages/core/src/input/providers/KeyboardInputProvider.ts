import { CanonicalInputState, CanonicalActionName } from "../CanonicalInput";

export interface KeyMap {
  up?: string[];
  down?: string[];
  left?: string[];
  right?: string[];
  fire?: string[];
  secondary?: string[];
  boost?: string[];
  hyperspace?: string[];
  pause?: string[];
  confirm?: string[];
  cancel?: string[];
}

const DEFAULT_KEY_MAP: KeyMap = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  fire: ["Space", "KeyJ"],
  secondary: ["KeyK"],
  boost: ["ShiftLeft", "ShiftRight"],
  hyperspace: ["KeyH"],
  pause: ["Escape", "KeyP"],
  confirm: ["Enter"],
  cancel: ["Escape"],
};

/**
 * Event-driven Keyboard input provider mapping keystrokes to CanonicalInputState.
 * @public
 */
export class KeyboardInputProvider {
  private pressedKeys = new Set<string>();
  private keyMap: KeyMap;

  constructor(customKeyMap?: Partial<KeyMap>) {
    this.keyMap = { ...DEFAULT_KEY_MAP, ...customKeyMap };
  }

  public handleKeyDown(code: string): void {
    this.pressedKeys.add(code);
  }

  public handleKeyUp(code: string): void {
    this.pressedKeys.delete(code);
  }

  public reset(): void {
    this.pressedKeys.clear();
  }

  public poll(timestamp = Date.now()): CanonicalInputState {
    let moveX = 0;
    let moveY = 0;

    const isPressed = (codes?: string[]) => codes?.some(c => this.pressedKeys.has(c)) ?? false;

    if (isPressed(this.keyMap.left)) moveX -= 1;
    if (isPressed(this.keyMap.right)) moveX += 1;
    if (isPressed(this.keyMap.up)) moveY -= 1;
    if (isPressed(this.keyMap.down)) moveY += 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const invLen = 1 / Math.sqrt(moveX * moveX + moveY * moveY);
      moveX *= invLen;
      moveY *= invLen;
    }

    const actions = new Set<CanonicalActionName>();
    if (isPressed(this.keyMap.fire)) actions.add("fire");
    if (isPressed(this.keyMap.secondary)) actions.add("secondary");
    if (isPressed(this.keyMap.boost)) actions.add("boost");
    if (isPressed(this.keyMap.hyperspace)) actions.add("hyperspace");
    if (isPressed(this.keyMap.pause)) actions.add("pause");
    if (isPressed(this.keyMap.confirm)) actions.add("confirm");
    if (isPressed(this.keyMap.cancel)) actions.add("cancel");

    return {
      axes: {
        moveX,
        moveY,
        aimX: 0,
        aimY: 0,
      },
      actions,
      timestamp,
    };
  }
}
