import {
  CanonicalActionName,
  CanonicalInputState,
  createEmptyCanonicalInputState,
} from "../CanonicalInput";

/**
 * Interface representing a source provider of CanonicalInputState.
 * @public
 */
export interface InputProvider<TExtra extends string = never> {
  /**
   * Retrieves the current snapshot of canonical input state.
   */
  getInputState(): CanonicalInputState<TExtra>;

  /**
   * Performs cleanup or removes event listeners.
   */
  dispose?(): void;
}

/**
 * Key mapping configuration for KeyboardInputProvider.
 * @public
 */
export interface KeyboardMapConfig<TExtra extends string = never> {
  moveUp?: string[];
  moveDown?: string[];
  moveLeft?: string[];
  moveRight?: string[];
  aimUp?: string[];
  aimDown?: string[];
  aimLeft?: string[];
  aimRight?: string[];
  actions?: Record<string, CanonicalActionName<TExtra>>;
}

const DEFAULT_KEYBOARD_MAP: KeyboardMapConfig = {
  moveUp: ["KeyW", "ArrowUp"],
  moveDown: ["KeyS", "ArrowDown"],
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  actions: {
    Space: "fire",
    KeyH: "hyperspace",
    ShiftLeft: "hyperspace",
    ShiftRight: "hyperspace",
    KeyE: "secondary",
    KeyB: "boost",
    Escape: "pause",
    KeyP: "pause",
    Enter: "confirm",
  },
};

/**
 * Keyboard implementation of InputProvider.
 * @public
 */
export class KeyboardInputProvider<TExtra extends string = never> implements InputProvider<TExtra> {
  private activeKeys = new Set<string>();
  private config: KeyboardMapConfig<TExtra>;
  private isListening = false;

  private handleKeyDown = (event: KeyboardEvent) => {
    this.activeKeys.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.activeKeys.delete(event.code);
  };

  constructor(config?: Partial<KeyboardMapConfig<TExtra>>) {
    this.config = {
      moveUp: config?.moveUp ?? DEFAULT_KEYBOARD_MAP.moveUp,
      moveDown: config?.moveDown ?? DEFAULT_KEYBOARD_MAP.moveDown,
      moveLeft: config?.moveLeft ?? DEFAULT_KEYBOARD_MAP.moveLeft,
      moveRight: config?.moveRight ?? DEFAULT_KEYBOARD_MAP.moveRight,
      aimUp: config?.aimUp ?? DEFAULT_KEYBOARD_MAP.aimUp ?? [],
      aimDown: config?.aimDown ?? DEFAULT_KEYBOARD_MAP.aimDown ?? [],
      aimLeft: config?.aimLeft ?? DEFAULT_KEYBOARD_MAP.aimLeft ?? [],
      aimRight: config?.aimRight ?? DEFAULT_KEYBOARD_MAP.aimRight ?? [],
      actions: {
        ...(DEFAULT_KEYBOARD_MAP.actions as Record<string, CanonicalActionName<TExtra>>),
        ...config?.actions,
      },
    };

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("keydown", this.handleKeyDown);
      window.addEventListener("keyup", this.handleKeyUp);
      this.isListening = true;
    }
  }

  /**
   * Manually inject key state (useful in headless test environments).
   */
  public setKeyState(code: string, pressed: boolean): void {
    if (pressed) {
      this.activeKeys.add(code);
    } else {
      this.activeKeys.delete(code);
    }
  }

  public getInputState(): CanonicalInputState<TExtra> {
    const state = createEmptyCanonicalInputState<TExtra>();
    state.timestamp = Date.now();

    let moveX = 0;
    let moveY = 0;
    let aimX = 0;
    let aimY = 0;

    const isPressed = (keys?: string[]) => {
      if (!keys) return false;
      for (let i = 0; i < keys.length; i++) {
        if (this.activeKeys.has(keys[i])) return true;
      }
      return false;
    };

    if (isPressed(this.config.moveRight)) moveX += 1;
    if (isPressed(this.config.moveLeft)) moveX -= 1;
    if (isPressed(this.config.moveDown)) moveY += 1;
    if (isPressed(this.config.moveUp)) moveY -= 1;

    if (isPressed(this.config.aimRight)) aimX += 1;
    if (isPressed(this.config.aimLeft)) aimX -= 1;
    if (isPressed(this.config.aimDown)) aimY += 1;
    if (isPressed(this.config.aimUp)) aimY -= 1;

    state.axes.moveX = moveX;
    state.axes.moveY = moveY;
    state.axes.aimX = aimX;
    state.axes.aimY = aimY;

    if (this.config.actions) {
      for (const [code, actionName] of Object.entries(this.config.actions)) {
        if (this.activeKeys.has(code)) {
          state.actions.add(actionName as CanonicalActionName<TExtra>);
        }
      }
    }

    return state;
  }

  public dispose(): void {
    if (this.isListening && typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("keyup", this.handleKeyUp);
      this.isListening = false;
    }
    this.activeKeys.clear();
  }
}
