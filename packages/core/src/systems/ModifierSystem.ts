import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
// TODO(refactor): código duplicado detectado (bloque) con systems/MutatorSystem.ts:3-23. Considerar extraer a función compartida. Ref: 6004af8c
import { ModifierComponent, ModifierEffect } from "../components/ModifierComponent";

/**
 * Legacy compatibility interface for entity mutators.
 * @public
 */
export interface Mutator<TComponents extends ComponentRegistry = ComponentRegistry, K extends keyof TComponents & string = keyof TComponents & string> {
  componentType: K;
  mutate: (component: TComponents[K], world: World<TComponents>) => void;
}

/**
 * Component-based system that processes entity modifier components and handles modifier lifetimes.
 *
 * @remarks
 * Consolidates tick-by-tick component mutations, property modifier calculations, and
 * duration expirations into a single unified system.
 *
 * @public
 */
export class ModifierSystem<TComponents extends ComponentRegistry = ComponentRegistry> extends System<TComponents> {
  private legacyMutators: Mutator<TComponents>[];

  constructor(mutators: Mutator<TComponents>[] = []) {
    super();
    this.legacyMutators = mutators;
  }

  public override update(world: World<TComponents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    // 1. Process active ModifierComponents
    const modifierKey = "modifier" as Extract<keyof TComponents, string>;
    const entities = world.query(modifierKey);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      // Read component first to avoid stateVersion updates on entities with empty/static modifiers
      const readComp = world.getComponent(entity, modifierKey) as ModifierComponent | undefined;
      if (!readComp || !readComp.modifiers || readComp.modifiers.length === 0) continue;

      let hasDuration = false;
      const modLen = readComp.modifiers.length;
      for (let j = 0; j < modLen; j++) {
        const mod = readComp.modifiers[j];
        if (typeof mod.duration === "number" && mod.duration > 0) {
          hasDuration = true;
          break;
        }
      }
      if (!hasDuration) continue;

      const modifierComp = world.getMutableComponent(entity, modifierKey) as ModifierComponent | undefined;
      if (!modifierComp) continue;

      let hasExpired = false;
      for (let j = 0; j < modifierComp.modifiers.length; j++) {
        const mod = modifierComp.modifiers[j];
        if (typeof mod.duration === "number" && mod.duration > 0) {
          mod.elapsed = (mod.elapsed ?? 0) + deltaTime;
          if (mod.elapsed >= mod.duration) {
            hasExpired = true;
          }
        }
      }

      if (hasExpired) {
        let writeIdx = 0;
        const totalMods = modifierComp.modifiers.length;
        for (let j = 0; j < totalMods; j++) {
          const m = modifierComp.modifiers[j];
          if (!(typeof m.duration === "number" && m.duration > 0 && (m.elapsed ?? 0) >= m.duration)) {
            modifierComp.modifiers[writeIdx++] = m;
          }
        }
        modifierComp.modifiers.length = writeIdx;
      }
    }

    // 2. Process legacy function mutators
    const mutatorLen = this.legacyMutators.length;
    for (let i = 0; i < mutatorLen; i++) {
      const mutator = this.legacyMutators[i];
      if (mutator && mutator.componentType && typeof mutator.mutate === "function") {
        const compType = mutator.componentType as Extract<keyof TComponents, string>;
        const matched = world.query(compType);
        const matchLen = matched.length;
        for (let j = 0; j < matchLen; j++) {
          const comp = world.getMutableComponent(matched[j], compType);
          if (comp) {
            mutator.mutate(comp, world);
          }
        }
      }
    }
  }

  /**
   * Helper utility to calculate the final modified numerical value for a target component property.
   *
   * @param baseValue - Initial unmodified numeric value.
   * @param modifiers - Array of active modifier effects targeting this property.
   * @returns Computed final value applying add, multiply, and override modifiers in sequence.
   */
  public static calculateModifiedValue(baseValue: number, modifiers: ModifierEffect[]): number {
    const result = baseValue;
    let addSum = 0;
    let multProduct = 1.0;
    let overrideValue: number | undefined = undefined;

    for (const mod of modifiers) {
      if (mod.type === "add") {
        addSum += mod.value;
      } else if (mod.type === "multiply") {
        multProduct *= mod.value;
      } else if (mod.type === "override") {
        overrideValue = mod.value;
      }
    }

    if (overrideValue !== undefined) {
      return overrideValue;
    }

    return (result + addSum) * multProduct;
  }

  public override onRegister(_world: World<TComponents>): void {}
  public override dispose(): void {}
}

/**
 * Legacy export alias for backwards compatibility
 * @public
 */
export const MutatorSystem = ModifierSystem;
