import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { ComboComponent } from "../components/ComboComponent";

/**
 * System that processes combo streak decay and reset timers across entities.
 *
 * @remarks
 * In each tick, `ComboSystem` queries entities holding a `ComboComponent`.
 * If the world is paused (`IsPaused === true`) or an entity's combo timer has already expired (`timerRemaining <= 0`),
 * processing is skipped. Otherwise, `timerRemaining` is decremented by `deltaTime`. Upon reaching zero or below,
 * `timerRemaining` is capped at 0, the combo streak count resets to 0, and the score/damage multiplier resets to 1.
 *
 * Multiplier accumulation (e.g., incrementing `combo` count and increasing `multiplier`) is handled by gameplay
 * collision or scoring systems, while `ComboSystem` enforces per-tick timer decay and reset sequences.
 *
 * Mutable components are acquired only when `timerRemaining > 0` to preserve determinism and avoid unnecessary
 * `stateVersion` increments during rollback and re-simulation.
 *
 * @example
 * ```ts
 * const comboSystem = new ComboSystem();
 * world.addSystem(comboSystem);
 * // Execution during world tick updates active combo timers:
 * comboSystem.update(world, 0.016);
 * ```
 *
 * @public
 */
export class ComboSystem<TComponents extends CoreComponentRegistry = CoreComponentRegistry> extends System<TComponents> {
  /**
   * Updates all active combo timers and resets expired combo streaks and multipliers.
   *
   * @param world - The ECS world containing active entities and components.
   * @param deltaTime - Elapsed frame time in seconds (e.g., `0.016`).
   * @returns Void.
   *
   * @example
   * ```ts
   * comboSystem.update(world, 0.016);
   * ```
   */
  public update(world: World<TComponents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    type ComboKey = Extract<keyof TComponents, string> & "Combo";
    const entities = world.query("Combo" as ComboKey);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const combo = world.getComponent(entity, "Combo" as ComboKey) as ComboComponent | undefined;
      // Safe for determinism/rollback. Avoids acquiring mutable component and stateVersion bumps when combo is inactive or already zero.
      if (!combo || combo.timerRemaining <= 0) continue;

      const mutableCombo = world.getMutableComponent(entity, "Combo" as ComboKey) as ComboComponent | undefined;
      if (mutableCombo) {
        mutableCombo.timerRemaining -= deltaTime;
        if (mutableCombo.timerRemaining <= 0) {
          mutableCombo.timerRemaining = 0;
          mutableCombo.combo = 0;
          mutableCombo.multiplier = 1;
        }
      }
    }
  }

  /**
   * Cleans up any resources held by the combo system upon disposal.
   *
   * @returns Void.
   *
   * @example
   * ```ts
   * comboSystem.dispose();
   * ```
   */
  public override dispose(): void {}
}
