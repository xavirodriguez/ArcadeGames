/**
 * Registry and logic definitions for meta-game Mutators.
 *
 * Mutators are persistent player upgrades or temporary session modifiers that alter
 * game rules or entity stats. This registry defines available "beneficial" mutators
 * that players can purchase with XP.
 *
 * @remarks
 * The registry currently acts as a data provider. Actual application logic
 * is implemented via the `apply` callback which modifies the ECS World or Game Config.
 *
 * @packageDocumentation
 */

import { World } from "@tiny-aster/core";

/**
 * Interface for a beneficial mutator definition.
 */
export interface BeneficialMutator {
  /** Unique identifier for the mutator. */
  id: string;
  /** Human-readable description of the effect. */
  description: string;
  /** Experience point cost to unlock or activate. */
  xpCost: number;
  /**
   * Transformation function that applies the mutator effect to a World.
   * @param world - The ECS world where the effect should be applied.
   */
  apply: (world: World) => void;
}

/**
 * Collection of mutators that provide advantages to the player.
 */
export const BENEFICIAL_MUTATORS: Record<string, BeneficialMutator> = {
  "faster_bullets": {
    id: "faster_bullets",
    description: "Balas 10% más rápidas en todos los juegos",
    xpCost: 500,
    apply: (_world: World) => {
      // implementation would depend on game config modification or systemic override
    }
  },
  "extra_life": {
    id: "extra_life",
    description: "Empezar con 1 vida extra",
    xpCost: 800,
    apply: (_world: World) => {
      // increase player health
    }
  },
  "combo_head_start": {
    id: "combo_head_start",
    description: "Empezar con combo x2",
    xpCost: 300,
    apply: (world: World) => {
      const config = world.getResource<any>("GameConfig");
      const comboTimeout = config?.COMBO_TIMEOUT ?? 2000;

      world.mutateSingleton("GameState" as any, (gs: any) => {
        gs.combo = 5;
        gs.multiplier = 2;
        gs.comboTimerRemaining = comboTimeout / 1000;
      });

      const comboEntities = world.query("Combo" as any);
      if (comboEntities.length > 0) {
        world.mutateComponent(comboEntities[0], "Combo" as any, (c: any) => {
          c.combo = 5;
          c.multiplier = 2;
          c.timerRemaining = comboTimeout / 1000;
        });
      }
    }
  },
  "shield_pulse": {
    id: "shield_pulse",
    description: "Escudo de 3 segundos al inicio de cada partida",
    xpCost: 1000,
    apply: (_world: World) => {
      // set invulnerability frames
    }
  },
};
