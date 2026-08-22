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

import { World, HealthComponent, ComponentRegistry, ComboComponent } from "@tiny-aster/core";

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

export type MutatorHookWithId = (world: World) => void;
export type MutatorHookGeneric = (world: World, mutatorId: string) => void;

const MUTATOR_HOOKS: Record<string, MutatorHookWithId[]> = {};
const genericMutatorHooks: MutatorHookGeneric[] = [];

/**
 * Registers a game-specific hook to run when a mutator is applied.
 */
export function registerMutatorHook(mutatorId: string, hook: MutatorHookWithId): void;
export function registerMutatorHook(hook: MutatorHookGeneric): void;
export function registerMutatorHook(
  arg1: string | MutatorHookGeneric,
  arg2?: MutatorHookWithId
): void {
  if (typeof arg1 === "string" && arg2) {
    if (!MUTATOR_HOOKS[arg1]) {
      MUTATOR_HOOKS[arg1] = [];
    }
    MUTATOR_HOOKS[arg1].push(arg2);
  } else if (typeof arg1 === "function") {
    genericMutatorHooks.push(arg1);
  }
}

function runMutatorHooks(world: World, mutatorId: string): void {
  for (const hook of genericMutatorHooks) {
    try {
      hook(world, mutatorId);
    } catch (e) {
      console.error(`Error in generic mutator hook for ${mutatorId}:`, e);
    }
  }
  const specificHooks = MUTATOR_HOOKS[mutatorId];
  if (specificHooks) {
    for (const hook of specificHooks) {
      try {
        hook(world);
      } catch (e) {
        console.error(`Error in specific mutator hook for ${mutatorId}:`, e);
      }
    }
  }
}

/**
 * Applies all registered game-specific hooks for a mutator.
 */
export function applyMutatorHooks(mutatorId: string, world: World): void {
  runMutatorHooks(world, mutatorId);
}

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface MutatorTargetContext {
  playerId: string;
  targetEntity: number; // obligatory - no implicit fallback for draft
}

/**
 * Interface for a beneficial mutator definition.
 */
export interface BeneficialMutator {
  /** Unique identifier for the mutator. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Human-readable description of the effect. */
  description: string;
  /** Mutator rarity. */
  rarity: Rarity;
  /** List of semantic tags. */
  tags: string[];
  /** Supported arcade game IDs or "ALL". */
  supportedGames: string[];
  /** Experience point cost to unlock or activate. */
  xpCost?: number;
  /**
   * Conditions under which this mutator can be drafted by a player.
   */
  canDraft: (world: World<any>, context: MutatorTargetContext) => boolean;
  /**
   * Transformation function that applies the mutator effect to a World.
   * @param world - The ECS world where the effect should be applied.
   * @param context - Optional player targeting context.
   */
  apply: (world: World<any>, context?: MutatorTargetContext) => void;
}

/**
 * Collection of mutators that provide advantages to the player.
 */
