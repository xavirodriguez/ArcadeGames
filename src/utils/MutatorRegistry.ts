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

export type MutatorHook = (world: World) => void;
const MUTATOR_HOOKS: Record<string, MutatorHook[]> = {};

/**
 * Registers a game-specific callback hook for a generic mutator.
 */
export function registerMutatorHook(mutatorId: string, hook: MutatorHook): void {
  if (!MUTATOR_HOOKS[mutatorId]) {
    MUTATOR_HOOKS[mutatorId] = [];
  }
  MUTATOR_HOOKS[mutatorId].push(hook);
}

/**
 * Applies all registered game-specific hooks for a mutator.
 */
export function applyMutatorHooks(mutatorId: string, world: World): void {
  const hooks = MUTATOR_HOOKS[mutatorId];
  if (hooks) {
    for (const hook of hooks) {
      hook(world);
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
    apply: (genericWorld: World) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      const config = world.getResource<any>("GameConfig");
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
      // Apply game-specific mutator hooks (e.g. paddle speed turbo boost in Pong)
      applyMutatorHooks("faster_bullets", genericWorld);
    }
  },
  "extra_life": {
    id: "extra_life",
    description: "Empezar con 1 vida extra",
    xpCost: 800,
    apply: (genericWorld: World) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      const config = world.getResource<any>("GameConfig");
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

      // Apply game-specific mutator hooks (e.g. starting score advantage in Pong)
      applyMutatorHooks("extra_life", genericWorld);
    }
  },
  "combo_head_start": {
    id: "combo_head_start",
    description: "Empezar con combo x2",
    xpCost: 300,
    apply: (genericWorld: World) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      world.setResource("HasComboHeadStart", true);

      const config = world.getResource<any>("GameConfig");
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

      // Apply game-specific mutator hooks (e.g. combo head start in Flappy Bird)
      applyMutatorHooks("combo_head_start", genericWorld);
    }
  },
  "shield_pulse": {
    id: "shield_pulse",
    description: "Escudo de 3 segundos al inicio de cada partida",
    xpCost: 1000,
    apply: (genericWorld: World) => {
      const world = genericWorld as unknown as World<MutatorComponentRegistry>;
      world.setResource("HasShieldPulse", true);

      const players = world.query("Player", "Health");
      for (const player of players) {
        world.mutateComponent(player, "Health", (h) => {
          h.invulnerableRemaining = 3.0; // 3 seconds
        });
      }
      // Apply game-specific mutator hooks
      applyMutatorHooks("shield_pulse", genericWorld);
    }
  },
};
