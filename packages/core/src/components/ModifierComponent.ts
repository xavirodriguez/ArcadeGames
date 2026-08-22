import { Component } from "../ecs/Component";

/**
 * Descriptor for a single entity property modification.
 * @public
 */
export interface ModifierEffect {
  id: string;
  targetComponent: string;
  targetProperty: string;
  type: "add" | "multiply" | "override";
  value: number;
  duration?: number;
  elapsed?: number;
}

/**
 * Component that holds active attribute/property modifiers for an entity.
 *
 * @remarks
 * Evaluated by {@link ModifierSystem} during the `Simulation` phase to calculate
 * modified entity attributes dynamically and handle expiring duration modifiers.
 *
 * @public
 */
export class ModifierComponent implements Component {
  public type: string = "modifier";
  public static readonly type = "modifier";

  public modifiers: ModifierEffect[] = [];

  constructor(initialModifiers: ModifierEffect[] = []) {
    this.modifiers = initialModifiers;
  }

  /**
   * Adds a new modifier effect to this component.
   */
  public addModifier(effect: ModifierEffect): void {
    this.modifiers.push({ ...effect, elapsed: 0 });
  }

  /**
   * Removes a modifier effect by ID.
   */
  public removeModifier(id: string): void {
    this.modifiers = this.modifiers.filter(m => m.id !== id);
  }

  /**
   * Checks if a modifier with the given ID exists.
   */
  public hasModifier(id: string): boolean {
    return this.modifiers.some(m => m.id === id);
  }
}