export const BENEFICIAL_MUTATORS: Record<string, BeneficialMutator> = {
  "faster_bullets": {
    id: "faster_bullets",
    name: "Balas más rápidas",
    description: "Balas 10% más rápidas en todos los juegos",
    rarity: "COMMON",
    tags: ["combat", "bullet"],
    supportedGames: ["ALL"],
    xpCost: 500,
    canDraft: (world, context) => {
      return true;
    },
    apply: (world, context) => {
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
    name: "Vida Extra",
    description: "Empezar con 1 vida extra",
    rarity: "EPIC",
    tags: ["defense", "life"],
    supportedGames: ["ALL"],
    xpCost: 800,
    canDraft: (world, context) => {
      const target = context?.targetEntity;
      if (target !== undefined) {
        return world.hasComponent(target, "Health" as any);
      }
      return world.query("Player", "Health").length > 0;
    },
    apply: (world, context) => {
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
        world.mutateSingleton("GameState", (gs: any) => {
          if (typeof gs.lives === "number") {
            gs.lives += 1;
          }
        });
      }

      const target = context?.targetEntity;
      if (target !== undefined) {
        world.mutateComponent(target, "Health" as any, (h: any) => {
          h.current += 1;
          h.max += 1;
        });
      } else {
        const players = world.query("Player", "Health");
        for (const player of players) {
          world.mutateComponent(player, "Health" as any, (h: any) => {
            h.current += 1;
            h.max += 1;
          });
        }
      }
      runMutatorHooks(world, "extra_life");
    }
  },
  "combo_head_start": {
    id: "combo_head_start",
    name: "Arranque Furioso",
    description: "Comienza la oleada con un multiplicador x2.",
    rarity: "COMMON",
    tags: ["utility", "combo"],
    supportedGames: ["space-invaders", "pong", "flappy_bird", "asteroids"],
    xpCost: 300,
    canDraft: (world, context) => {
      const target = context?.targetEntity;
      if (target !== undefined) {
        return world.hasComponent(target, "Combo" as any);
      }
      return world.query("Combo").length > 0 || world.query("ComboState" as any).length > 0;
    },
    apply: (world, context) => {
      world.setResource("HasComboHeadStart", true);

      const config = world.getResource<Record<string, unknown>>("GameConfig");
      const comboTimeout = config && typeof config.COMBO_TIMEOUT === "number"
        ? config.COMBO_TIMEOUT / 1000
        : 2.0;

      const target = context?.targetEntity;
      if (target !== undefined && world.hasComponent(target, "Combo" as any)) {
        world.mutateComponent(target, "Combo" as any, (c: any) => {
          c.combo = 5;
          c.multiplier = 2;
          c.timerRemaining = comboTimeout;
        });
      } else {
        const comboEntities = world.query("Combo");
        const comboEntity = comboEntities[0];
        if (comboEntity !== undefined) {
          world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
            c.combo = 5;
            c.multiplier = 2;
            c.timerRemaining = comboTimeout;
          });
        }
        if (world.query("ComboState" as any).length > 0) {
          world.mutateSingleton("ComboState" as any, (cs: any) => {
            cs.hits = 5;
            cs.multiplier = 2;
            cs.timerRemaining = comboTimeout * 1000;
          });
        }
      }

      runMutatorHooks(world, "combo_head_start");
    }
  },
  "shield_pulse": {
    id: "shield_pulse",
    name: "Pulso de Escudo",
    description: "Escudo de 3 segundos al inicio de cada partida",
    rarity: "RARE",
    tags: ["defense", "shield"],
    supportedGames: ["ALL"],
    xpCost: 1000,
    canDraft: (world, context) => {
      const target = context?.targetEntity;
      if (target !== undefined) {
        const health = world.getComponent(target, "Health" as any) as any;
        return !!health && (health.invulnerableRemaining ?? 0) <= 0;
      }
      return world.query("Player", "Health").length > 0;
    },
    apply: (world, context) => {
      world.setResource("HasShieldPulse", true);

      const target = context?.targetEntity;
      if (target !== undefined) {
        world.mutateComponent(target, "Health" as any, (h: any) => {
          h.invulnerableRemaining = 3.0; // 3 seconds
        });
      } else {
        const players = world.query("Player", "Health");
        for (const player of players) {
          world.mutateComponent(player, "Health" as any, (h: any) => {
            h.invulnerableRemaining = 3.0; // 3 seconds
          });
        }
      }
      runMutatorHooks(world, "shield_pulse");
    }
  },
  "hyper_drift": {
    id: "hyper_drift",
    name: "Derrape Hiperespacial",
    description: "Nave con 100% más potencia de propulsión y menor fricción para un control de deslizamiento de alta inercia.",
    rarity: "RARE",
    tags: ["physics", "movement"],
    supportedGames: ["asteroids"],
    xpCost: 600,
    canDraft: (world, context) => true,
    apply: (world, context) => {
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.SHIP_THRUST === "number") {
          newConfig.SHIP_THRUST = Math.round(newConfig.SHIP_THRUST * 2.0);
        }
        if (typeof newConfig.FRICTION === "number") {
          newConfig.FRICTION = 0.95; // Less friction for more drift
        }
        world.setResource("GameConfig", newConfig);
      }
      runMutatorHooks(world, "hyper_drift");
    }
  },
  "bouncing_bullets": {
    id: "bouncing_bullets",
    name: "Balas Rebotantes",
    description: "Tus proyectiles rebotan en los bordes de la pantalla.",
    rarity: "EPIC",
    tags: ["combat", "bullet"],
    supportedGames: ["asteroids"],
    xpCost: 700,
    canDraft: (world, context) => true,
    apply: (world, context) => {
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        newConfig.BULLET_BOUNDARY_BEHAVIOR = "bounce";
        world.setResource("GameConfig", newConfig);
      }
      runMutatorHooks(world, "bouncing_bullets");
    }
  },
};

/**
 * Collection of mutators that represent curses or risks, providing challenge in exchange for higher XP.
 */
