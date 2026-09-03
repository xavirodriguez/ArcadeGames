import {
  World,
  ShapeType,
  BlueprintRegistry,
  CircleShape,
  Theme,
  resolveThemeColor,
  EntityBuilder,
  HealthComponent
} from "@tiny-aster/core";
import { CollisionLayers } from "../../shared/types/CollisionLayers";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry, WeaponComponent } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { FactionComponent, DamageComponent } from "../../shared/combat/components/CombatComponents";
import { SpawnDirectorComponent } from "../../shared/spawn/components/SpawnComponents";
import { ComboComponent } from "@tiny-aster/core";

/**
 * Registers Geometry Wars blueprints.
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con asteroids/EntityFactory.ts:103-108. Considerar extraer a función compartida. Ref: 969af9ba
export function registerGeometryWarsBlueprints(
  world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>
): void {
  const registry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry") || new BlueprintRegistry();

  registry.register("player", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
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
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; vx: number; vy: number; rotation: number }) => {
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

  // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:141-146. Considerar extraer a función compartida. Ref: 9b01a12f
  registry.register("enemy_chaser", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:148-162. Considerar extraer a función compartida. Ref: 8eb4bd52
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: "gw_chaser", size: 14, color: colors.pink, order: 1 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 7 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      w.addComponent(entity, { type: "Health", current: 1, max: 1 } as HealthComponent);
      w.addComponent(entity, { type: "Faction", faction: "enemy", value: "enemy" } as FactionComponent);
      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 140,
        maxAcceleration: 150
      } as GeometryWarsComponentRegistry["Steering"]);
    }
  });

  // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:117-122. Considerar extraer a función compartida. Ref: 25380fc7
  registry.register("enemy_evader", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:121-135. Considerar extraer a función compartida. Ref: 7ccae71e
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: "gw_evader", size: 14, color: "#ffaa00", order: 1 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 7 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      w.addComponent(entity, { type: "Health", current: 1, max: 1 } as HealthComponent);
      w.addComponent(entity, { type: "Faction", faction: "enemy", value: "enemy" } as FactionComponent);
      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 120,
        maxAcceleration: 100
      } as GeometryWarsComponentRegistry["Steering"]);
    }
  });

  registry.register("enemy_grunt", // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:123-135. Considerar extraer a función compartida. Ref: 1e580194
  {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: "gw_grunt", size: 10, color: colors.cyan, order: 1 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 5 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      w.addComponent(entity, { type: "Health", current: 1, max: 1 } as HealthComponent);
      w.addComponent(entity, { type: "Faction", faction: "enemy", value: "enemy" } as FactionComponent);
      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 250,
        maxAcceleration: 280
      } as GeometryWarsComponentRegistry["Steering"]);
    }
  });

  registry.register("spawn_director", {
    spawn: (w: World<any, any, any>, entity: number) => {
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
    spawn: (w: World<any, any, any>, entity: number) => {
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

  registry.register("seeker", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:258-266. Considerar extraer a función compartida. Ref: 6f2c8975
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: "gw_seeker", size: 12, color: colors.pink, order: 3 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 6 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:266-277. Considerar extraer a función compartida. Ref: dc09f747
      w.addComponent(entity, { type: "Health", current: 2, max: 2, invulnerableRemaining: 0 } as HealthComponent);
      w.addComponent(entity, { type: "Faction", faction: "enemy", value: "enemy" } as FactionComponent);
      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "enemy_contact",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);
      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 120,
        maxAcceleration: 80,
        arrivalRadius: 10
      } as GeometryWarsComponentRegistry["Steering"]);
    }
  });

  registry.register("evader", // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:292-311. Considerar extraer a función compartida. Ref: 2b752fae
  {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: "gw_evader", size: 12, color: colors.green, order: 3 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 6 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:238-249. Considerar extraer a función compartida. Ref: c080a7fa
      w.addComponent(entity, { type: "Health", current: 1, max: 1, invulnerableRemaining: 0 } as HealthComponent);
      w.addComponent(entity, { type: "Faction", faction: "enemy", value: "enemy" } as FactionComponent);
      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "enemy_contact",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);
      w.addComponent(entity, {
        type: "Steering",
        mode: "flee",
        targetFaction: "player",
        maxSpeed: 100,
        maxAcceleration: 60
      } as GeometryWarsComponentRegistry["Steering"]);
    }
  });

  registry.register("fast_seeker", // TODO(refactor): código duplicado detectado (bloque) con geometrywars/entities/GeometryWarsEntities.ts:266-285. Considerar extraer a función compartida. Ref: b15da619
  {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: "gw_fast_seeker", size: 8, color: colors.pink, order: 3 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 4 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      w.addComponent(entity, { type: "Health", current: 1, max: 1, invulnerableRemaining: 0 } as HealthComponent);
      w.addComponent(entity, { type: "Faction", faction: "enemy", value: "enemy" } as FactionComponent);
      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "enemy_contact",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);
      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 200,
        maxAcceleration: 150,
        arrivalRadius: 5
      } as GeometryWarsComponentRegistry["Steering"]);
    }
  });

  world.setResource("BlueprintRegistry", registry);
}

/**
 * Factory functions for spawning Geometry Wars entities.
 * @public
 */
