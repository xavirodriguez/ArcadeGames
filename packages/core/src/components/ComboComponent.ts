import { Component } from "../ecs/Component";

/**
 * Component representing active combo streak status, multiplier, and decay timer.
 *
 * @remarks
 * Used by {@link ComboSystem} to track continuous hit streaks and decrement combo timer over time.
 * When {@link ComboComponent.timerRemaining} reaches 0, the streak resets (`combo = 0`, `multiplier = 1`).
 *
 * @example
 * ```ts
 * const comboComponent: ComboComponent = {
 *   type: "Combo",
 *   combo: 3,
 *   multiplier: 1.5,
 *   timerRemaining: 2.5,
 *   timerDuration: 3.0
 * };
 * world.addComponent(entity, comboComponent);
 * ```
 *
 * @public
 */
export interface ComboComponent extends Component {
  /** Discriminator type tag identifying this component as a Combo component. */
  type: "Combo";
  /** Current consecutive hit count. Resets to 0 on timer expiry. */
  combo: number;
  /** Damage/score multiplier derived from combo. */
  multiplier: number;
  /** Remaining time in seconds before combo resets. */
  timerRemaining: number;
  /** Total seconds the timer runs after each hit. */
  timerDuration: number;
}
