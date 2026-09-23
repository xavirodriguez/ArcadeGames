import {
  World,
  ShapeType,
  BlueprintRegistry,
  BlueprintDefinition,
  CircleShape,
  resolveThemeColor,
  EntityBuilder,
  HealthComponent,
  spawnBlueprintEntity
} from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { attachEnemyDefaults } from "../../shared/enemyHelpers";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry, WeaponComponent } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { FactionComponent, DamageComponent } from "@tiny-aster/gameplay-kit";
import { SpawnDirectorComponent } from "@tiny-aster/gameplay-kit";

interface EnemyParams {
  x: number;
  y: number;
  shape: string;
  size: number;
  color: string;
  radius: number;
  maxSpeed: number;
  maxAcceleration: number;
  order?: number;
  health?: number;
  hasContactDamage?: boolean;
  steeringMode?: "seek" | "flee";
  arrivalRadius?: number;
}

function spawnEnemyEntity(
  w: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>,
  entity: number,
  params: EnemyParams
): void {
  EntityBuilder.fromEntity(w, entity)
    .withTransform({ x: params.x, y: params.y })
    .withVelocity()
    .withRender({ shape: params.shape, size: params.size, color: params.color, order: params.order ?? 1 })
    .withCollider({
      shape: { type: ShapeType.Circle, radius: params.radius } as CircleShape,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
    })
    .withCollisionEvents();

  const health = params.health ?? 1;
  attachEnemyDefaults(w, entity, { currentHp: health, maxHp: health, faction: "enemy" });

  if (params.hasContactDamage) {
    w.addComponent(entity, {
      type: "Damage",
      amount: 1,
      category: "enemy_contact",
      friendlyFire: false,
      consumption: "none"
    } as DamageComponent);
  }

  w.addComponent(entity, {
    type: "Steering",
    mode: params.steeringMode ?? "seek",
    targetFaction: "player",
    maxSpeed: params.maxSpeed,
    maxAcceleration: params.maxAcceleration,
    ...(params.arrivalRadius !== undefined ? { arrivalRadius: params.arrivalRadius } : {})
  } as GeometryWarsComponentRegistry["Steering"]);
}

/**
 * Type definition for Geometry Wars enemy blueprint definitions.
 */
type EnemyBlueprintDef = BlueprintDefinition<
  GeometryWarsComponentRegistry,
  GeometryWarsEventRegistry,
  { x: number; y: number }
>;

/**
 * Helper to construct an enemy blueprint definition from configuration options.
 */
function createEnemyBlueprint(config: Omit<EnemyParams, "x" | "y">): EnemyBlueprintDef {
  return {
    spawn: (w, entity, args) => {
      spawnEnemyEntity(w, entity, {
        x: args.x,
        y: args.y,
        ...config
      });
    }
  };
}

/**
 * Configuration table for Geometry Wars enemy blueprints.
 */
const ENEMY_CONFIGS: Record<string, Omit<EnemyParams, "x" | "y">> = {
  enemy_chaser: {
    shape: "gw_chaser",
    size: 14,
    color: colors.pink,
    radius: 7,
    maxSpeed: 140,
    maxAcceleration: 150
  },
  enemy_evader: {
    shape: "gw_evader",
    size: 14,
    color: "#ffaa00",
    radius: 7,
    maxSpeed: 120,
    maxAcceleration: 100
  },
  enemy_grunt: {
    shape: "gw_grunt",
    size: 10,
    color: colors.cyan,
    radius: 5,
    maxSpeed: 250,
    maxAcceleration: 280
  },
  seeker: {
    shape: "gw_seeker",
    size: 12,
    color: colors.pink,
    radius: 6,
    order: 3,
    health: 2,
    hasContactDamage: true,
    maxSpeed: 120,
    maxAcceleration: 80,
    arrivalRadius: 10
  },
  evader: {
    shape: "gw_evader",
    size: 12,
    color: colors.green,
    radius: 6,
    order: 3,
    health: 1,
    hasContactDamage: true,
    maxSpeed: 100,
    maxAcceleration: 60,
    steeringMode: "flee"
  },
  fast_seeker: {
    shape: "gw_fast_seeker",
    size: 8,
    color: colors.pink,
    radius: 4,
    order: 3,
    health: 1,
    hasContactDamage: true,
    maxSpeed: 200,
    maxAcceleration: 150,
    arrivalRadius: 5
  }
};

/**
 * Factory helper to register a simple enemy blueprint in the BlueprintRegistry.
 */
export function registerSimpleEnemy(
  registry: BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>,
  id: string,
  config: Omit<EnemyParams, "x" | "y">
): void {
  registry.register(id, createEnemyBlueprint(config));
}

/**
 * Registers Geometry Wars blueprints.
 * @public
 */
