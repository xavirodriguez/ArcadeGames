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
    apply: (world: World) => {
      const config = world.getResource<any>("GameConfig");
      if (config) {
        if (config.PLAYER_BULLET_SPEED !== undefined) {
          config.PLAYER_BULLET_SPEED = Math.round(config.PLAYER_BULLET_SPEED * 1.10);
        }
        if (config.BULLET_SPEED !== undefined) {
          config.BULLET_SPEED = Math.round(config.BULLET_SPEED * 1.10);
        }
      }
    }
  },
  "extra_life": {
    id: "extra_life",
    description: "Empezar con 1 vida extra",
    xpCost: 800,
    apply: (world: World) => {
      const config = world.getResource<any>("GameConfig");
      if (config) {
        if (config.PLAYER_INITIAL_LIVES !== undefined) {
          config.PLAYER_INITIAL_LIVES += 1;
        }
      }

      const gameState = world.getSingleton("GameState" as any);
      if (gameState) {
        world.mutateSingleton("GameState" as any, (gs: any) => {
          gs.lives = (gs.lives || 3) + 1;
        });
      }

      const healthEntities = world.query("Health" as any);
      for (const entity of healthEntities) {
        if (world.hasComponent(entity, "Player" as any) || world.hasComponent(entity, "Bird" as any)) {
          world.mutateComponent(entity, "Health" as any, (h: any) => {
            h.current = (h.current || 1) + 1;
            h.max = (h.max || 1) + 1;
          });
        }
      }
    }
  },
  "combo_head_start": {
    id: "combo_head_start",
    description: "Empezar con combo x2",
    xpCost: 300,
    apply: (world: World) => {
      const comboEntities = world.query("Combo" as any);
      const comboEntity = comboEntities[0];
      if (comboEntity !== undefined) {
        world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
          c.combo = 5;
          c.multiplier = 2;
          c.timerRemaining = c.timerDuration || 2.0;
        });
      }

      const gameState = world.getSingleton("GameState" as any);
      if (gameState) {
        world.mutateSingleton("GameState" as any, (gs: any) => {
          gs.combo = 5;
          gs.multiplier = 2;
          gs.comboTimerRemaining = gs.comboTimerRemaining || 2.0;
        });
      }

      const flappyState = world.getSingleton("FlappyState" as any);
      if (flappyState) {
        world.mutateSingleton("FlappyState" as any, (fs: any) => {
          fs.comboMultiplier = 2;
        });
      }
    }
  },
  "shield_pulse": {
    id: "shield_pulse",
    description: "Escudo de 3 segundos al inicio de cada partida",
    xpCost: 1000,
    apply: (world: World) => {
      const playerQuery = world.query("Player" as any);
      const localPlayerQuery = world.query("LocalPlayer" as any);
      const birdQuery = world.query("Bird" as any);
      const allPlayers = [...playerQuery, ...localPlayerQuery, ...birdQuery];

      for (const entity of allPlayers) {
        if (world.hasComponent(entity, "Health" as any)) {
          world.mutateComponent(entity, "Health" as any, (h: any) => {
            h.invulnerableRemaining = 3000;
          });
        }
      }
    }
  },
};
