import { Component } from "../ecs/Component";

/**
 * Component representing active combo streak status, multiplier, and decay timer for an entity.
 *
 * @remarks
 * Used by `ComboSystem` to track continuous hit streaks, apply score/damage multipliers, and decrement
 * the combo timer over time. When `timerRemaining` reaches 0, the combo streak decays and resets
 * (`combo = 0`, `multiplier = 1`).
 *
 * Multiplier accumulation formula is typically managed by gameplay collision/scoring systems (e.g., `1 + combo * 0.1`
 * or exponential scaling), while `ComboSystem` handles the per-tick timer decay and reset sequence.
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
  /** Damage/score multiplier derived from combo streak accumulation. Resets to 1 on timer expiry. */
  multiplier: number;
  /** Remaining decay time in seconds before combo resets to zero. */
  timerRemaining: number;
  /** Total seconds the timer runs after each hit before reset occurs. */
  timerDuration: number;
}
