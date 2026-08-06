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

import { World, HealthComponent, ComponentRegistry } from "@tiny-aster/core";
import { ComboComponent } from "../games/shared/arcade/components/ComboComponent";

/**
 * Interface for a beneficial mutator registry components.
 */
export interface MutatorComponentRegistry extends ComponentRegistry {
  Combo: ComboComponent;
  Health: HealthComponent;
  Player: { type: "Player" };
  GameState: {
    type: "GameState";
    combo?: number;
    multiplier?: number;
    comboTimerRemaining?: number;
    lives?: number;
  };
}

export type SpecificMutatorHook = (world: World) => void;
export type GenericMutatorHook = (world: World, mutatorId: string) => void;

const MUTATOR_HOOKS: Record<string, SpecificMutatorHook[]> = {};
const mutatorHooks: GenericMutatorHook[] = [];

/**
 * Registers a game-specific callback hook for a mutator.
 * Supports overloaded signatures:
 * - Specific mutator hook: registerMutatorHook(mutatorId: string, hook: (world: World) => void)
 * - Generic mutator hook: registerMutatorHook(hook: (world: World, mutatorId: string) => void)
 */
export function registerMutatorHook(mutatorId: string, hook: SpecificMutatorHook): void;
export function registerMutatorHook(hook: GenericMutatorHook): void;
export function registerMutatorHook(
  first: string | GenericMutatorHook,
  second?: SpecificMutatorHook
): void {
  if (typeof first === "string") {
    if (second) {
      const mutatorId = first;
      if (!MUTATOR_HOOKS[mutatorId]) {
        MUTATOR_HOOKS[mutatorId] = [];
      }
      MUTATOR_HOOKS[mutatorId].push(second);
    }
  } else if (typeof first === "function") {
    mutatorHooks.push(first);
  }
}

/**
 * Applies all registered game-specific hooks for a mutator.
 */
export function applyMutatorHooks(mutatorId: string, world: World): void {
  runMutatorHooks(world, mutatorId);
}

function runMutatorHooks(world: World, mutatorId: string): void {
  // Run specific hooks for this mutatorId
  const specific = MUTATOR_HOOKS[mutatorId];
  if (specific) {
    for (const hook of specific) {
      try {
        hook(world);
      } catch (e) {
        console.error(`Error in specific mutator hook for ${mutatorId}:`, e);
      }
    }
  }

  // Run generic hooks
  for (const hook of mutatorHooks) {
    try {
      hook(world, mutatorId);
    } catch (e) {
      console.error(`Error in generic mutator hook for ${mutatorId}:`, e);
    }
  }
}

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
  apply: <T extends ComponentRegistry>(world: World<T>) => void;
}

/**
 * Collection of mutators that provide advantages to the player.
 */
export const BENEFICIAL_MUTATORS: Record<string, BeneficialMutator> = {
  "faster_bullets": {
    id: "faster_bullets",
    description: "Balas 10% más rápidas en todos los juegos",
    xpCost: 500,
    apply: <T extends ComponentRegistry>(genericWorld: World<T>) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_BULLET_SPEED === "number") {
          newConfig.PLAYER_BULLET_SPEED = Math.round(newConfig.PLAYER_BULLET_SPEED * 1.10);
        }
        if (typeof newConfig.BULLET_SPEED === "number") {
          newConfig.BULLET_SPEED = Math.round(newConfig.BULLET_SPEED * 1.10);
        }
        world.setResource("GameConfig", newConfig);
      }
      runMutatorHooks(world, "faster_bullets");
    }
  },
  "extra_life": {
    id: "extra_life",
    description: "Empezar con 1 vida extra",
    xpCost: 800,
    apply: <T extends ComponentRegistry>(genericWorld: World<T>) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_INITIAL_LIVES === "number") {
          newConfig.PLAYER_INITIAL_LIVES += 1;
        }
        world.setResource("GameConfig", newConfig);
      }

      const gameState = world.getSingleton("GameState");
      if (gameState) {
        world.mutateSingleton("GameState", (gs) => {
          if (typeof gs.lives === "number") {
            gs.lives += 1;
          }
        });
      }

      const players = world.query("Player", "Health");
      for (const player of players) {
        world.mutateComponent(player, "Health", (h) => {
          h.current += 1;
          h.max += 1;
        });
      }
      runMutatorHooks(world, "extra_life");
    }
  },
  "combo_head_start": {
    id: "combo_head_start",
    description: "Empezar con combo x2",
    xpCost: 300,
    apply: <T extends ComponentRegistry>(genericWorld: World<T>) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      world.setResource("HasComboHeadStart", true);

      const config = world.getResource<Record<string, unknown>>("GameConfig");
      const comboTimeout = config && typeof config.COMBO_TIMEOUT === "number"
        ? config.COMBO_TIMEOUT / 1000
        : 2.0;

      const comboEntities = world.query("Combo");
      const comboEntity = comboEntities[0];
      if (comboEntity !== undefined) {
        world.mutateComponent(comboEntity, "Combo", (c) => {
          c.combo = 5;
          c.multiplier = 2;
          c.timerRemaining = comboTimeout;
        });
      }

      const gameState = world.getSingleton("GameState");
      if (gameState) {
        world.mutateSingleton("GameState", (gs) => {
          gs.combo = 5;
          gs.multiplier = 2;
          gs.comboTimerRemaining = comboTimeout;
        });
      }
      runMutatorHooks(world, "combo_head_start");
    }
  },
  "shield_pulse": {
    id: "shield_pulse",
    description: "Escudo de 3 segundos al inicio de cada partida",
    xpCost: 1000,
    apply: <T extends ComponentRegistry>(genericWorld: World<T>) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      world.setResource("HasShieldPulse", true);

      const players = world.query("Player", "Health");
      for (const player of players) {
        world.mutateComponent(player, "Health", (h) => {
          h.invulnerableRemaining = 3.0; // 3 seconds
        });
      }
      runMutatorHooks(world, "shield_pulse");
    }
  },
};