export function registerGeometryWarsBlueprints(
  world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>
): void {
  const registry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry") || new BlueprintRegistry();

  registry.register("player", {
    spawn: (w: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, entity: number, args: { x: number; y: number }) => {
      const config = w.getResource<GeometryWarsConfig>("GameConfig");
      const tint = resolveThemeColor(w, "player");

      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: "gw_player", size: 16, color: tint, order: 1 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 8 } as CircleShape,
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.ENEMY
        })
        .withCollisionEvents();

      w.addComponent(entity, { type: "Health", current: 1, max: 1, invulnerableRemaining: config?.INVULNERABILITY_DURATION ?? 2.0 } as HealthComponent);
      w.addComponent(entity, { type: "Faction", faction: "player", value: "player" } as FactionComponent);
      w.addComponent(entity, {
        type: "Player",
        fireCooldownRemaining: 0,
        invulnRemaining: config?.INVULNERABILITY_DURATION ?? 2.0,
        moveX: 0,
        moveY: 0
      } as GeometryWarsComponentRegistry["Player"]);
      w.addComponent(entity, {
        type: "Aim",
        aimX: 0,
        aimY: 0,
        isFiring: false
      } as GeometryWarsComponentRegistry["Aim"]);
      w.addComponent(entity, {
        type: "Weapon",
        cooldownRemaining: 0,
        cooldownDuration: config?.PLAYER_FIRE_COOLDOWN ?? 0.12
      } as WeaponComponent);
      w.addComponent(entity, {
        type: "Combo",
        combo: 0,
        multiplier: 1,
        timerRemaining: 0,
        timerDuration: 3.0
      } as GeometryWarsComponentRegistry["Combo"]);
      w.addComponent(entity, {
        type: "KineticAccumulator",
        storedEnergy: 0,
        maxEnergy: config?.KINETIC_MAX_ENERGY ?? 100,
        chargeOnMoveRate: config?.KINETIC_CHARGE_ON_MOVE_RATE ?? 15,
        grazeRadius: config?.KINETIC_GRAZE_RADIUS ?? 40,
        grazeChargeAmount: config?.KINETIC_GRAZE_CHARGE_AMOUNT ?? 10,
        burstRadius: config?.KINETIC_BURST_RADIUS ?? 180,
        isBurstReady: false,
        isBurstActive: false,
        overdriveRemaining: 0
      } as GeometryWarsComponentRegistry["KineticAccumulator"]);
    }
  });

  registry.register("bullet", {
    spawn: (w: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, entity: number, args: { x: number; y: number; vx: number; vy: number; rotation: number }) => {
      const config = w.getResource<GeometryWarsConfig>("GameConfig");
      const tint = resolveThemeColor(w, "bullet", "secondary");

      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y, rotation: args.rotation })
        .withVelocity({ vx: args.vx, vy: args.vy })
        .withRender({ shape: "gw_bullet", size: 4, color: tint, order: 2, rotation: args.rotation })
        .withTTL(config?.BULLET_TTL ?? 1.2)
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 2 } as CircleShape,
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.ENEMY,
          isTrigger: true
        })
        .withCollisionEvents();

      w.addComponent(entity, { type: "Faction", faction: "player", value: "player" } as FactionComponent);
      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "player_bullet",
        friendlyFire: false,
        consumption: "destroy-entity"
      } as DamageComponent);
    }
  });

  for (const [key, config] of Object.entries(ENEMY_CONFIGS)) {
    registerSimpleEnemy(registry, key, config);
  }

  registry.register("spawn_director", {
    spawn: (w: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, entity: number) => {
      w.addComponent(entity, {
        type: "SpawnDirector",
        waveIndex: 0,
        cooldownRemaining: 0,
        pendingSpawns: [],
        waveElapsedTime: 0,
        enemiesRemaining: 0,
        status: "idle"
      } as SpawnDirectorComponent);
    }
  });

  registry.register("state", {
    spawn: (w: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, entity: number) => {
      const config = w.getResource<GeometryWarsConfig>("GameConfig");
      w.addComponent(entity, {
        type: "GeometryWarsState",
        score: 0,
        lives: config?.INITIAL_LIVES ?? 3,
        bombs: config?.INITIAL_BOMBS ?? 3,
        wave: 1,
        isGameOver: false,
        gameTime: 0
      } as GeometryWarsComponentRegistry["GeometryWarsState"]);
    }
  });

  world.setResource("BlueprintRegistry", registry);
}

/**
 * Factory functions for spawning Geometry Wars entities.
 * @public
 */
export class GeometryWarsEntityFactory {
  public static createSeeker(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    return spawnBlueprintEntity(world, "seeker", { x, y });
  }

  public static createEvader(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    return spawnBlueprintEntity(world, "evader", { x, y });
  }

  public static createFastSeeker(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    return spawnBlueprintEntity(world, "fast_seeker", { x, y });
  }

  public static createPlayer(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    return spawnBlueprintEntity(world, "player", { x, y });
  }

  public static createBullet(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number, vx: number, vy: number, rotation: number): number {
    return spawnBlueprintEntity(world, "bullet", { x, y, vx, vy, rotation });
  }

  public static createSpawnDirector(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>): number {
    return spawnBlueprintEntity(world, "spawn_director", {});
  }

  public static createGameState(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>): number {
    return spawnBlueprintEntity(world, "state", {});
  }
}
