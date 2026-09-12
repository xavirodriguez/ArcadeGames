import { Component } from "../ecs/Component";

/**
 * Descriptor for a single entity property modification effect.
 *
 * @example
 * ```ts
 * const effect: ModifierEffect = {
 *   id: "speed_boost",
 *   targetComponent: "Velocity",
 *   targetProperty: "vx",
 *   type: "multiply",
 *   value: 1.5,
 *   duration: 5.0,
 *   elapsed: 0
 * };
 * ```
 *
 * @public
 */
export interface ModifierEffect {
  /** Unique modifier effect identifier. */
  id: string;
  /** Name of the component targeted by this modifier (e.g. `"Velocity"`). */
  targetComponent: string;
  /** Name of the property targeted by this modifier (e.g. `"maxSpeed"`). */
  targetProperty: string;
  /** Operation type applied to target property: additive (`"add"`), multiplicative (`"multiply"`), or replacement (`"override"`). */
  type: "add" | "multiply" | "override";
  /** Numerical value or scale factor applied. */
  value: number;
  /** Optional total duration in seconds before modifier expires. */
  duration?: number;
  /** Optional elapsed duration in seconds since modifier was applied. */
  elapsed?: number;
}

/**
 * Component that holds active attribute/property modifiers for an entity.
 *
 * @remarks
 * Evaluated during the `Simulation` phase to calculate modified entity attributes dynamically and handle expiring duration modifiers.
 *
 * @example
 * ```ts
 * const modifierComp = new ModifierComponent([
 *   { id: "shield_buff", targetComponent: "Health", targetProperty: "max", type: "add", value: 50 }
 * ]);
 * world.addComponent(entity, modifierComp);
 * ```
 *
 * @public
 */
export class ModifierComponent implements Component {
  /** Discriminator type tag identifying this component as a modifier component. */
  public type: string = "modifier";
  /** Static component type tag identifier. */
  public static readonly type = "modifier";

  /** Array of active modifier effects attached to this component. */
  public modifiers: ModifierEffect[] = [];

  /**
   * Constructs a new ModifierComponent with optional initial modifier effects.
   *
   * @param initialModifiers - Array of initial modifier effects.
   */
  constructor(initialModifiers: ModifierEffect[] = []) {
    this.modifiers = initialModifiers;
  }

  /**
   * Adds a new modifier effect to this component with reset elapsed time.
   *
   * @param effect - Modifier effect descriptor to attach.
   * @returns Void.
   */
  public addModifier(effect: ModifierEffect): void {
    this.modifiers.push({ ...effect, elapsed: 0 });
  }

  /**
   * Removes a modifier effect by its unique identifier.
   *
   * @param id - Unique identifier of the modifier effect to remove.
   * @returns Void.
   */
  public removeModifier(id: string): void {
    this.modifiers = this.modifiers.filter(m => m.id !== id);
  }

  /**
   * Checks whether a modifier effect with the given identifier is active.
   *
   * @param id - Unique identifier of the modifier effect.
   * @returns `true` if matching modifier exists, `false` otherwise.
   */
  public hasModifier(id: string): boolean {
    return this.modifiers.some(m => m.id === id);
  }
}
