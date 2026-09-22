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
 * Component representation for EmpAbility in Mutator context.
 */
export interface EmpAbilityComponent {
  type: "EmpAbility";
  chargePerKill: number;
}

/**
 * Interface for a beneficial mutator registry components.
 */
export interface MutatorComponentRegistry extends ComponentRegistry {
  Combo: ComboComponent;
  Health: HealthComponent;
  Player: { type: "Player" };
  EmpAbility: EmpAbilityComponent;
  GameState: {
    type: "GameState";
    combo?: number;
    multiplier?: number;
    comboTimerRemaining?: number;
    lives?: number;
  };
}

export type MutatorHookWithId<TComponents extends ComponentRegistry = ComponentRegistry> = (world: World<TComponents>) => void;
export type MutatorHookGeneric<TComponents extends ComponentRegistry = ComponentRegistry> = (world: World<TComponents>, mutatorId: string) => void;

const MUTATOR_HOOKS: Record<string, MutatorHookWithId<ComponentRegistry>[]> = {};
const genericMutatorHooks: MutatorHookGeneric<ComponentRegistry>[] = [];

/**
 * Registers a game-specific hook to run when a mutator is applied.
 */
export function registerMutatorHook<TComponents extends ComponentRegistry = ComponentRegistry>(mutatorId: string, hook: MutatorHookWithId<TComponents>): void;
export function registerMutatorHook<TComponents extends ComponentRegistry = ComponentRegistry>(hook: MutatorHookGeneric<TComponents>): void;
export function registerMutatorHook<TComponents extends ComponentRegistry = ComponentRegistry>(
  arg1: string | MutatorHookGeneric<TComponents>,
  arg2?: MutatorHookWithId<TComponents>
): void {
  if (typeof arg1 === "string" && arg2) {
    if (!MUTATOR_HOOKS[arg1]) {
      MUTATOR_HOOKS[arg1] = [];
    }
    MUTATOR_HOOKS[arg1].push(arg2 as unknown as MutatorHookWithId<ComponentRegistry>);
  } else if (typeof arg1 === "function") {
    genericMutatorHooks.push(arg1 as unknown as MutatorHookGeneric<ComponentRegistry>);
  }
}