export const NEGATIVE_MUTATORS: Record<string, BeneficialMutator> = {
  "faster_enemies": {
    id: "faster_enemies",
    name: "Enemigos Rápidos",
    description: "Enemigos 15% más rápidos, pero +25% XP",
    rarity: "COMMON",
    tags: ["challenge"],
    supportedGames: ["space-invaders"],
    xpCost: 0,
    canDraft: (world, context) => true,
    apply: (world, context) => {
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.INVADER_SPEED === "number") {
          newConfig.INVADER_SPEED = Math.round(newConfig.INVADER_SPEED * 1.15);
        }
        if (typeof newConfig.INVADER_SPEED_X === "number") {
          newConfig.INVADER_SPEED_X = Math.round(newConfig.INVADER_SPEED_X * 1.15);
        }
        world.setResource("GameConfig", newConfig);
      }
      runMutatorHooks(world, "faster_enemies");
    }
  },
  "fewer_lives": {
    id: "fewer_lives",
    name: "Menos Vidas",
    description: "Empezar con 1 vida menos, pero +50% XP",
    rarity: "RARE",
    tags: ["challenge"],
    supportedGames: ["space-invaders", "asteroids"],
    xpCost: 0,
    canDraft: (world, context) => {
      const target = context?.targetEntity;
      if (target !== undefined) {
        const health = world.getComponent(target, "Health" as any) as any;
        return !!health && health.max > 1;
      }
      return world.query("Player", "Health").length > 0;
    },
    apply: (world, context) => {
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_INITIAL_LIVES === "number" && newConfig.PLAYER_INITIAL_LIVES > 1) {
          newConfig.PLAYER_INITIAL_LIVES -= 1;
        }
        world.setResource("GameConfig", newConfig);
      }
      const target = context?.targetEntity;
      if (target !== undefined) {
        world.mutateComponent(target, "Health" as any, (h: any) => {
          if (h.current > 1) h.current -= 1;
          if (h.max > 1) h.max -= 1;
        });
      } else {
        const players = world.query("Player", "Health");
        for (const player of players) {
          world.mutateComponent(player, "Health" as any, (h: any) => {
            if (h.current > 1) h.current -= 1;
            if (h.max > 1) h.max -= 1;
          });
        }
      }
      runMutatorHooks(world, "fewer_lives");
    }
  },
  "slower_bullets": {
    id: "slower_bullets",
    name: "Balas Lentas",
    description: "Tus balas son 15% más lentas, pero +30% XP",
    rarity: "COMMON",
    tags: ["challenge"],
    supportedGames: ["space-invaders", "asteroids"],
    xpCost: 0,
    canDraft: (world, context) => true,
    apply: (world, context) => {
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_BULLET_SPEED === "number") {
          newConfig.PLAYER_BULLET_SPEED = Math.round(newConfig.PLAYER_BULLET_SPEED * 0.85);
        }
        world.setResource("GameConfig", newConfig);
      }
      runMutatorHooks(world, "slower_bullets");
    }
  }
};

export class MutatorRegistry {
  private static mutators: Map<string, BeneficialMutator> = new Map();

  private static readonly RARITY_WEIGHTS: Record<Rarity, number> = {
    COMMON: 10,
    RARE: 5,
    EPIC: 2,
    LEGENDARY: 1,
  };

  public static register(mutator: BeneficialMutator): void {
    if (this.mutators.has(mutator.id)) {
      console.warn(`Mutator [${mutator.id}] sobrescrito.`);
    }
    this.mutators.set(mutator.id, mutator);
  }

  public static get(id: string): BeneficialMutator {
    this.init();
    const mutator = this.mutators.get(id);
    if (!mutator) throw new Error(`Mutator no encontrado: ${id}`);
    return mutator;
  }

  public static init(): void {
    if (this.mutators.size > 0) return;
    Object.values(BENEFICIAL_MUTATORS).forEach(m => this.register(m));
    Object.values(NEGATIVE_MUTATORS).forEach(m => this.register(m));
  }

  public static generateDraft(
    world: World<any>,
    gameId: string,
    count: number,
    context: MutatorTargetContext
  ): BeneficialMutator[] {
    this.init();
    const rng = world.gameplayRandom;

    const pool = Array.from(this.mutators.values()).filter(m => {
      const isGameSupported = m.supportedGames.includes('ALL') || m.supportedGames.includes(gameId);
      return isGameSupported && m.canDraft(world, context);
    });

    if (pool.length === 0) return [];

    // Expandir el pool por peso de rareza antes de barajar
    const weightedPool: BeneficialMutator[] = [];
    for (const mutator of pool) {
      const weight = this.RARITY_WEIGHTS[mutator.rarity] || 1;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(mutator);
      }
    }

    // Deterministic shuffle
    const shuffleArray = <T>(array: T[], r: { next: () => number }): T[] => {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(r.next() * (i + 1));
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
      }
      return result;
    };

    const shuffled = shuffleArray(weightedPool, rng);

    // Tomar los primeros `count` ids únicos del pool ya ponderado y barajado
    const selected: BeneficialMutator[] = [];
    const seenIds = new Set<string>();
    for (const mutator of shuffled) {
      if (selected.length >= count) break;
      if (seenIds.has(mutator.id)) continue;
      seenIds.add(mutator.id);
      selected.push(mutator);
    }

    return selected;
  }
}

// Auto-initialize the registry
MutatorRegistry.init();
