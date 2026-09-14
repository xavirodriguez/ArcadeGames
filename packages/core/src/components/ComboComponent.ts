import { Component } from "../ecs/Component";

/**
 * Component representing active combo streak status, score/damage multiplier, and decay timer for an entity.
 *
 * @remarks
 * `ComboComponent` is processed by {@link ComboSystem} during frame updates to manage time-limited combo streaks.
 * While gameplay collision or scoring systems accumulate consecutive hits and increase the `multiplier`
 * (e.g., `multiplier = 1 + combo * 0.1`), {@link ComboSystem} decrements `timerRemaining` by `deltaTime` each tick.
 *
 * When `timerRemaining` expires (`timerRemaining <= 0`), the combo streak decays and resets back to baseline
 * (`combo = 0`, `multiplier = 1`).
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
  /** Current consecutive hit count in the active combo streak. Resets to 0 on timer expiry. */
  combo: number;
  /** Damage/score multiplier derived from combo streak accumulation. Resets to 1 on timer expiry. */
  multiplier: number;
  /** Remaining decay time in seconds before the combo streak expires and resets to zero. */
  timerRemaining: number;
  /** Total duration in seconds assigned to `timerRemaining` when refreshing a combo hit. */
  timerDuration: number;
}