function runMutatorHooks(world: World<ComponentRegistry>, mutatorId: string): void {
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
export function applyMutatorHooks(mutatorId: string, world: World<ComponentRegistry>): void {
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
  canDraft: (world: World<ComponentRegistry>, context: MutatorTargetContext) => boolean;
  /**
   * Transformation function that applies the mutator effect to a World.
   * @param world - The ECS world where the effect should be applied.
   * @param context - Optional player targeting context.
   */
  apply: (world: World<ComponentRegistry>, context?: MutatorTargetContext) => void;
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
        return world.hasComponent(target, "Health");
      }
      return world.query("Player", "Health").length > 0;
    },
    apply: (world, context) => {
      const mWorld = world as World<MutatorComponentRegistry>;
      const config = mWorld.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_INITIAL_LIVES === "number") {
          newConfig.PLAYER_INITIAL_LIVES += 1;
        }
        mWorld.setResource("GameConfig", newConfig);
      }

      const gameState = mWorld.getSingleton("GameState");
      if (gameState) {
        mWorld.mutateSingleton("GameState", (gs) => {
          if (typeof gs.lives === "number") {
            gs.lives += 1;
          }
        });
      }

      const target = context?.targetEntity;
      if (target !== undefined) {
        mWorld.mutateComponent(target, "Health", (h) => {
          h.current += 1;
          h.max += 1;
        });
      } else {
        const players = mWorld.query("Player", "Health");
        for (const player of players) {
          mWorld.mutateComponent(player, "Health", (h) => {
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
    supportedGames: ["space-invaders", "pong", "flappybird", "flappy_bird", "asteroids", "geometrywars"],
    xpCost: 300,
    canDraft: (world, context) => {
      const target = context?.targetEntity;
      if (target !== undefined) {
        return world.hasComponent(target, "Combo");
      }
      return world.query("Combo").length > 0;
    },
    apply: (world, context) => {
      const mWorld = world as World<MutatorComponentRegistry>;
      mWorld.setResource("HasComboHeadStart", true);

      const config = mWorld.getResource<Record<string, unknown>>("GameConfig");
      const comboTimeout = config && typeof config.COMBO_TIMEOUT === "number"
        ? config.COMBO_TIMEOUT / 1000
        : 2.0;

      const target = context?.targetEntity;
      if (target !== undefined && mWorld.hasComponent(target, "Combo")) {
        mWorld.mutateComponent(target, "Combo", (c) => {
          c.combo = 5;
          c.multiplier = 2;
          c.timerRemaining = comboTimeout;
        });
      } else {
        const comboEntities = mWorld.query("Combo");
        const comboEntity = comboEntities[0];
        if (comboEntity !== undefined) {
          mWorld.mutateComponent(comboEntity, "Combo", (c) => {
            c.combo = 5;
            c.multiplier = 2;
            c.timerRemaining = comboTimeout;
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
      const mWorld = world as World<MutatorComponentRegistry>;
      const target = context?.targetEntity;
      if (target !== undefined) {
        const health = mWorld.getComponent(target, "Health");
        return !!health && (health.invulnerableRemaining ?? 0) <= 0;
      }
      return mWorld.query("Player", "Health").length > 0;
    },
    apply: (world, context) => {
      const mWorld = world as World<MutatorComponentRegistry>;
      mWorld.setResource("HasShieldPulse", true);

      const target = context?.targetEntity;
      if (target !== undefined) {
        mWorld.mutateComponent(target, "Health", (h) => {
          h.invulnerableRemaining = 3.0; // 3 seconds
        });
      } else {
        const players = mWorld.query("Player", "Health");
        for (const player of players) {
          mWorld.mutateComponent(player, "Health", (h) => {
            h.invulnerableRemaining = 3.0; // 3 seconds
          });
        }
      }
      runMutatorHooks(world, "shield_pulse");
    }
  },
  "heavy_gravity": {
    id: "heavy_gravity",
    name: "Gravedad Pesada",
    description: "Gravedad x2 y fuerza de flap x1.5 para una física intensa.",
    rarity: "COMMON",
    tags: ["physics", "movement"],
    supportedGames: ["flappybird", "flappy_bird"],
    xpCost: 400,
    canDraft: (world, context) => true,
    apply: (world, context) => {
      const config = world.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.GRAVITY === "number") {
          newConfig.GRAVITY = Math.round(newConfig.GRAVITY * 2.0);
        }
        if (typeof newConfig.FLAP_STRENGTH === "number") {
          newConfig.FLAP_STRENGTH = Math.round(newConfig.FLAP_STRENGTH * 1.5);
        }
        world.setResource("GameConfig", newConfig);
      }
      runMutatorHooks(world, "heavy_gravity");
    }
  },
  "cosmetic_trails": {
    id: "cosmetic_trails",
    name: "Estela Neón Cosmética",
    description: "Activa una estela neón intensa y parametrizada detrás de tu nave.",
    rarity: "COMMON",
    tags: ["cosmetic", "visual"],
    supportedGames: ["flappybird", "flappy_bird"],
    xpCost: 200,
    canDraft: (world, context) => true,
    apply: (world, context) => {
      world.setResource("CosmeticTrailConfig", {
        enabled: true,
        color: "#00F3FF",
        width: 3.5,
        lengthMultiplier: 1.8,
      });
      runMutatorHooks(world, "cosmetic_trails");
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
  "emp_overcharge": {
    id: "emp_overcharge",
    name: "Sobrecarga de EMP",
    description: "Incrementa un 50% la ganancia de carga del EMP por cada invasor destruido.",
    rarity: "RARE",
    tags: ["combat", "emp"],
    supportedGames: ["space-invaders"],
    xpCost: 600,
    canDraft: (world, context) => {
      const mWorld = world as World<MutatorComponentRegistry>;
      const target = context?.targetEntity;
      if (target !== undefined) {
        return mWorld.hasComponent(target, "EmpAbility");
      }
      return mWorld.query("Player", "EmpAbility").length > 0;
    },
    apply: (world, context) => {
      const mWorld = world as World<MutatorComponentRegistry>;
      const target = context?.targetEntity;
      if (target !== undefined && mWorld.hasComponent(target, "EmpAbility")) {
        mWorld.mutateComponent(target, "EmpAbility", (emp) => {
          emp.chargePerKill *= 1.5;
        });
      } else {
        const players = mWorld.query("Player", "EmpAbility");
        for (const p of players) {
          mWorld.mutateComponent(p, "EmpAbility", (emp) => {
            emp.chargePerKill *= 1.5;
          });
        }
      }
      runMutatorHooks(world, "emp_overcharge");
    }
  },
  "plasma_pierce": {
    id: "plasma_pierce",
    name: "Plasma Perforante",
    description: "Tus proyectiles están cargados de plasma y atraviesan los escudos destruyendo 1 objetivo adicional.",
    rarity: "EPIC",
    tags: ["combat", "bullet", "pierce"],
    supportedGames: ["space-invaders"],
    xpCost: 800,
    canDraft: (world, context) => true,
    apply: (world, context) => {
      world.setResource("HasPlasmaPierce", true);
      runMutatorHooks(world, "plasma_pierce");
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
      const mWorld = world as World<MutatorComponentRegistry>;
      const target = context?.targetEntity;
      if (target !== undefined) {
        const health = mWorld.getComponent(target, "Health");
        return !!health && health.max > 1;
      }
      return mWorld.query("Player", "Health").length > 0;
    },
    apply: (world, context) => {
      const mWorld = world as World<MutatorComponentRegistry>;
      const config = mWorld.getResource<Record<string, unknown>>("GameConfig");
      if (config) {
        const newConfig = { ...config };
        if (typeof newConfig.PLAYER_INITIAL_LIVES === "number" && newConfig.PLAYER_INITIAL_LIVES > 1) {
          newConfig.PLAYER_INITIAL_LIVES -= 1;
        }
        mWorld.setResource("GameConfig", newConfig);
      }
      const target = context?.targetEntity;
      if (target !== undefined) {
        mWorld.mutateComponent(target, "Health", (h) => {
          if (h.current > 1) h.current -= 1;
          if (h.max > 1) h.max -= 1;
        });
      } else {
        const players = mWorld.query("Player", "Health");
        for (const player of players) {
          mWorld.mutateComponent(player, "Health", (h) => {
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

  /**
   * Returns all mutators (beneficial and negative) supported for a given game ID.
   */
  public static getAvailableForGame(gameId: string): BeneficialMutator[] {
    this.init();
    return Array.from(this.mutators.values()).filter(m =>
      m.supportedGames.includes('ALL') || m.supportedGames.includes(gameId)
    );
  }

  /**
   * Checks whether a mutator is supported for a given game ID.
   */
  public static isMutatorSupportedForGame(mutator: BeneficialMutator | string, gameId: string): boolean {
    this.init();
    const mut = typeof mutator === "string" ? this.mutators.get(mutator) : mutator;
    if (!mut) return false;
    return mut.supportedGames.includes('ALL') || mut.supportedGames.includes(gameId);
  }

  public static init(): void {
    if (this.mutators.size > 0) return;
    Object.values(BENEFICIAL_MUTATORS).forEach(m => this.register(m));
    Object.values(NEGATIVE_MUTATORS).forEach(m => this.register(m));
  }

  public static generateDraft(
    world: World<ComponentRegistry>,
    gameId: string,
    count: number,
    context: MutatorTargetContext
  ): BeneficialMutator[] {
    this.init();
    const rng = world.gameplayRandom;
    const wasLocked = rng ? rng.isLocked() : false;
    if (wasLocked && rng) rng.unlock();

    try {
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
    } finally {
      if (wasLocked && rng) rng.lock();
    }
  }
}

// Auto-initialize the registry
MutatorRegistry.init();
