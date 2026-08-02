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
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_BULLET_SPEED === "number") {
          newConfig.PLAYER_BULLET_SPEED = Math.round(newConfig.PLAYER_BULLET_SPEED * 1.10);
        }
        if (typeof newConfig.BULLET_SPEED === "number") {
          newConfig.BULLET_SPEED = Math.round(newConfig.BULLET_SPEED * 1.10);
        }
        // Pong paddle speed turbo boost modification
        if (typeof newConfig.PADDLE_SPEED === "number") {
          newConfig.PADDLE_SPEED = Math.round(newConfig.PADDLE_SPEED * 1.15);
        }
        world.setResource("GameConfig", newConfig);
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
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_INITIAL_LIVES === "number") {
          newConfig.PLAYER_INITIAL_LIVES += 1;
        }
        world.setResource("GameConfig", newConfig);
      }

      // Adapt to Pong score starting advantage
      world.setResource("ExtraLifeScoreP1", 1);
      if (world.getSingleton("PongState" as any)) {
        world.mutateSingleton("PongState" as any, (gs: any) => {
          if (typeof gs.scoreP1 === "number" && gs.scoreP1 === 0) {
            gs.scoreP1 = 1;
          }
        });
      }

      if (world.getSingleton("GameState" as any)) {
        world.mutateSingleton("GameState" as any, (gs: any) => {
          if (typeof gs.lives === "number") {
            gs.lives += 1;
          }
        });
      }

      const players = world.query("Player" as any, "Health" as any);
      for (const player of players) {
        world.mutateComponent(player, "Health" as any, (h: any) => {
          h.current += 1;
          h.max += 1;
        });
      }
    }
  },
  "combo_head_start": {
    id: "combo_head_start",
    description: "Empezar con combo x2",
    xpCost: 300,
    apply: (world: World) => {
      world.setResource("HasComboHeadStart", true);

      const config = world.getResource<any>("GameConfig");
      const comboTimeout = config && typeof config.COMBO_TIMEOUT === "number"
        ? config.COMBO_TIMEOUT / 1000
        : 2.0;

      const comboEntities = world.query("Combo" as any);
      const comboEntity = comboEntities[0];
      if (comboEntity !== undefined) {
        world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
          c.combo = 5;
          c.multiplier = 2;
          c.timerRemaining = comboTimeout;
        });
      }

      const gameState = world.getSingleton("GameState" as any);
      if (gameState) {
        world.mutateSingleton("GameState" as any, (gs: any) => {
          gs.combo = 5;
          gs.multiplier = 2;
          gs.comboTimerRemaining = comboTimeout;
        });
      }

      const flappyState = world.getSingleton("FlappyState" as any);
      if (flappyState) {
        world.mutateSingleton("FlappyState" as any, (fs: any) => {
          fs.comboMultiplier = 2;
        });
      }

      const pongState = world.getSingleton("PongState" as any);
      if (pongState) {
        world.mutateSingleton("PongState" as any, (ps: any) => {
          ps.comboMultiplier = 2;
        });
      }
    }
  },
  "shield_pulse": {
    id: "shield_pulse",
    description: "Escudo de 3 segundos al inicio de cada partida",
    xpCost: 1000,
    apply: (world: World) => {
      world.setResource("HasShieldPulse", true);
    }
  },
};
