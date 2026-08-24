import {
  World,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  HealthComponent,
  ColliderComponent,
  CollisionEventsComponent,
  ShapeType,
  BlueprintRegistry,
  CircleShape,
  BoxShape,
  ComboComponent
} from "@tiny-aster/core";
import { CollisionLayers } from "../../shared/types/CollisionLayers";
import { NebulaDashComponentRegistry, NebulaDashEventRegistry } from "../types/NebulaDashRegistry";
import { FactionComponent, DamageComponent } from "../../shared/combat/components/CombatComponents";
import { SpawnDirectorComponent } from "../../shared/spawn/components/SpawnComponents";

/**
 * Registers Nebula Dash blueprints into the world's BlueprintRegistry.
 */
export function registerNebulaDashBlueprints(
  world: World<NebulaDashComponentRegistry, NebulaDashEventRegistry, any>
): void {
  const registry =
    world.getResource<BlueprintRegistry<NebulaDashComponentRegistry, NebulaDashEventRegistry, any>>("BlueprintRegistry") ||
    new BlueprintRegistry();

  registry.register("player", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      const config = w.getResource<any>("GameConfig");
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
        type: "Climber",
        jumpImpulse: config?.JUMP_IMPULSE ?? -420,
        lateralSpeed: config?.LATERAL_SPEED ?? 320,
        maxAscentSpeed: 600
      });

      w.addComponent(entity, {
        type: "Player",
        moveLeft: false,
        moveRight: false,
        jump: false
      });

      w.addComponent(entity, {
        type: "Input",
        moveLeft: false,
        moveRight: false,
        jump: false
      });

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1,
        invulnerableRemaining: 0
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 12 } as CircleShape,
        layer: CollisionLayers.PLAYER,
        mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
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
        faction: "player",
        value: "player"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Combo",
        combo: 0,
        multiplier: 1,
        timerRemaining: 0,
        timerDuration: 2.0
      } as ComboComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "nebula_player",
        size: 16,
        color: "#00f0ff",
        visible: true,
        opacity: 1,
        order: 2,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);
    }
  });

  registry.register("obstacle_gap", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; gapWidth?: number; moveSpeedX?: number }) => {
      const gapWidth = args.gapWidth ?? 120;
      const moveSpeedX = args.moveSpeedX ?? 0;

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
        vx: moveSpeedX,
        vy: 0,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "ObstacleGap",
        gapWidth,
        passed: false,
        moveSpeedX
      });

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Box, width: gapWidth, height: 20 } as BoxShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER,
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
        category: "barrier_hazard",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "environment",
        value: "environment"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "nebula_gap",
        size: gapWidth,
        color: "#ff0055",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);
    }
  });

  registry.register("floating_asteroid", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; vx?: number; vy?: number; radius?: number }) => {
      const radius = args.radius ?? 15;
      const vx = args.vx ?? 0;
      const vy = args.vy ?? 0;

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
        vx,
        vy,
        angularVelocity: 0.5
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1
      } as HealthComponent);

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius } as CircleShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER,
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
        category: "asteroid_contact",
        friendlyFire: false,
        consumption: "destroy-entity"
      } as DamageComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "nebula_asteroid",
        size: radius * 2,
        color: "#aaaaaa",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0.5,
        hitFlashFrames: 0
      } as RenderComponent);
    }
  });

  registry.register("plasma_wall", {
    spawn: (w: World<any, any, any>, entity: number, args: { y: number; ascentSpeed?: number; acceleration?: number }) => {
      const config = w.getResource<any>("GameConfig");
      const ascentSpeed = args.ascentSpeed ?? config?.PLASMA_BASE_SPEED ?? 80;
      const acceleration = args.acceleration ?? config?.PLASMA_ACCELERATION ?? 1.5;

      w.addComponent(entity, {
        type: "Transform",
        x: 400,
        y: args.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 400,
        worldY: args.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as TransformComponent);

      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: -ascentSpeed,
        angularVelocity: 0
      } as VelocityComponent);

      w.addComponent(entity, {
        type: "PlasmaRisingWall",
        ascentSpeed,
        acceleration
      });

      w.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Box, width: 2000, height: 100 } as BoxShape,
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER,
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
        amount: 10,
        category: "plasma_hazard",
        friendlyFire: false,
        consumption: "none"
      } as DamageComponent);

      w.addComponent(entity, {
        type: "Faction",
        faction: "environment",
        value: "environment"
      } as FactionComponent);

      w.addComponent(entity, {
        type: "Render",
        shape: "nebula_plasma_wall",
        size: 100,
        color: "#ff00ff",
        visible: true,
        opacity: 0.8,
        order: 3,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as RenderComponent);
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
      w.addComponent(entity, {
        type: "NebulaDashState",
        score: 0,
        altitude: 0,
        highScore: 0,
        isGameOver: false
      });
    }
  });

  world.setResource("BlueprintRegistry", registry);
}

export class NebulaDashEntityFactory {
  public static createSpawnDirector(
    world: World<NebulaDashComponentRegistry, NebulaDashEventRegistry, any>
  ): number {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();
    const blueprintRegistry = world.getResource<BlueprintRegistry<NebulaDashComponentRegistry, NebulaDashEventRegistry, any>>("BlueprintRegistry");

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
}
