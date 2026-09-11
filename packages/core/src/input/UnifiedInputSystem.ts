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

  constructor() {
    super();
    if (!UnifiedInputSystem.warned) {
      console.warn("UnifiedInputSystem is deprecated. Use React Bridge input routing via BaseGame.setInputState() instead.");
      UnifiedInputSystem.warned = true;
    }
  }

  public bind(_action: string, _keys: string[]): void {}

  /**
   * Manually sets an input action state.
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
      // In a real implementation, this would combine raw inputs with overrides
  }

  /**
   * Returns the state of an action.
   *
   * @param action - Action string name.
   * @returns `true` if action override is active, `false` otherwise.
   */
  public getAction(action: string): boolean {
    return !!this.overrides[action];
  }
}
