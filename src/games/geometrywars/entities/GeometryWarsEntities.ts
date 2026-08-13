import {
  World,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  HealthComponent,
  TTLComponent,
  ColliderComponent,
  CollisionEventsComponent,
  ShapeType,
  BlueprintRegistry,
  CircleShape,
  SteeringComponent
} from "@tiny-aster/core";
import { CollisionLayers } from "../../shared/types/CollisionLayers";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry, WeaponComponent } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { FactionComponent, DamageComponent } from "../../shared/combat/components/CombatComponents";
import { SpawnDirectorComponent } from "../../shared/spawn/components/SpawnComponents";
import { ComboComponent } from "../../shared/arcade/components/ComboComponent";

/**
 * Registers Geometry Wars blueprints.
 * @public
 */
export function registerGeometryWarsBlueprints(
  world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>
): void {
  const registry = world.getResource<BlueprintRegistry<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any>>("BlueprintRegistry") || new BlueprintRegistry();

  registry.register("player", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      const config = w.getResource<GeometryWarsConfig>("GameConfig");
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_player",
        size: 16,
        color: colors.cyan,
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1,
        invulnerableRemaining: config?.INVULNERABILITY_DURATION ?? 2.0
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 8 } as CircleShape,
        layer: CollisionLayers.PLAYER,
        mask: CollisionLayers.ENEMY,
        enabled: true,
        isTrigger: false
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

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
        type: "Faction",
        faction: "player",
        value: "player"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Combo",
        combo: 0,
        multiplier: 1,
        timerRemaining: 0,
        timerDuration: 3.0
      } as ComboComponent);
    }
  });

  registry.register("bullet", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; vx: number; vy: number; rotation: number }) => {
      const config = w.getResource<GeometryWarsConfig>("GameConfig");
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: args.rotation,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: args.rotation,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: args.vx,
        vy: args.vy,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_bullet",
        size: 4,
        color: colors.gold,
        visible: true,
        opacity: 1,
        order: 2,
        rotation: args.rotation,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "TTL",
        remaining: config?.BULLET_TTL ?? 1.2,
        timeLeft: config?.BULLET_TTL ?? 1.2
      } as TTLComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 2 } as CircleShape,
        layer: CollisionLayers.PROJECTILE,
        mask: CollisionLayers.ENEMY,
        enabled: true,
        isTrigger: true
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "player_bullet",
        friendlyFire: false,
        consumption: "destroy-entity"
      } as DamageComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "player",
        value: "player"
      } as FactionComponent);
    }
  });

  registry.register("enemy_chaser", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_chaser",
        size: 14,
        color: colors.pink,
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 7 } as CircleShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
        enabled: true,
        isTrigger: false
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 140,
        maxAcceleration: 150
      } as SteeringComponent);
    }
  });

  registry.register("enemy_evader", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_evader",
        size: 14,
        color: "#ffaa00",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 7 } as CircleShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
        enabled: true,
        isTrigger: false
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 120,
        maxAcceleration: 100
      } as SteeringComponent);
    }
  });

  registry.register("enemy_grunt", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_grunt",
        size: 10,
        color: colors.cyan,
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 5 } as CircleShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
        enabled: true,
        isTrigger: false
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 250,
        maxAcceleration: 280
      } as SteeringComponent);
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
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_seeker",
        size: 12,
        color: colors.pink,
        visible: true,
        opacity: 1,
        order: 3,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 2,
        max: 2,
        invulnerableRemaining: 0
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 6 } as CircleShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
        enabled: true,
        isTrigger: false
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "enemy_contact",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 120,
        maxAcceleration: 80,
        arrivalRadius: 10
      } as any);
    }
  });

  registry.register("evader", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_evader",
        size: 12,
        color: colors.green,
        visible: true,
        opacity: 1,
        order: 3,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1,
        invulnerableRemaining: 0
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 6 } as CircleShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
        enabled: true,
        isTrigger: false
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "enemy_contact",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Steering",
        mode: "flee",
        targetFaction: "player",
        maxSpeed: 100,
        maxAcceleration: 60
      } as any);
    }
  });

  registry.register("fast_seeker", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      w.addComponent(entity, {
        type: "Transform",
        x: args.x,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: args.x,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "gw_fast_seeker",
        size: 8,
        color: colors.pink,
        visible: true,
        opacity: 1,
        order: 3,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1,
        invulnerableRemaining: 0
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 4 } as CircleShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
        enabled: true,
        isTrigger: false
      } as ColliderComponent);

      w.addComponent(entity, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as CollisionEventsComponent);

      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "enemy_contact",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "player",
        maxSpeed: 200,
        maxAcceleration: 150,
        arrivalRadius: 5
      } as any);
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
