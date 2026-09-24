import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { InputSystem } from "./InputSystem";

/**
 * System that unifies input from various sources (keyboard, gamepad, touch).
 *
 * @remarks
 * Input management is now routed through React Bridge input events directly into `BaseGame.setInputState()`.
 *
 * @warning
 * **Synchronization latency**: Input capture is subject to the platform's event
 * loop and OS-level latency. Captured state reflects the latest available data
 * at the start of the simulation update and may not be perfectly
 * synchronized with the exact moment of physical input.
 *
 * @deprecated Superceded by React Bridge input routing. Use `BaseGame.setInputState()` instead.
 *
 * @example
 * ```ts
 * // Before (deprecated)
 * const inputSystem = new UnifiedInputSystem();
 * world.addSystem(inputSystem);
 *
 * // After
 * game.setInputState({ axes: { moveX: 1 }, buttons: { fire: true } });
 * ```
 *
 * @public
 */
export class UnifiedInputSystem extends System<ComponentRegistry> implements InputSystem {
  private static warned = false;
  private overrides: Record<string, boolean> = {};
  private bindings = new Map<string, string[]>();
  private activeKeys = new Set<string>();
  private listenerCleanups: Array<() => void> = [];

  constructor() {
    super();
    if (!UnifiedInputSystem.warned) {
      console.warn("UnifiedInputSystem is deprecated. Use React Bridge input routing via BaseGame.setInputState() instead.");
      UnifiedInputSystem.warned = true;
    }

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      const handleKey = (evt: KeyboardEvent) => {
        if (evt.type === "keydown") this.activeKeys.add(evt.code);
        else if (evt.type === "keyup") this.activeKeys.delete(evt.code);
      };
      const handleReset = () => this.activeKeys.clear();

      window.addEventListener("keydown", handleKey);
      window.addEventListener("keyup", handleKey);
      window.addEventListener("blur", handleReset);

      this.listenerCleanups.push(() => {
        window.removeEventListener("keydown", handleKey);
        window.removeEventListener("keyup", handleKey);
        window.removeEventListener("blur", handleReset);
      });
    }
  }

  /**
   * Binds an action string to an array of key codes.
   */
  public bind(action: string, keys: string[]): void {
    this.bindings.set(action, keys);
  }

  /**
   * Manually sets key state directly (useful for tests or programmatic input injection).
   */
  public setKeyState(code: string, pressed: boolean): void {
    if (pressed) {
      this.activeKeys.add(code);
    } else {
      this.activeKeys.delete(code);
    }
  }

  /**
   * Manually sets an input action state override.
   *
   * @param action - Action string name.
   * @param pressed - Whether action is pressed.
   * @returns Void.
   */
  public setOverride(action: string, pressed: boolean): void {
    this.overrides[action] = pressed;
  }

  /**
   * Clears a manual input action override.
   *
   * @param action - Action string name.
   * @returns Void.
   */
  public clearOverride(action: string): void {
    delete this.overrides[action];
  }

  /**
   * Legacy update step.
   *
   * @param _world - Target ECS world.
   * @param _deltaTime - Frame elapsed time in seconds.
   * @returns Void.
   */
  public update(_world: World<ComponentRegistry>, _deltaTime: number): void {
      // Input logic
  }

  /**
   * Returns the state of an action.
   *
   * @param action - Action string name.
   * @returns `true` if action override or bound key is pressed, `false` otherwise.
   */
  public getAction(action: string): boolean {
    if (this.overrides[action] !== undefined) {
      return this.overrides[action];
    }
    const boundKeys = this.bindings.get(action);
    if (boundKeys) {
      for (let i = 0; i < boundKeys.length; i++) {
        if (this.activeKeys.has(boundKeys[i])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Performs cleanup and unregisters window event listeners.
   */
  public dispose(): void {
    this.listenerCleanups.forEach(fn => fn());
    this.listenerCleanups.length = 0;
    this.activeKeys.clear();
    this.bindings.clear();
  }
}