export class GeometryWarsEntityFactory {
  // TODO(refactor): código duplicado detectado (método) con geometrywars/entities/GeometryWarsEntities.ts:350-367. Considerar extraer a función compartida. Ref: ae35df01
  public static createSeeker(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry");

    let entity: number;
    if (isUpdating) {
      entity = world.reserveEntityId();
      commands.createEntity(entity);
      const mockWorld = new Proxy(world, {
        get(target, prop, receiver) {
          if (prop === "addComponent") {
            return (ent: number, comp: any) => commands.addComponent(ent, comp);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      blueprintRegistry?.get("seeker")?.spawn(mockWorld, entity, { x, y });
    } else {
      entity = world.createEntity();
      blueprintRegistry?.get("seeker")?.spawn(world, entity, { x, y });
    }
    return entity;
  }

  // TODO(refactor): código duplicado detectado (método) con geometrywars/entities/GeometryWarsEntities.ts:333-350. Considerar extraer a función compartida. Ref: 054a220d
  public static createEvader(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry");

    let entity: number;
    if (isUpdating) {
      entity = world.reserveEntityId();
      commands.createEntity(entity);
      const mockWorld = new Proxy(world, {
        get(target, prop, receiver) {
          if (prop === "addComponent") {
            return (ent: number, comp: any) => commands.addComponent(ent, comp);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      blueprintRegistry?.get("evader")?.spawn(mockWorld, entity, { x, y });
    } else {
      entity = world.createEntity();
      blueprintRegistry?.get("evader")?.spawn(world, entity, { x, y });
    }
    return entity;
  }

  public static createFastSeeker(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry");

    let entity: number;
    if (isUpdating) {
      entity = world.reserveEntityId();
      commands.createEntity(entity);
      const mockWorld = new Proxy(world, {
        get(target, prop, receiver) {
          if (prop === "addComponent") {
            return (ent: number, comp: any) => commands.addComponent(ent, comp);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      blueprintRegistry?.get("fast_seeker")?.spawn(mockWorld, entity, { x, y });
    } else {
      entity = world.createEntity();
      blueprintRegistry?.get("fast_seeker")?.spawn(world, entity, { x, y });
    }
    return entity;
  }

  public static createPlayer(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry");

    let entity: number;
    if (isUpdating) {
      entity = world.reserveEntityId();
      commands.createEntity(entity);
      const mockWorld = new Proxy(world, {
        get(target, prop, receiver) {
          if (prop === "addComponent") {
            return (ent: number, comp: any) => commands.addComponent(ent, comp);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      blueprintRegistry?.get("player")?.spawn(mockWorld, entity, { x, y });
    } else {
      entity = world.createEntity();
      blueprintRegistry?.get("player")?.spawn(world, entity, { x, y });
    }
    return entity;
  }

  public static createBullet(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>, x: number, y: number, vx: number, vy: number, rotation: number): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry");

    let entity: number;
    if (isUpdating) {
      entity = world.reserveEntityId();
      commands.createEntity(entity);
      const mockWorld = new Proxy(world, {
        get(target, prop, receiver) {
          if (prop === "addComponent") {
            return (ent: number, comp: any) => commands.addComponent(ent, comp);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      blueprintRegistry?.get("bullet")?.spawn(mockWorld, entity, { x, y, vx, vy, rotation });
    } else {
      entity = world.createEntity();
      blueprintRegistry?.get("bullet")?.spawn(world, entity, { x, y, vx, vy, rotation });
    }
    return entity;
  }

  // TODO(refactor): código duplicado detectado (método) con geometrywars/entities/GeometryWarsEntities.ts:475-492. Considerar extraer a función compartida. Ref: 0165ce82
  public static createSpawnDirector(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry");

    let entity: number;
    if (isUpdating) {
      entity = world.reserveEntityId();
      commands.createEntity(entity);
      const mockWorld = new Proxy(world, {
        get(target, prop, receiver) {
          if (prop === "addComponent") {
            return (ent: number, comp: any) => commands.addComponent(ent, comp);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      blueprintRegistry?.get("spawn_director")?.spawn(mockWorld, entity, {});
    } else {
      entity = world.createEntity();
      blueprintRegistry?.get("spawn_director")?.spawn(world, entity, {});
    }
    return entity;
  }

  // TODO(refactor): código duplicado detectado (método) con geometrywars/entities/GeometryWarsEntities.ts:459-476. Considerar extraer a función compartida. Ref: c2956842
  public static createGameState(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry");

    let entity: number;
    if (isUpdating) {
      entity = world.reserveEntityId();
      commands.createEntity(entity);
      const mockWorld = new Proxy(world, {
        get(target, prop, receiver) {
          if (prop === "addComponent") {
            return (ent: number, comp: any) => commands.addComponent(ent, comp);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
      blueprintRegistry?.get("state")?.spawn(mockWorld, entity, {});
    } else {
      entity = world.createEntity();
      blueprintRegistry?.get("state")?.spawn(world, entity, {});
    }
    return entity;
  }
}
